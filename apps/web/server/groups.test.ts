/**
 * Grupos (SPEC §4): convites, papéis, compartilhamento de repertórios e revogação,
 * com dois a três usuários reais contra a API.
 */
import 'fake-indexeddb/auto';

import {
  adoptLocalData,
  CifraDB,
  listSetlistItems,
  listSongs,
  SyncEngine,
  uuidv7,
  type Transport,
} from '@cifrasync/sync';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApi, type TestApi } from './test-utils.js';

let api: TestApi;
beforeAll(async () => {
  api = await createTestApi();
}, 60_000);
afterAll(async () => {
  await api?.close();
});

const id = () => crypto.randomUUID();
const base = () => ({
  version: 0,
  deleted: false,
  updatedAt: new Date().toISOString(),
  updatedByDevice: 'd',
});

type User = { token: string; userId: string };

async function push(
  u: User,
  table: string,
  row: Record<string, unknown>,
  baseVersion = 0,
  op = 'upsert',
) {
  const r = await api.call('/sync/push', {
    token: u.token,
    body: {
      deviceId: 'd',
      mutations: [{ mid: id(), table, op, rowId: row.id, baseVersion, data: row }],
    },
  });
  return r.json.results[0] as {
    status: string;
    row: Record<string, unknown> & { version: number };
  };
}

async function pullAll(u: User) {
  return (await api.call('/sync/pull', { token: u.token })).json;
}

/** Monta: dono com grupo, música, repertório com a música, e o repertório compartilhado. */
async function scenario(prefix: string) {
  const owner = await api.signUp(`${prefix}dono`);
  const member = await api.signUp(`${prefix}membro`);
  const group = { ...base(), id: id(), ownerId: owner.userId, name: 'Banda' };
  expect((await push(owner, 'groups', group)).status).toBe('ok');
  expect(
    (
      await push(owner, 'groupMembers', {
        ...base(),
        id: id(),
        groupId: group.id,
        userId: owner.userId,
        role: 'owner',
        status: 'active',
      })
    ).status,
  ).toBe('ok');
  const song = {
    ...base(),
    id: id(),
    ownerId: owner.userId,
    title: 'Música da banda',
    artist: '',
    key: 'G',
    capo: 0,
    transpose: 0,
    style: '',
    bpm: null,
    durationSec: null,
    scrollSpeed: null,
    content: 'G\nla',
    chordPrefs: {},
    notes: '',
  };
  await push(owner, 'songs', song);
  const setlist = {
    ...base(),
    id: id(),
    ownerId: owner.userId,
    name: 'Show',
    eventDate: null,
    notes: '',
  };
  await push(owner, 'setlists', setlist);
  const item = {
    ...base(),
    id: id(),
    setlistId: setlist.id,
    kind: 'song',
    songId: song.id,
    label: null,
    position: 'a0',
    transpose: null,
    note: '',
  };
  await push(owner, 'setlistItems', item);
  return { owner, member, group, song, setlist, item };
}

