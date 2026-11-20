/**
 * GET /api/sync/pull — mudanças desde o cursor de cada escopo (ADR 0005).
 *
 * Escopos:
 *   - "me": tudo de que o usuário é dono + configurações.
 *   - "group:<id>": para cada grupo ativo — grupo, membros, perfis, repertórios compartilhados,
 *     itens e as músicas referenciadas. Um escopo novo começa do cursor 0, então quem entra
 *     num grupo recebe também o que foi criado antes.
 */
import { LIMITS, type Profile } from '@cifrasync/shared';
import { and, asc, eq, gt, inArray, or, sql } from 'drizzle-orm';

import type { Db } from '../db/client.js';
import {
  groupMembers,
  groups,
  groupSetlists,
  setlistItems,
  setlists,
  songs,
  user,
  userSettings,
} from '../db/schema.js';
import type { Row, SyncTableName } from './tables.js';

export interface PullResult {
  changes: Partial<Record<SyncTableName, Row[]>>;
  profiles: Profile[];
  cursors: Record<string, number>;
  hasMore: boolean;
  /** Escopos de grupos dos quais o usuário saiu: o cliente apaga o que veio só por eles. */
  revokedScopes: string[];
}

type Batch = { table: SyncTableName; rows: Row[] };

/** Junta lotes de várias tabelas e corta no limite, mantendo a ordem do cursor. */
function mergeBatches(batches: Batch[], limit: number, cursor: number) {
  const all = batches.flatMap((b) => b.rows.map((row) => ({ table: b.table, row })));
  all.sort((a, b) => a.row.seq - b.row.seq);
  const taken = all.slice(0, limit);
  const anyFull = batches.some((b) => b.rows.length >= limit);
  const hasMore = all.length > limit || anyFull;
  const next = taken.length ? taken[taken.length - 1]!.row.seq : cursor;
  return { taken, hasMore, next };
}

async function pullMe(db: Db, userId: string, cursor: number, limit: number) {
  const q = <T>(p: Promise<T>) => p as unknown as Promise<Row[]>;
  const [s, sl, si, us] = await Promise.all([
    q(
      db
        .select()
        .from(songs)
        .where(and(eq(songs.ownerId, userId), gt(songs.seq, cursor)))
        .orderBy(asc(songs.seq))
        .limit(limit),
    ),
    q(
      db
        .select()
        .from(setlists)
        .where(and(eq(setlists.ownerId, userId), gt(setlists.seq, cursor)))
        .orderBy(asc(setlists.seq))
        .limit(limit),
    ),
    db
      .select({ item: setlistItems })
      .from(setlistItems)
      .innerJoin(setlists, eq(setlists.id, setlistItems.setlistId))
      .where(and(eq(setlists.ownerId, userId), gt(setlistItems.seq, cursor)))
      .orderBy(asc(setlistItems.seq))
      .limit(limit)
      .then((r) => r.map((x) => x.item as unknown as Row)),
    q(
      db
        .select()
        .from(userSettings)
        .where(and(eq(userSettings.userId, userId), gt(userSettings.seq, cursor)))
        .orderBy(asc(userSettings.seq))
        .limit(limit),
    ),
  ]);
  return mergeBatches(
    [
      { table: 'songs', rows: s },
      { table: 'setlists', rows: sl },
      { table: 'setlistItems', rows: si },
      { table: 'userSettings', rows: us },
    ],
    limit,
    cursor,
  );
}

