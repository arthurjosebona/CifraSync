/**
 * Motor de sincronização do cliente (ADR 0005): envia a fila de mutações e traz as mudanças.
 *
 * Ciclo: push → pull, um por vez por aparelho (lock entre abas). A UI nunca espera a rede:
 * tudo já está gravado no banco local; o motor só concilia com o servidor.
 */
import { LIMITS } from '@cifrasync/shared';

import type { CifraDB, Mutation, SyncedTable } from './db';
import { getDeviceId } from './repo';
import { songWords } from './search';

type Row = Record<string, unknown> & { id: string; version: number; seq: number | null };

export type PushResult =
  | { mid: string; status: 'ok'; row: Row }
  | { mid: string; status: 'conflict'; row: Row; copyId?: string }
  | { mid: string; status: 'rejected'; reason: string; row: Row | null };

export interface PullResponse {
  changes: Partial<Record<SyncedTable, Row[]>>;
  profiles: { id: string; username: string; name: string }[];
  cursors: Record<string, number>;
  hasMore: boolean;
  revokedScopes: string[];
}

/** Como falar com a API (injetado pelo app: fetch com cookie ou token). */
export interface Transport {
  push(body: {
    deviceId: string;
    mutations: Omit<Mutation, 'localSeq' | 'createdAt' | 'inFlight'>[];
  }): Promise<{ results: PushResult[] }>;
  pull(cursors: Record<string, number>): Promise<PullResponse>;
}

export class AuthError extends Error {}

export type SyncState =
  | { status: 'idle'; lastSync: string | null; pending: number }
  | { status: 'syncing'; lastSync: string | null; pending: number }
  | { status: 'offline'; lastSync: string | null; pending: number }
  | { status: 'error'; lastSync: string | null; pending: number; message: string }
  | { status: 'signed-out'; lastSync: string | null; pending: number };

const TABLES: SyncedTable[] = [
  'songs',
  'setlists',
  'setlistItems',
  'groups',
  'groupMembers',
  'groupSetlists',
  'userSettings',
];

function toLocal(table: SyncedTable, row: Row): Row {
  if (table === 'songs') {
    return {
      ...row,
      _words: row.deleted ? [] : songWords(row as never),
    };
  }
  return row;
}

async function metaGet<T>(db: CifraDB, key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

/**
 * Ao entrar numa conta, os dados criados offline (com o id local) passam a ser do usuário.
 */
export async function adoptLocalData(db: CifraDB, userId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.songs, db.setlists, db.userSettings, db.outbox, db.meta],
    async () => {
      const localId = await metaGet<string>(db, 'localUserId');
      await db.meta.put({ key: 'userId', value: userId });
      if (!localId || localId === userId) return;
      await db.songs.where('ownerId').equals(localId).modify({ ownerId: userId });
      await db.setlists.where('ownerId').equals(localId).modify({ ownerId: userId });
      await db.userSettings.where('userId').equals(localId).modify({ userId });
      await db.outbox.toCollection().modify((m) => {
        if (m.data.ownerId === localId) m.data.ownerId = userId;
        if (m.data.userId === localId) m.data.userId = userId;
      });
    },
  );
}

/** Ao sair da conta, os dados deste aparelho são apagados (continuam no servidor). */
export async function clearAccountData(db: CifraDB): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    const deviceId = await metaGet<string>(db, 'deviceId');
    for (const t of db.tables) await t.clear();
    if (deviceId) await db.meta.put({ key: 'deviceId', value: deviceId });
  });
}

export class SyncEngine {
  private state: SyncState = { status: 'idle', lastSync: null, pending: 0 };
  private listeners = new Set<(s: SyncState) => void>();
  private running: Promise<void> | null = null;
  private again = false;

  constructor(
    private db: CifraDB,
    private transport: Transport,
  ) {}

  getState(): SyncState {
    return this.state;
  }

