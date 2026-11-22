/**
 * Leitura e escrita no banco local. Toda escrita grava o registro e enfileira a mutação
 * na MESMA transação — nunca fica dado salvo sem ir para a fila (PLAN, concorrência).
 */
import type {
  Group,
  GroupMember,
  GroupRole,
  GroupSetlist,
  Profile,
  Setlist,
  SetlistItem,
  Song,
  SyncColumns,
  UserSettings,
} from '@cifrasync/shared';
import Dexie from 'dexie';
import { generateKeyBetween } from 'fractional-indexing';

import type { CifraDB, LocalSong, Mutation, SyncedTable } from './db';
import { uuidv7 } from './ids';
import { matchesQuery, songWords, tokens } from './search';

// ---------------------------------------------------------------------------
// Identidade do dispositivo e do usuário local
// ---------------------------------------------------------------------------

async function metaGet<T>(db: CifraDB, key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function getDeviceId(db: CifraDB): Promise<string> {
  const existing = await metaGet<string>(db, 'deviceId');
  if (existing) return existing;
  const id = uuidv7();
  await db.meta.put({ key: 'deviceId', value: id });
  return id;
}

/**
 * Id do dono dos dados. Sem login, é um id local; ao entrar numa conta, o motor de sync
 * troca pelo id do usuário (T49).
 */
export async function getCurrentUserId(db: CifraDB): Promise<string> {
  const user = await metaGet<string>(db, 'userId');
  if (user) return user;
  const local = await metaGet<string>(db, 'localUserId');
  if (local) return local;
  const id = uuidv7();
  await db.meta.put({ key: 'localUserId', value: id });
  return id;
}

/**
 * Id do dono dos dados sem criar nada (seguro dentro de liveQuery). Uma leitura só, para o
 * Dexie continuar observando as consultas feitas depois dela.
 */
export async function peekCurrentUserId(db: CifraDB): Promise<string | undefined> {
  const [user, local] = await db.meta.bulkGet(['userId', 'localUserId']);
  return (user?.value ?? local?.value) as string | undefined;
}

/**
 * Garante que o id do aparelho e o do usuário local existem. Chamado na inicialização do app,
 * fora de consultas reativas (que são somente leitura).
 */
export async function ensureIdentity(db: CifraDB): Promise<{ deviceId: string; userId: string }> {
  return { deviceId: await getDeviceId(db), userId: await getCurrentUserId(db) };
}

// ---------------------------------------------------------------------------
// Escrita com fila de mutações
// ---------------------------------------------------------------------------

type Row = SyncColumns & Record<string, unknown>;

/** Remove campos que só existem localmente antes de enviar ao servidor. */
function toWire(row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!k.startsWith('_') && k !== 'seq') out[k] = v;
  return out;
}

/**
 * Enfileira a mutação. Se já existe uma pendente (não em envio) para o mesmo registro,
 * substitui os dados por estes — o servidor recebe só o estado final.
 */
async function enqueue(db: CifraDB, table: SyncedTable, op: Mutation['op'], row: Row) {
  const pending = await db.outbox
    .where('[table+rowId]')
    .equals([table, row.id])
    .filter((m) => !m.inFlight)
    .first();
  const data = toWire(row);
  if (pending) {
    await db.outbox.update(pending.localSeq!, { op, data, createdAt: new Date().toISOString() });
    return;
  }
  await db.outbox.add({
    mid: uuidv7(),
    table,
    op,
    rowId: row.id,
    baseVersion: row.version,
    data,
    createdAt: new Date().toISOString(),
    inFlight: false,
  });
}

async function stamp<T extends SyncColumns>(db: CifraDB, row: T): Promise<T> {
  return { ...row, updatedAt: new Date().toISOString(), updatedByDevice: await getDeviceId(db) };
}