async function pullGroup(db: Db, groupId: string, cursor: number, limit: number) {
  const shared = await db
    .select({ setlistId: groupSetlists.setlistId })
    .from(groupSetlists)
    .where(and(eq(groupSetlists.groupId, groupId), eq(groupSetlists.deleted, false)));
  const setlistIds = shared.map((s) => s.setlistId);

  const q = <T>(p: Promise<T>) => p as unknown as Promise<Row[]>;
  const [g, gm, gs] = await Promise.all([
    q(
      db
        .select()
        .from(groups)
        .where(and(eq(groups.id, groupId), gt(groups.seq, cursor))),
    ),
    q(
      db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), gt(groupMembers.seq, cursor)))
        .orderBy(asc(groupMembers.seq))
        .limit(limit),
    ),
    q(
      db
        .select()
        .from(groupSetlists)
        .where(and(eq(groupSetlists.groupId, groupId), gt(groupSetlists.seq, cursor)))
        .orderBy(asc(groupSetlists.seq))
        .limit(limit),
    ),
  ]);

  let sl: Row[] = [];
  let si: Row[] = [];
  let sg: Row[] = [];
  if (setlistIds.length) {
    // um repertório recém-compartilhado chega inteiro, mesmo que seja antigo
    const newlyShared = gs.filter((r) => !r.deleted).map((r) => String(r.setlistId));
    sl = (await db
      .select()
      .from(setlists)
      .where(
        and(
          inArray(setlists.id, setlistIds),
          or(
            gt(setlists.seq, cursor),
            newlyShared.length ? inArray(setlists.id, newlyShared) : sql`false`,
          ),
        ),
      )) as unknown as Row[];
    si = (await db
      .select()
      .from(setlistItems)
      .where(
        and(
          inArray(setlistItems.setlistId, setlistIds),
          or(
            gt(setlistItems.seq, cursor),
            newlyShared.length ? inArray(setlistItems.setlistId, newlyShared) : sql`false`,
          ),
        ),
      )
      .orderBy(asc(setlistItems.seq))
      .limit(limit * 4)) as unknown as Row[];

    // músicas: mudaram desde o cursor OU o item que as referencia mudou
    const touchedSongIds = si.filter((i) => i.songId && !i.deleted).map((i) => String(i.songId));
    const allItemSongs = await db
      .selectDistinct({ songId: setlistItems.songId })
      .from(setlistItems)
      .where(and(inArray(setlistItems.setlistId, setlistIds), eq(setlistItems.deleted, false)));
    const allSongIds = allItemSongs.map((r) => r.songId).filter((x): x is string => !!x);
    if (allSongIds.length) {
      sg = (await db
        .select()
        .from(songs)
        .where(
          and(
            inArray(songs.id, allSongIds),
            or(
              gt(songs.seq, cursor),
              touchedSongIds.length ? inArray(songs.id, touchedSongIds) : sql`false`,
            ),
          ),
        )) as unknown as Row[];
    }
  }

  const merged = mergeBatches(
    [
      { table: 'groups', rows: g },
      { table: 'groupMembers', rows: gm },
      { table: 'groupSetlists', rows: gs },
    ],
    limit,
    cursor,
  );
  // conteúdo compartilhado vai junto (não conta para o cursor do grupo)
  return {
    ...merged,
    extra: [
      ...sl.map((row) => ({ table: 'setlists' as const, row })),
      ...si.map((row) => ({ table: 'setlistItems' as const, row })),
      ...sg.map((row) => ({ table: 'songs' as const, row })),
    ],
  };
}

export async function pull(
  db: Db,
  userId: string,
  cursors: Record<string, number>,
): Promise<PullResult> {
  const limit = LIMITS.pullPageSize;
  const changes: PullResult['changes'] = {};
  const add = (table: SyncTableName, row: Row) => {
    const list = (changes[table] ??= []);
    if (!list.some((r) => r.id === row.id)) list.push(row);
  };

  const outCursors: Record<string, number> = {};
  let hasMore = false;

  const me = await pullMe(db, userId, cursors.me ?? 0, limit);
  me.taken.forEach(({ table, row }) => add(table, row));
  outCursors.me = me.next;
  hasMore ||= me.hasMore;

  const memberships = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.deleted, false)));
  const active = memberships.filter((m) => m.status === 'active').map((m) => m.groupId);
  const pending = memberships.filter((m) => m.status === 'pending');

  for (const groupId of active) {
    const scope = `group:${groupId}`;
    const r = await pullGroup(db, groupId, cursors[scope] ?? 0, limit);
    r.taken.forEach(({ table, row }) => add(table, row));
    r.extra.forEach(({ table, row }) => add(table, row));
    outCursors[scope] = r.next;
    hasMore ||= r.hasMore;
  }

  // convites pendentes: o convidado vê o grupo e o próprio convite para aceitar ou recusar
  if (pending.length) {
    const pgIds = pending.map((p) => p.groupId);
    const pendingGroups = (await db
      .select()
      .from(groups)
      .where(inArray(groups.id, pgIds))) as unknown as Row[];
    pendingGroups.forEach((g) => add('groups', g));
    pending.forEach((m) => add('groupMembers', m as unknown as Row));
  }

  const revokedScopes = Object.keys(cursors).filter(
    (k) => k.startsWith('group:') && !active.includes(k.slice('group:'.length)),
  );

  // perfis de quem aparece nos grupos (nome de usuário e nome)
  const memberIds = new Set<string>();
  for (const m of changes.groupMembers ?? []) memberIds.add(String(m.userId));
  for (const g of changes.groups ?? []) memberIds.add(String(g.ownerId));
  const profiles: Profile[] = memberIds.size
    ? (
        await db
          .select({ id: user.id, username: user.username, name: user.name })
          .from(user)
          .where(inArray(user.id, [...memberIds]))
      ).map((p) => ({ id: p.id, username: p.username ?? '', name: p.name }))
    : [];

  return { changes, profiles, cursors: outCursors, hasMore, revokedScopes };
}