  subscribe(fn: (s: SyncState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private set(s: SyncState) {
    this.state = s;
    for (const fn of this.listeners) fn(s);
  }

  /** Dispara um ciclo. Se já há um rodando, agenda mais um ao final (nunca dois ao mesmo tempo). */
  sync(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    const run = async () => {
      do {
        this.again = false;
        await this.withLock(() => this.cycle());
      } while (this.again);
    };
    this.running = run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async withLock(fn: () => Promise<void>) {
    const locks = (globalThis.navigator as Navigator | undefined)?.locks;
    if (locks?.request) await locks.request('cifrasync-sync', fn);
    else await fn();
  }

  private async cycle() {
    const pending = await this.db.outbox.count();
    const lastSync = this.state.lastSync;
    if (!(await metaGet<string>(this.db, 'userId'))) {
      this.set({ status: 'signed-out', lastSync, pending });
      return;
    }
    if (globalThis.navigator && globalThis.navigator.onLine === false) {
      this.set({ status: 'offline', lastSync, pending });
      return;
    }
    this.set({ status: 'syncing', lastSync, pending });
    try {
      await this.pushAll();
      await this.pullAll();
      this.set({
        status: 'idle',
        lastSync: new Date().toISOString(),
        pending: await this.db.outbox.count(),
      });
    } catch (e) {
      const count = await this.db.outbox.count();
      if (e instanceof AuthError) {
        this.set({ status: 'signed-out', lastSync, pending: count });
      } else if (e instanceof TypeError) {
        // falha de rede (fetch): fica offline até a próxima tentativa
        this.set({ status: 'offline', lastSync, pending: count });
      } else {
        this.set({
          status: 'error',
          lastSync,
          pending: count,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  private async pushAll() {
    const deviceId = await getDeviceId(this.db);
    for (;;) {
      const batch = await this.db.outbox.orderBy('localSeq').limit(LIMITS.pushBatchSize).toArray();
      if (!batch.length) return;
      await this.db.outbox.bulkUpdate(
        batch.map((m) => ({ key: m.localSeq!, changes: { inFlight: true } })),
      );
      let results: PushResult[];
      try {
        ({ results } = await this.transport.push({
          deviceId,
          mutations: batch.map(({ mid, table, op, rowId, baseVersion, data }) => ({
            mid,
            table,
            op,
            rowId,
            baseVersion,
            data,
          })),
        }));
      } catch (e) {
        await this.db.outbox.bulkUpdate(
          batch.map((m) => ({ key: m.localSeq!, changes: { inFlight: false } })),
        );
        throw e;
      }
      await this.applyPushResults(batch, results);
    }
  }

  private async applyPushResults(batch: Mutation[], results: PushResult[]) {
    const byMid = new Map(results.map((r) => [r.mid, r]));
    const tables = [this.db.outbox, ...TABLES.map((t) => this.db.table(t))];
    await this.db.transaction('rw', tables, async () => {
      for (const m of batch) {
        const r = byMid.get(m.mid);
        if (!r) continue;
        await this.db.outbox.delete(m.localSeq!);
        const table = this.db.table(m.table);
        // edição feita enquanto este envio estava em andamento: mantém o texto local,
        // mas passa a partir da versão do servidor
        const newer = await this.db.outbox
          .where('[table+rowId]')
          .equals([m.table, m.rowId])
          .filter((x) => !x.inFlight)
          .first();
        if (r.status === 'rejected') {
          if (newer) await this.db.outbox.delete(newer.localSeq!);
          if (r.row) await table.put(toLocal(m.table, r.row));
          else await table.delete(m.rowId);
          continue;
        }
        if (newer) {
          await this.db.outbox.update(newer.localSeq!, { baseVersion: r.row.version });
          const local = (await table.get(m.rowId)) as Row | undefined;
          if (local) await table.put({ ...local, version: r.row.version, seq: r.row.seq });
        } else {
          await table.put(toLocal(m.table, r.row));
        }
      }
    });
  }

  private async pullAll() {
    for (;;) {
      const cursors = (await metaGet<Record<string, number>>(this.db, 'cursors')) ?? {};
      const res = await this.transport.pull(cursors);
      await this.applyPull(res, cursors);
      if (!res.hasMore) return;
    }
  }

  private async applyPull(res: PullResponse, previous: Record<string, number>) {
    const tables = [
      this.db.outbox,
      this.db.meta,
      this.db.profiles,
      ...TABLES.map((t) => this.db.table(t)),
    ];
    await this.db.transaction('rw', tables, async () => {
      for (const t of TABLES) {
        const rows = res.changes[t];
        if (!rows?.length) continue;
        const table = this.db.table(t);
        for (const row of rows) {
          const pendingLocal = await this.db.outbox
            .where('[table+rowId]')
            .equals([t, row.id])
            .first();
          if (pendingLocal) {
            // edição local ainda não enviada: o texto local vence no próximo envio,
            // a partir da versão que acabou de chegar
            await this.db.outbox.update(pendingLocal.localSeq!, { baseVersion: row.version });
            continue;
          }
          await table.put(toLocal(t, row));
        }
      }
      if (res.profiles.length) await this.db.profiles.bulkPut(res.profiles);

      // saiu de um grupo: apaga o que só existia por causa dele
      for (const scope of res.revokedScopes) {
        await this.revokeGroup(scope.slice('group:'.length));
      }
      const next: Record<string, number> = { ...previous, ...res.cursors };
      for (const s of res.revokedScopes) delete next[s];
      await this.db.meta.put({ key: 'cursors', value: next });
    });
  }

  private async revokeGroup(groupId: string) {
    const userId = await metaGet<string>(this.db, 'userId');
    const shared = await this.db.groupSetlists.where('groupId').equals(groupId).toArray();
    await this.db.groupSetlists.where('groupId').equals(groupId).delete();
    await this.db.groupMembers.where('groupId').equals(groupId).delete();
    await this.db.groups.delete(groupId);
    for (const gs of shared) {
      const sl = await this.db.setlists.get(gs.setlistId);
      if (!sl || sl.ownerId === userId) continue;
      // ainda compartilhado por outro grupo do qual continuo participando?
      const stillShared = await this.db.groupSetlists
        .where('setlistId')
        .equals(gs.setlistId)
        .count();
      if (stillShared) continue;
      const items = await this.db.setlistItems.where('setlistId').equals(gs.setlistId).toArray();
      await this.db.setlistItems.bulkDelete(items.map((i) => i.id));
      await this.db.setlists.delete(gs.setlistId);
      for (const it of items) {
        if (!it.songId) continue;
        const song = await this.db.songs.get(it.songId);
        if (!song || song.ownerId === userId) continue;
        const usedElsewhere = await this.db.setlistItems.where('songId').equals(it.songId).count();
        if (!usedElsewhere) await this.db.songs.delete(it.songId);
      }
    }
  }
}