function newSyncColumns(id = uuidv7()): Omit<SyncColumns, 'updatedByDevice'> {
  return { id, version: 0, seq: null, deleted: false, updatedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Músicas
// ---------------------------------------------------------------------------

export type SongInput = Partial<Omit<Song, keyof SyncColumns | 'ownerId'>> & { id?: string };

export async function saveSong(db: CifraDB, input: SongInput): Promise<Song> {
  return db.transaction('rw', db.songs, db.outbox, db.meta, async () => {
    const existing = input.id ? await db.songs.get(input.id) : undefined;
    const base: Song = existing ?? {
      ...newSyncColumns(input.id),
      updatedByDevice: '',
      ownerId: await getCurrentUserId(db),
      title: 'Sem título',
      artist: '',
      key: null,
      capo: 0,
      transpose: 0,
      style: '',
      bpm: null,
      durationSec: null,
      scrollSpeed: null,
      content: '',
      chordPrefs: {},
      notes: '',
    };
    const { id: _id, ...fields } = input;
    const merged = await stamp(db, { ...stripLocal(base), ...fields } as Song);
    const local: LocalSong = { ...merged, _words: songWords(merged) };
    await db.songs.put(local);
    await enqueue(db, 'songs', 'upsert', merged as unknown as Row);
    return merged;
  });
}

function stripLocal(s: LocalSong | Song): Song {
  const { _words: _w, ...rest } = s as LocalSong;
  return rest;
}

export async function deleteSong(db: CifraDB, id: string): Promise<void> {
  await db.transaction('rw', db.songs, db.outbox, db.meta, async () => {
    const s = await db.songs.get(id);
    if (!s || s.deleted) return;
    const row = await stamp(db, { ...stripLocal(s), deleted: true });
    await db.songs.put({ ...row, _words: [] });
    await enqueue(db, 'songs', 'delete', row as unknown as Row);
  });
}

export async function getSong(db: CifraDB, id: string): Promise<Song | undefined> {
  const s = await db.songs.get(id);
  return s && !s.deleted ? stripLocal(s) : undefined;
}

export interface SongFilter {
  query?: string;
  artist?: string;
  key?: string;
  style?: string;
}

/** Biblioteca: músicas não excluídas, filtradas e ordenadas por título. */
export async function listSongs(db: CifraDB, filter: SongFilter = {}): Promise<Song[]> {
  const terms = filter.query ? tokens(filter.query) : [];
  const first = terms.length ? terms.reduce((a, b) => (b.length > a.length ? b : a)) : '';
  const collection = first
    ? db.songs.where('_words').startsWith(first).distinct()
    : db.songs.toCollection();
  const rows = await collection
    .filter(
      (s) =>
        !s.deleted &&
        (!terms.length || matchesQuery(s._words, filter.query!)) &&
        (!filter.artist || s.artist === filter.artist) &&
        (!filter.key || s.key === filter.key) &&
        (!filter.style || s.style === filter.style),
    )
    .toArray();
  return rows
    .map(stripLocal)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }));
}

// ---------------------------------------------------------------------------
// Repertórios
// ---------------------------------------------------------------------------

export type SetlistInput = Partial<Omit<Setlist, keyof SyncColumns | 'ownerId'>> & { id?: string };

export async function saveSetlist(db: CifraDB, input: SetlistInput): Promise<Setlist> {
  return db.transaction('rw', db.setlists, db.outbox, db.meta, async () => {
    const existing = input.id ? await db.setlists.get(input.id) : undefined;
    const base: Setlist = existing ?? {
      ...newSyncColumns(input.id),
      updatedByDevice: '',
      ownerId: await getCurrentUserId(db),
      name: 'Novo repertório',
      eventDate: null,
      notes: '',
    };
    const { id: _id, ...fields } = input;
    const row = await stamp(db, { ...base, ...fields });
    await db.setlists.put(row);
    await enqueue(db, 'setlists', 'upsert', row as unknown as Row);
    return row;
  });
}

/** Exclui o repertório e seus itens. As músicas continuam na biblioteca. */
export async function deleteSetlist(db: CifraDB, id: string): Promise<void> {
  await db.transaction('rw', db.setlists, db.setlistItems, db.outbox, db.meta, async () => {
    const s = await db.setlists.get(id);
    if (!s || s.deleted) return;
    const row = await stamp(db, { ...s, deleted: true });
    await db.setlists.put(row);
    await enqueue(db, 'setlists', 'delete', row as unknown as Row);
    const items = await db.setlistItems.where('setlistId').equals(id).toArray();
    for (const it of items.filter((i) => !i.deleted)) {
      const r = await stamp(db, { ...it, deleted: true });
      await db.setlistItems.put(r);
      await enqueue(db, 'setlistItems', 'delete', r as unknown as Row);
    }
  });
}

