/**
 * Consultas de grupos no banco local (reativas).
 */
import type { Group, GroupMember, GroupSetlist, Profile, Setlist } from '@cifrasync/shared';
import { peekCurrentUserId } from '@cifrasync/sync';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from './data';

/** Id do usuário atual (conta ou id local), sem gravar nada. */
export function useMyId(): string | undefined {
  return useLiveQuery(async () => (await peekCurrentUserId(db)) ?? '', []) || undefined;
}

export interface MyGroup {
  group: Group;
  me: GroupMember;
}

/** Grupos dos quais participo (ativos) e convites pendentes. */
export function useMyGroups():
  { active: MyGroup[]; pending: (MyGroup & { owner?: Profile })[] } | undefined {
  return useLiveQuery(async () => {
    const me = await peekCurrentUserId(db);
    if (!me) return { active: [], pending: [] };
    const memberships = await db.groupMembers
      .where('userId')
      .equals(me)
      .filter((m) => !m.deleted)
      .toArray();
    const active: MyGroup[] = [];
    const pending: (MyGroup & { owner?: Profile })[] = [];
    for (const m of memberships) {
      const group = await db.groups.get(m.groupId);
      if (!group || group.deleted) continue;
      if (m.status === 'active') active.push({ group, me: m });
      else pending.push({ group, me: m, owner: await db.profiles.get(group.ownerId) });
    }
    active.sort((a, b) => a.group.name.localeCompare(b.group.name, 'pt-BR'));
    return { active, pending };
  }, []);
}

export interface GroupDetail {
  group: Group;
  me: GroupMember | undefined;
  members: (GroupMember & { profile?: Profile })[];
  setlists: (GroupSetlist & { setlist?: Setlist; addedByProfile?: Profile })[];
}

export function useGroup(id: string | undefined): GroupDetail | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const group = await db.groups.get(id);
    if (!group || group.deleted) return null;
    const meId = await peekCurrentUserId(db);
    const all = await db.groupMembers
      .where('groupId')
      .equals(id)
      .filter((m) => !m.deleted)
      .toArray();
    const members = await Promise.all(
      all.map(async (m) => ({ ...m, profile: await db.profiles.get(m.userId) })),
    );
    const order = { owner: 0, editor: 1, member: 2 } as const;
    members.sort(
      (a, b) =>
        order[a.role] - order[b.role] ||
        (a.profile?.username ?? '').localeCompare(b.profile?.username ?? ''),
    );
    const gs = await db.groupSetlists
      .where('groupId')
      .equals(id)
      .filter((g) => !g.deleted)
      .toArray();
    const setlists = await Promise.all(
      gs.map(async (g) => ({
        ...g,
        setlist: await db.setlists.get(g.setlistId),
        addedByProfile: await db.profiles.get(g.addedBy),
      })),
    );
    return { group, me: members.find((m) => m.userId === meId), members, setlists };
  }, [id]);
}

/** Posso editar este repertório? Dono, ou editor/dono de um grupo que o compartilha. */
export function useCanEditSetlist(setlist: Setlist | null | undefined): boolean | undefined {
  return useLiveQuery(async () => {
    if (!setlist) return false;
    const me = await peekCurrentUserId(db);
    if (setlist.ownerId === me) return true;
    const shared = await db.groupSetlists
      .where('setlistId')
      .equals(setlist.id)
      .filter((g) => !g.deleted)
      .toArray();
    for (const g of shared) {
      const m = await db.groupMembers
        .where('[groupId+userId]')
        .equals([g.groupId, me ?? ''])
        .first();
      if (m && !m.deleted && m.status === 'active' && (m.role === 'editor' || m.role === 'owner'))
        return true;
    }
    return false;
  }, [setlist?.id, setlist?.ownerId]);
}
