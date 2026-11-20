/**
 * Regras de permissão, sempre aplicadas no servidor (SPEC §4).
 *
 * | Ação                                   | Quem pode                                         |
 * |----------------------------------------|---------------------------------------------------|
 * | Música                                 | Só o dono                                         |
 * | Repertório e itens                     | Dono do repertório + editores de grupo que o têm  |
 * | Configurações                          | Só o próprio usuário                              |
 * | Grupo (nome)                           | Dono do grupo                                     |
 * | Membros e papéis                       | Dono do grupo (o membro pode sair / aceitar)      |
 * | Compartilhar repertório no grupo       | Dono/editor que é dono do repertório              |
 * | Remover repertório do grupo            | Quem adicionou ou o dono do grupo                 |
 */
import { and, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db/client.js';
import { groupMembers, groups, groupSetlists, setlists } from '../db/schema.js';
import type { Row, SyncTableName } from './tables.js';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0] | Db;

export async function activeMembership(tx: Tx, groupId: string, userId: string) {
  const [m] = await tx
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.deleted, false),
      ),
    )
    .limit(1);
  return m && m.status === 'active' ? m : undefined;
}

/** O usuário pode editar o repertório? Dono, ou editor/dono de um grupo que o compartilha. */
export async function canEditSetlist(tx: Tx, setlistId: string, userId: string): Promise<boolean> {
  const [s] = await tx.select().from(setlists).where(eq(setlists.id, setlistId)).limit(1);
  if (!s) return false;
  if (s.ownerId === userId) return true;
  const shared = await tx
    .select({ groupId: groupSetlists.groupId })
    .from(groupSetlists)
    .where(and(eq(groupSetlists.setlistId, setlistId), eq(groupSetlists.deleted, false)));
  if (!shared.length) return false;
  const roles = await tx
    .select({ role: groupMembers.role, status: groupMembers.status })
    .from(groupMembers)
    .where(
      and(
        inArray(
          groupMembers.groupId,
          shared.map((g) => g.groupId),
        ),
        eq(groupMembers.userId, userId),
        eq(groupMembers.deleted, false),
      ),
    );
  return roles.some((r) => r.status === 'active' && (r.role === 'editor' || r.role === 'owner'));
}

/**
 * Pode gravar `next` (estado novo) sobre `existing` (estado atual no servidor, se houver)?
 */
export async function canWrite(
  tx: Tx,
  userId: string,
  table: SyncTableName,
  existing: Row | undefined,
  next: Row,
): Promise<boolean> {
  switch (table) {
    case 'songs':
      return next.ownerId === userId && (!existing || existing.ownerId === userId);

    case 'userSettings':
      return next.userId === userId && (!existing || existing.userId === userId);

    case 'setlists':
      if (!existing) return next.ownerId === userId;
      if (next.ownerId !== existing.ownerId) return false;
      if (existing.ownerId === userId) return true;
      // editores do grupo editam itens e dados do repertório, mas não podem apagá-lo
      return !next.deleted && (await canEditSetlist(tx, existing.id, userId));

    case 'setlistItems': {
      if (existing && existing.setlistId !== next.setlistId) return false;
      return canEditSetlist(tx, String(next.setlistId), userId);
    }

    case 'groups':
      if (!existing) return next.ownerId === userId;
      return existing.ownerId === userId && next.ownerId === userId;

    case 'groupMembers': {
      const [g] = await tx
        .select()
        .from(groups)
        .where(eq(groups.id, String(next.groupId)))
        .limit(1);
      if (!g || g.deleted) return false;
      const isOwner = g.ownerId === userId;
      if (existing && (existing.groupId !== next.groupId || existing.userId !== next.userId))
        return false;
      if (isOwner) {
        // o dono não muda o próprio papel nem sai sem transferir o grupo
        if (next.userId === userId) return next.role === 'owner' && !next.deleted;
        return next.role !== 'owner';
      }
      // o próprio membro pode aceitar o convite (pending → active) ou sair (deleted)
      if (!existing || existing.userId !== userId || next.userId !== userId) return false;
      const sameRole = next.role === existing.role;
      const accepting = existing.status === 'pending' && next.status === 'active';
      const leaving = next.deleted === true;
      return sameRole && (accepting || leaving || next.status === existing.status);
    }

    case 'groupSetlists': {
      const groupId = String(next.groupId);
      const [g] = await tx.select().from(groups).where(eq(groups.id, groupId)).limit(1);
      if (!g || g.deleted) return false;
      if (!existing) {
        const m = await activeMembership(tx, groupId, userId);
        if (!m || (m.role !== 'owner' && m.role !== 'editor')) return false;
        if (next.addedBy !== userId) return false;
        const [s] = await tx
          .select()
          .from(setlists)
          .where(eq(setlists.id, String(next.setlistId)))
          .limit(1);
        return !!s && s.ownerId === userId;
      }
      // remover: quem adicionou ou o dono do grupo
      if (existing.setlistId !== next.setlistId || existing.groupId !== next.groupId) return false;
      return existing.addedBy === userId || g.ownerId === userId;
    }
  }
}