export async function listSetlists(db: CifraDB): Promise<Setlist[]> {
  const rows = await db.setlists.filter((s) => !s.deleted).toArray();
  return rows.sort((a, b) => {
    // com data primeiro (mais recente no topo), depois por nome
    if (a.eventDate && b.eventDate && a.eventDate !== b.eventDate)
      return b.eventDate.localeCompare(a.eventDate);
    if (a.eventDate !== b.eventDate) return a.eventDate ? -1 : 1;
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });
}

/** Itens do repertório em ordem. */
export async function listSetlistItems(db: CifraDB, setlistId: string): Promise<SetlistItem[]> {
  const rows = await db.setlistItems
    .where('[setlistId+position]')
    .between([setlistId, Dexie.minKey], [setlistId, Dexie.maxKey])
    .toArray();
  return rows.filter((i) => !i.deleted);
}

export type NewItem =
  | { kind: 'song'; songId: string; transpose?: number | null; note?: string }
  | { kind: 'moment'; label: string };

/**
 * Insere um item. Sem `after`, vai para o fim; com `after = null`, para o início;
 * com o id de um item, logo depois dele.
 */
export async function addSetlistItem(
  db: CifraDB,
  setlistId: string,
  item: NewItem,
  after?: string | null,
): Promise<SetlistItem> {
  return db.transaction('rw', db.setlistItems, db.outbox, db.meta, async () => {
    const items = await listSetlistItems(db, setlistId);
    let prev: string | null;
    let next: string | null;
    if (after === undefined) {
      prev = items.at(-1)?.position ?? null;
      next = null;
    } else if (after === null) {
      prev = null;
      next = items[0]?.position ?? null;
    } else {
      const idx = items.findIndex((i) => i.id === after);
      prev = items[idx]?.position ?? null;
      next = items[idx + 1]?.position ?? null;
    }
    const row = await stamp(db, {
      ...newSyncColumns(),
      updatedByDevice: '',
      setlistId,
      kind: item.kind,
      songId: item.kind === 'song' ? item.songId : null,
      label: item.kind === 'moment' ? item.label : null,
      position: generateKeyBetween(prev, next),
      transpose: item.kind === 'song' ? (item.transpose ?? null) : null,
      note: item.kind === 'song' ? (item.note ?? '') : '',
    } satisfies SetlistItem);
    await db.setlistItems.put(row);
    await enqueue(db, 'setlistItems', 'upsert', row as unknown as Row);
    return row;
  });
}

export async function updateSetlistItem(
  db: CifraDB,
  id: string,
  patch: Partial<Pick<SetlistItem, 'transpose' | 'note' | 'label'>>,
): Promise<void> {
  await db.transaction('rw', db.setlistItems, db.outbox, db.meta, async () => {
    const it = await db.setlistItems.get(id);
    if (!it || it.deleted) return;
    const row = await stamp(db, { ...it, ...patch });
    await db.setlistItems.put(row);
    await enqueue(db, 'setlistItems', 'upsert', row as unknown as Row);
  });
}

/**
 * Move um item para a posição `toIndex` da lista atual. Gera UMA escrita (só o item movido),
 * então dois membros reordenando ao mesmo tempo não se atropelam.
 */
export async function moveSetlistItem(db: CifraDB, id: string, toIndex: number): Promise<void> {
  await db.transaction('rw', db.setlistItems, db.outbox, db.meta, async () => {
    const it = await db.setlistItems.get(id);
    if (!it || it.deleted) return;
    const others = (await listSetlistItems(db, it.setlistId)).filter((i) => i.id !== id);
    const clamped = Math.max(0, Math.min(toIndex, others.length));
    const prev = others[clamped - 1]?.position ?? null;
    const next = others[clamped]?.position ?? null;
    const row = await stamp(db, { ...it, position: generateKeyBetween(prev, next) });
    await db.setlistItems.put(row);
    await enqueue(db, 'setlistItems', 'upsert', row as unknown as Row);
  });
}

export async function removeSetlistItem(db: CifraDB, id: string): Promise<void> {
  await db.transaction('rw', db.setlistItems, db.outbox, db.meta, async () => {
    const it = await db.setlistItems.get(id);
    if (!it || it.deleted) return;
    const row = await stamp(db, { ...it, deleted: true });
    await db.setlistItems.put(row);
    await enqueue(db, 'setlistItems', 'delete', row as unknown as Row);
  });
}

