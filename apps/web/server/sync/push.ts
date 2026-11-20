/**
 * POST /api/sync/push — aplica um lote de mutações numa transação única (ADR 0005).
 *
 * - Idempotente: o id da mutação (mid) fica registrado e o reenvio devolve o mesmo resultado.
 * - Controle por `version`: base igual à atual → aplica; diferente → conflito.
 * - Conflito em letra de música: ninguém perde texto — fica a versão do servidor e a do
 *   aparelho vira uma "cópia de conflito". Nos demais casos vale a última escrita.
 */
import { LIMITS } from '@cifrasync/shared';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { Db } from '../db/client.js';
import { appliedMutations, groupMembers, groups } from '../db/schema.js';
import { canWrite } from './permissions.js';
import { SYNC_TABLES, SYNC_TABLE_NAMES, type Row, type SyncTableName } from './tables.js';

export const PushBody = z.object({
  deviceId: z.string().min(1).max(64),
  mutations: z
    .array(
      z.object({
        mid: z.string().min(1).max(64),
        table: z.enum(SYNC_TABLE_NAMES as [SyncTableName, ...SyncTableName[]]),
        op: z.enum(['upsert', 'delete']),
        rowId: z.string().min(1).max(64),
        baseVersion: z.number().int().nonnegative(),
        data: z.record(z.string(), z.unknown()),
      }),
    )
    .max(LIMITS.pushBatchSize),
});
export type PushBody = z.infer<typeof PushBody>;

export type MutationResult =
  | { mid: string; status: 'ok'; row: Row }
  | { mid: string; status: 'conflict'; row: Row; copyId?: string }
  | { mid: string; status: 'rejected'; reason: string; row: Row | null };

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

function stripServerFields(data: Record<string, unknown>) {
  const { seq: _seq, version: _version, ...rest } = data;
  return rest;
}

async function enforceLimits(tx: Tx, table: SyncTableName, userId: string, next: Row) {
  if (table === 'groups') {
    const [r] = await tx
      .select({ n: count() })
      .from(groups)
      .where(and(eq(groups.ownerId, userId), eq(groups.deleted, false)));
    if ((r?.n ?? 0) >= LIMITS.groupsOwnedPerUser)
      return `Limite de ${LIMITS.groupsOwnedPerUser} grupos por usuário`;
  }
  if (table === 'groupMembers') {
    const [r] = await tx
      .select({ n: count() })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, String(next.groupId)), eq(groupMembers.deleted, false)));
    if ((r?.n ?? 0) >= LIMITS.membersPerGroup)
      return `Limite de ${LIMITS.membersPerGroup} membros por grupo`;
  }
  return null;
}

async function applyOne(
  tx: Tx,
  userId: string,
  deviceId: string,
  m: PushBody['mutations'][number],
): Promise<MutationResult> {
  const def = SYNC_TABLES[m.table];
  const table = def.table as never as typeof SYNC_TABLES.songs.table;
  const [existing] = (await tx
    .select()
    .from(table)
    .where(eq(table.id, m.rowId))
    .for('update')) as unknown as Row[];

  const now = new Date().toISOString();
  const candidate = {
    ...(existing ?? {}),
    ...stripServerFields(m.data),
    id: m.rowId,
    deleted: m.op === 'delete' ? true : Boolean(m.data.deleted ?? existing?.deleted ?? false),
    updatedAt: now,
    updatedByDevice: deviceId,
    version: existing ? existing.version + 1 : 1,
    seq: null,
  };
  const parsed = def.schema.safeParse(candidate);
  if (!parsed.success) {
    return {
      mid: m.mid,
      status: 'rejected',
      reason: `Dados inválidos: ${parsed.error.issues[0]?.message ?? 'formato'}`,
      row: existing ?? null,
    };
  }
  const next = parsed.data as unknown as Row;

  if (!(await canWrite(tx, userId, m.table, existing, next))) {
    return { mid: m.mid, status: 'rejected', reason: 'Sem permissão', row: existing ?? null };
  }

  const { seq: _s, ...values } = next as Row & { seq: unknown };

  if (!existing) {
    const limit = await enforceLimits(tx, m.table, userId, next);
    if (limit) return { mid: m.mid, status: 'rejected', reason: limit, row: null };
    const [row] = (await tx
      .insert(table)
      .values(values as never)
      .returning()) as unknown as Row[];
    return { mid: m.mid, status: 'ok', row: row! };
  }

  // conflito: o aparelho editou a partir de uma versão antiga
  if (existing.version !== m.baseVersion) {
    const contentDiverged =
      m.table === 'songs' &&
      !existing.deleted &&
      !next.deleted &&
      existing.content !== next.content;
    if (contentDiverged) {
      const copyId = crypto.randomUUID();
      await tx.insert(table).values({
        ...values,
        id: copyId,
        version: 1,
        title: `${String(next.title)} (conflito)`.slice(0, 200),
      } as never);
      return { mid: m.mid, status: 'conflict', row: existing, copyId };
    }
    // demais casos: vale a última escrita (esta), sem perder o que não mudou
  }

  const [row] = (await tx
    .update(table)
    .set(values as never)
    .where(eq(table.id, m.rowId))
    .returning()) as unknown as Row[];
  return { mid: m.mid, status: 'ok', row: row! };
}

export async function push(db: Db, userId: string, body: PushBody): Promise<MutationResult[]> {
  return db.transaction(async (tx) => {
    const results: MutationResult[] = [];
    for (const m of body.mutations) {
      const [done] = await tx
        .select()
        .from(appliedMutations)
        .where(and(eq(appliedMutations.mid, m.mid), eq(appliedMutations.userId, userId)))
        .limit(1);
      if (done) {
        results.push(done.result as MutationResult);
        continue;
      }
      const result = await applyOne(tx, userId, body.deviceId, m);
      await tx.insert(appliedMutations).values({ mid: m.mid, userId, result });
      results.push(result);
    }
    return results;
  });
}