describe('grupos', () => {
  it('convite pendente → aceito → membro recebe repertório e músicas (inclusive antigas)', async () => {
    const s = await scenario('g1');
    const invite = {
      ...base(),
      id: id(),
      groupId: s.group.id,
      userId: s.member.userId,
      role: 'member',
      status: 'pending',
    };
    expect((await push(s.owner, 'groupMembers', invite)).status).toBe('ok');

    // pendente: vê o convite, mas não o conteúdo
    let pulled = await pullAll(s.member);
    expect(pulled.changes.groups?.[0]?.name).toBe('Banda');
    expect(pulled.changes.setlists ?? []).toEqual([]);

    // aceita
    expect((await push(s.member, 'groupMembers', { ...invite, status: 'active' }, 1)).status).toBe(
      'ok',
    );
    // compartilha o repertório depois de o membro entrar
    expect(
      (
        await push(s.owner, 'groupSetlists', {
          ...base(),
          id: id(),
          groupId: s.group.id,
          setlistId: s.setlist.id,
          addedBy: s.owner.userId,
        })
      ).status,
    ).toBe('ok');

    pulled = await pullAll(s.member);
    expect(pulled.changes.setlists.map((x: { name: string }) => x.name)).toEqual(['Show']);
    expect(pulled.changes.songs.map((x: { title: string }) => x.title)).toEqual([
      'Música da banda',
    ]);
    expect(pulled.changes.setlistItems).toHaveLength(1);
    expect(pulled.profiles.map((p: { username: string }) => p.username).sort()).toEqual([
      'g1dono',
      'g1membro',
    ]);
  });

  it('membro sem papel de editor não altera o repertório nem a música de outro', async () => {
    const s = await scenario('g2');
    const m = {
      ...base(),
      id: id(),
      groupId: s.group.id,
      userId: s.member.userId,
      role: 'member',
      status: 'active',
    };
    await push(s.owner, 'groupMembers', m);
    await push(s.owner, 'groupSetlists', {
      ...base(),
      id: id(),
      groupId: s.group.id,
      setlistId: s.setlist.id,
      addedBy: s.owner.userId,
    });

    expect((await push(s.member, 'setlists', { ...s.setlist, name: 'Mudei' }, 1)).status).toBe(
      'rejected',
    );
    expect((await push(s.member, 'setlistItems', { ...s.item, transpose: 2 }, 1)).status).toBe(
      'rejected',
    );
    expect((await push(s.member, 'songs', { ...s.song, content: 'G\nhack' }, 1)).status).toBe(
      'rejected',
    );
    // não pode se promover
    expect((await push(s.member, 'groupMembers', { ...m, role: 'editor' }, 1)).status).toBe(
      'rejected',
    );
  });

  it('editor do grupo altera o repertório compartilhado, mas não a música', async () => {
    const s = await scenario('g3');
    await push(s.owner, 'groupMembers', {
      ...base(),
      id: id(),
      groupId: s.group.id,
      userId: s.member.userId,
      role: 'editor',
      status: 'active',
    });
    await push(s.owner, 'groupSetlists', {
      ...base(),
      id: id(),
      groupId: s.group.id,
      setlistId: s.setlist.id,
      addedBy: s.owner.userId,
    });
    expect((await push(s.member, 'setlistItems', { ...s.item, transpose: 2 }, 1)).status).toBe(
      'ok',
    );
    expect(
      (await push(s.member, 'setlists', { ...s.setlist, name: 'Show renomeado' }, 1)).status,
    ).toBe('ok');
    expect((await push(s.member, 'songs', { ...s.song, content: 'G\nhack' }, 1)).status).toBe(
      'rejected',
    );
  });

  it('só o dono convida; quem não é dono do repertório não o compartilha', async () => {
    const s = await scenario('g4');
    const intruso = await api.signUp('g4intruso');
    await push(s.owner, 'groupMembers', {
      ...base(),
      id: id(),
      groupId: s.group.id,
      userId: s.member.userId,
      role: 'editor',
      status: 'active',
    });
    // membro tenta convidar terceiro
    expect(
      (
        await push(s.member, 'groupMembers', {
          ...base(),
          id: id(),
          groupId: s.group.id,
          userId: intruso.userId,
          role: 'member',
          status: 'pending',
        })
      ).status,
    ).toBe('rejected');
    // editor tenta compartilhar repertório que não é dele
    expect(
      (
        await push(s.member, 'groupSetlists', {
          ...base(),
          id: id(),
          groupId: s.group.id,
          setlistId: s.setlist.id,
          addedBy: s.member.userId,
        })
      ).status,
    ).toBe('rejected');
  });

  it('membro removido perde o conteúdo do grupo no aparelho na próxima sincronização', async () => {
    const s = await scenario('g5');
    const m = {
      ...base(),
      id: id(),
      groupId: s.group.id,
      userId: s.member.userId,
      role: 'member',
      status: 'active',
    };
    await push(s.owner, 'groupMembers', m);
    await push(s.owner, 'groupSetlists', {
      ...base(),
      id: id(),
      groupId: s.group.id,
      setlistId: s.setlist.id,
      addedBy: s.owner.userId,
    });

    const transport: Transport = {
      push: async (body) => (await api.call('/sync/push', { token: s.member.token, body })).json,
      pull: async (cursors) =>
        (
          await api.call(`/sync/pull?cursors=${encodeURIComponent(JSON.stringify(cursors))}`, {
            token: s.member.token,
          })
        ).json,
    };
    const db = new CifraDB(`membro-${uuidv7()}`);
    await adoptLocalData(db, s.member.userId);
    const engine = new SyncEngine(db, transport);
    await engine.sync();
    expect((await listSongs(db)).map((x) => x.title)).toEqual(['Música da banda']);
    expect(await listSetlistItems(db, s.setlist.id)).toHaveLength(1);

    // dono remove o membro
    expect((await push(s.owner, 'groupMembers', { ...m, deleted: true }, 1, 'delete')).status).toBe(
      'ok',
    );
    await engine.sync();
    expect(await listSongs(db)).toEqual([]);
    expect(await db.setlists.get(s.setlist.id)).toBeUndefined();
    expect(await db.groups.get(s.group.id)).toBeUndefined();
  });

  it('limita grupos por usuário', async () => {
    const u = await api.signUp('g6muitos');
    for (let i = 0; i < 10; i++) {
      expect(
        (await push(u, 'groups', { ...base(), id: id(), ownerId: u.userId, name: `G${i}` })).status,
      ).toBe('ok');
    }
    expect(
      (await push(u, 'groups', { ...base(), id: id(), ownerId: u.userId, name: 'demais' })).status,
    ).toBe('rejected');
  });
});