/** Duplica um repertório com todos os itens (nova lista independente). */
export async function duplicateSetlist(db: CifraDB, id: string): Promise<Setlist | undefined> {
  const src = await db.setlists.get(id);
  if (!src || src.deleted) return undefined;
  const copy = await saveSetlist(db, {
    name: `${src.name} (cópia)`,
    eventDate: src.eventDate,
    notes: src.notes,
  });
  for (const it of await listSetlistItems(db, id)) {
    await addSetlistItem(
      db,
      copy.id,
      it.kind === 'song'
        ? { kind: 'song', songId: it.songId!, transpose: it.transpose, note: it.note }
        : { kind: 'moment', label: it.label ?? '' },
    );
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

/** Lê a configuração global e o override deste dispositivo (os dados ainda sem padrões). */
export async function getSettingsRows(
  db: CifraDB,
): Promise<{ global?: UserSettings; device?: UserSettings }> {
  // Só leitura: roda dentro de consultas reativas (liveQuery), que não podem gravar.
  // Todas as leituras começam juntas: depois de vários `await` encadeados o Dexie deixa de
  // observar as leituras seguintes, e a tela não via a configuração recém-salva.
  const [userRow, localRow, deviceRow, rows] = await Promise.all([
    db.meta.get('userId'),
    db.meta.get('localUserId'),
    db.meta.get('deviceId'),
    db.userSettings.toArray(),
  ]);
  const userId = (userRow?.value ?? localRow?.value) as string | undefined;
  const deviceId = deviceRow?.value as string | undefined;
  if (!userId) return {};
  const mine = rows.filter((r) => r.userId === userId && !r.deleted);
  return {
    global: mine.find((r) => r.deviceId === null),
    device: mine.find((r) => r.deviceId === deviceId),
  };
}

/**
 * Grava configurações globais (`scope: 'global'`) ou só deste dispositivo.
 * `data` pode ser uma função que recebe o que está salvo: leitura e gravação acontecem na
 * mesma transação, então duas alterações seguidas não se sobrescrevem.
 */
export async function saveSettings(
  db: CifraDB,
  data: Record<string, unknown> | ((current: Record<string, unknown>) => Record<string, unknown>),
  scope: 'global' | 'device',
): Promise<UserSettings> {
  return db.transaction('rw', db.userSettings, db.outbox, db.meta, async () => {
    const userId = await getCurrentUserId(db);
    const deviceId = scope === 'device' ? await getDeviceId(db) : null;
    const { global, device } = await getSettingsRows(db);
    const existing = scope === 'device' ? device : global;
    const row = await stamp(db, {
      ...(existing ?? { ...newSyncColumns(), updatedByDevice: '', userId, deviceId }),
      data: typeof data === 'function' ? data(existing?.data ?? {}) : data,
    } satisfies UserSettings);
    await db.userSettings.put(row);
    await enqueue(db, 'userSettings', 'upsert', row as unknown as Row);
    return row;
  });
}

/** Quantas mutações aguardam envio (indicador de sync). */
export async function pendingCount(db: CifraDB): Promise<number> {
  return db.outbox.count();
}

// ---------------------------------------------------------------------------
// Grupos (bandas)
// ---------------------------------------------------------------------------

/** Cria o grupo e a participação do dono (papel owner). */
export async function createGroup(db: CifraDB, name: string): Promise<Group> {
  return db.transaction('rw', db.groups, db.groupMembers, db.outbox, db.meta, async () => {
    const userId = await getCurrentUserId(db);
    const group = await stamp(db, {
      ...newSyncColumns(),
      updatedByDevice: '',
      ownerId: userId,
      name: name.trim() || 'Minha banda',
    } satisfies Group);
    await db.groups.put(group);
    await enqueue(db, 'groups', 'upsert', group as unknown as Row);
    const member = await stamp(db, {
      ...newSyncColumns(),
      updatedByDevice: '',
      groupId: group.id,
      userId,
      role: 'owner',
      status: 'active',
    } satisfies GroupMember);
    await db.groupMembers.put(member);
    await enqueue(db, 'groupMembers', 'upsert', member as unknown as Row);
    return group;
  });
}

export async function renameGroup(db: CifraDB, groupId: string, name: string): Promise<void> {
  await db.transaction('rw', db.groups, db.outbox, db.meta, async () => {
    const g = await db.groups.get(groupId);
    if (!g || g.deleted) return;
    const row = await stamp(db, { ...g, name: name.trim() || g.name });
    await db.groups.put(row);
    await enqueue(db, 'groups', 'upsert', row as unknown as Row);
  });
}

/** Convida um usuário (fica pendente até ele aceitar). */
export async function inviteMember(
  db: CifraDB,
  groupId: string,
  profile: Profile,
  role: GroupRole = 'member',
): Promise<GroupMember> {
  return db.transaction('rw', db.groupMembers, db.profiles, db.outbox, db.meta, async () => {
    await db.profiles.put(profile);
    const existing = await db.groupMembers
      .where('[groupId+userId]')
      .equals([groupId, profile.id])
      .first();
    const row = await stamp(db, {
      ...(existing ?? { ...newSyncColumns(), updatedByDevice: '' }),
      groupId,
      userId: profile.id,
      role,
      status: existing && !existing.deleted ? existing.status : 'pending',
      deleted: false,
    } satisfies GroupMember);
    await db.groupMembers.put(row);
    await enqueue(db, 'groupMembers', 'upsert', row as unknown as Row);
    return row;
  });
}

async function updateMember(
  db: CifraDB,
  memberId: string,
  patch: Partial<GroupMember>,
  op: Mutation['op'] = 'upsert',
) {
  await db.transaction('rw', db.groupMembers, db.outbox, db.meta, async () => {
    const m = await db.groupMembers.get(memberId);
    if (!m) return;
    const row = await stamp(db, { ...m, ...patch });
    await db.groupMembers.put(row);
    await enqueue(db, 'groupMembers', op, row as unknown as Row);
  });
}

export const setMemberRole = (db: CifraDB, memberId: string, role: GroupRole) =>
  updateMember(db, memberId, { role });
export const removeMember = (db: CifraDB, memberId: string) =>
  updateMember(db, memberId, { deleted: true }, 'delete');
export const acceptInvite = (db: CifraDB, memberId: string) =>
  updateMember(db, memberId, { status: 'active' });
/** Recusar um convite ou sair do grupo. */
export const leaveGroup = (db: CifraDB, memberId: string) =>
  updateMember(db, memberId, { deleted: true }, 'delete');

/** Compartilha um repertório meu com o grupo. */
export async function shareSetlist(db: CifraDB, groupId: string, setlistId: string): Promise<void> {
  await db.transaction('rw', db.groupSetlists, db.outbox, db.meta, async () => {
    const userId = await getCurrentUserId(db);
    const existing = await db.groupSetlists
      .where('groupId')
      .equals(groupId)
      .filter((g) => g.setlistId === setlistId)
      .first();
    const row = await stamp(db, {
      ...(existing ?? { ...newSyncColumns(), updatedByDevice: '' }),
      groupId,
      setlistId,
      addedBy: userId,
      deleted: false,
    } satisfies GroupSetlist);
    await db.groupSetlists.put(row);
    await enqueue(db, 'groupSetlists', 'upsert', row as unknown as Row);
  });
}

export async function unshareSetlist(db: CifraDB, groupSetlistId: string): Promise<void> {
  await db.transaction('rw', db.groupSetlists, db.outbox, db.meta, async () => {
    const gs = await db.groupSetlists.get(groupSetlistId);
    if (!gs || gs.deleted) return;
    const row = await stamp(db, { ...gs, deleted: true });
    await db.groupSetlists.put(row);
    await enqueue(db, 'groupSetlists', 'delete', row as unknown as Row);
  });
}

/** Copia uma música recebida de um grupo para a minha biblioteca (cópia editável). */
export async function copySongToLibrary(db: CifraDB, songId: string): Promise<Song | undefined> {
  const s = await getSong(db, songId);
  if (!s) return undefined;
  const {
    id: _id,
    ownerId: _o,
    version: _v,
    seq: _s,
    deleted: _d,
    updatedAt: _u,
    updatedByDevice: _b,
    ...fields
  } = s;
  return saveSong(db, fields);
}
