/**
 * Consultas de grupos no banco local (reativas).
 *
 * Cada consulta lê todas as tabelas de uma vez (`snapshot`) e monta o resultado em memória.
 * Leituras encadeadas com vários `await` fazem o Dexie deixar de observar as tabelas, e a tela
 * não atualizaria quando chegasse um grupo, um membro ou um repertório novo.
 */
import type { Group, GroupMember, GroupSetlist, Profile, Setlist } from '@cifrasync/shared';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from './data';

async function snapshot() {
  const [ids, groups, members, groupSetlists, setlists, profiles] = await Promise.all([
    db.meta.bulkGet(['userId', 'localUserId']),
    db.groups.toArray(),
    db.groupMembers.toArray(),
    db.groupSetlists.toArray(),
    db.setlists.toArray(),
    db.profiles.toArray(),
  ]);
  const me = (ids[0]?.value ?? ids[1]?.value) as string | undefined;
  return {
    me,
    groups: new Map(groups.filter((g) => !g.deleted).map((g) => [g.id, g])),
    members: members.filter((m) => !m.deleted),
    groupSetlists: groupSetlists.filter((g) => !g.deleted),
    setlists: new Map(setlists.filter((s) => !s.deleted).map((s) => [s.id, s])),
    profiles: new Map(profiles.map((p) => [p.id, p])),
  };
}

/** Id do usuário atual (conta ou id local), sem gravar nada. */
export function useMyId(): string | undefined {
  return (
    useLiveQuery(async () => {
      const [user, local] = await db.meta.bulkGet(['userId', 'localUserId']);
      return ((user?.value ?? local?.value) as string | undefined) ?? '';
    }, []) || undefined
  );
}

export interface MyGroup {
  group: Group;
  me: GroupMember;
}

/** Grupos dos quais participo (ativos) e convites pendentes. */
export function useMyGroups():
  { active: MyGroup[]; pending: (MyGroup & { owner?: Profile })[] } | undefined {
  return useLiveQuery(async () => {
    const s = await snapshot();
    if (!s.me) return { active: [], pending: [] };
    const active: MyGroup[] = [];
    const pending: (MyGroup & { owner?: Profile })[] = [];
    for (const m of s.members) {
      if (m.userId !== s.me) continue;
      const group = s.groups.get(m.groupId);
      if (!group) continue;
      if (m.status === 'active') active.push({ group, me: m });
      else pending.push({ group, me: m, owner: s.profiles.get(group.ownerId) });
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
    const s = await snapshot();
    const group = s.groups.get(id);
    if (!group) return null;
    const members = s.members
      .filter((m) => m.groupId === id)
      .map((m) => ({ ...m, profile: s.profiles.get(m.userId) }));
    const order = { owner: 0, editor: 1, member: 2 } as const;
    members.sort(
      (a, b) =>
        order[a.role] - order[b.role] ||
        (a.profile?.username ?? '').localeCompare(b.profile?.username ?? ''),
    );
    const setlists = s.groupSetlists
      .filter((g) => g.groupId === id)
      .map((g) => ({
        ...g,
        setlist: s.setlists.get(g.setlistId),
        addedByProfile: s.profiles.get(g.addedBy),
      }));
    return { group, me: members.find((m) => m.userId === s.me), members, setlists };
  }, [id]);
}

export interface GroupWithSetlists {
  group: Group;
  setlists: (Setlist & { mine: boolean })[];
}

/** Repertórios compartilhados nos grupos de que participo, agrupados por grupo. */
export function useGroupSetlists(): GroupWithSetlists[] | undefined {
  return useLiveQuery(async () => {
    const s = await snapshot();
    if (!s.me) return [];
    const out: GroupWithSetlists[] = [];
    for (const m of s.members) {
      if (m.userId !== s.me || m.status !== 'active') continue;
      const group = s.groups.get(m.groupId);
      if (!group) continue;
      const setlists = s.groupSetlists
        .filter((g) => g.groupId === group.id)
        .flatMap((g) => {
          const sl = s.setlists.get(g.setlistId);
          return sl ? [{ ...sl, mine: sl.ownerId === s.me }] : [];
        })
        .sort(
          (a, b) =>
            (a.eventDate ?? '9999').localeCompare(b.eventDate ?? '9999') ||
            a.name.localeCompare(b.name, 'pt-BR'),
        );
      if (setlists.length) out.push({ group, setlists });
    }
    return out.sort((a, b) => a.group.name.localeCompare(b.group.name, 'pt-BR'));
  }, []);
}

/** Posso editar este repertório? Dono, ou editor/dono de um grupo que o compartilha. */
export function useCanEditSetlist(setlist: Setlist | null | undefined): boolean | undefined {
  return useLiveQuery(async () => {
    if (!setlist) return false;
    const s = await snapshot();
    if (setlist.ownerId === s.me) return true;
    return s.groupSetlists
      .filter((g) => g.setlistId === setlist.id)
      .some((g) =>
        s.members.some(
          (m) =>
            m.groupId === g.groupId &&
            m.userId === s.me &&
            m.status === 'active' &&
            (m.role === 'editor' || m.role === 'owner'),
        ),
      );
  }, [setlist?.id, setlist?.ownerId]);
}
