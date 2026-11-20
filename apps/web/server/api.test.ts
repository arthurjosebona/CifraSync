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

function song(ownerId: string, over: Record<string, unknown> = {}) {
  return {
    id: id(),
    version: 0,
    deleted: false,
    updatedAt: new Date().toISOString(),
    updatedByDevice: 'dev-a',
    ownerId,
    title: 'Canção',
    artist: '',
    key: 'G',
    capo: 0,
    transpose: 0,
    style: '',
    bpm: null,
    durationSec: null,
    scrollSpeed: null,
    content: 'G\nla la',
    chordPrefs: {},
    notes: '',
    ...over,
  };
}

function upsert(table: string, row: Record<string, unknown>, baseVersion = 0) {
  return { mid: id(), table, op: 'upsert', rowId: row.id as string, baseVersion, data: row };
}

describe('autenticação', () => {
  it('cadastra com nome de usuário e exige sessão nas rotas de dados', async () => {
    const { token } = await api.signUp('maria');
    expect(token).toBeTruthy();
    expect((await api.call('/sync/pull')).status).toBe(401);
    expect((await api.call('/sync/pull', { token })).status).toBe(200);
  });

  it('não aceita nome de usuário repetido', async () => {
    await api.signUp('repetido');
    await expect(api.signUp('repetido')).rejects.toThrow();
  });
});

describe('sync — push e pull', () => {
  it('envia, recebe de volta em outro aparelho e respeita o cursor', async () => {
    const { token, userId } = await api.signUp('joao');
    const s = song(userId, { title: 'Estrada' });
    const pushed = await api.call('/sync/push', {
      token,
      body: { deviceId: 'dev-a', mutations: [upsert('songs', s)] },
    });
    expect(pushed.json.results[0].status).toBe('ok');
    expect(pushed.json.results[0].row.version).toBe(1);

    const first = await api.call(`/sync/pull?cursors=${encodeURIComponent('{}')}`, { token });
    expect(first.json.changes.songs.map((x: { title: string }) => x.title)).toEqual(['Estrada']);
    const cursors = first.json.cursors;

    const again = await api.call(
      `/sync/pull?cursors=${encodeURIComponent(JSON.stringify(cursors))}`,
      { token },
    );
    expect(again.json.changes.songs ?? []).toEqual([]);
  });

  it('reenvio da mesma mutação é idempotente', async () => {
    const { token, userId } = await api.signUp('idem');
    const m = upsert('songs', song(userId));
    const a = await api.call('/sync/push', { token, body: { deviceId: 'd', mutations: [m] } });
    const b = await api.call('/sync/push', { token, body: { deviceId: 'd', mutations: [m] } });
    expect(b.json.results[0]).toEqual(a.json.results[0]);
    const pulled = await api.call('/sync/pull', { token });
    expect(pulled.json.changes.songs).toHaveLength(1);
  });

  it('conflito de letra cria cópia sem perder texto', async () => {
    const { token, userId } = await api.signUp('conflito');
    const base = song(userId, { title: 'Ponte', content: 'G\noriginal' });
    await api.call('/sync/push', {
      token,
      body: { deviceId: 'a', mutations: [upsert('songs', base)] },
    });

    // aparelho A edita a partir da versão 1
    await api.call('/sync/push', {
      token,
      body: { deviceId: 'a', mutations: [upsert('songs', { ...base, content: 'G\nversão A' }, 1)] },
    });
    // aparelho B, offline, também partiu da versão 1
    const r = await api.call('/sync/push', {
      token,
      body: { deviceId: 'b', mutations: [upsert('songs', { ...base, content: 'G\nversão B' }, 1)] },
    });
    expect(r.json.results[0].status).toBe('conflict');
    expect(r.json.results[0].row.content).toBe('G\nversão A');

    const pulled = await api.call('/sync/pull', { token });
    const contents = pulled.json.changes.songs.map((s: { content: string }) => s.content).sort();
    expect(contents).toEqual(['G\nversão A', 'G\nversão B']);
    expect(
      pulled.json.changes.songs.some((s: { title: string }) => s.title === 'Ponte (conflito)'),
    ).toBe(true);
  });

  it('exclusão propaga como tombstone', async () => {
    const { token, userId } = await api.signUp('apaga');
    const s = song(userId);
    await api.call('/sync/push', {
      token,
      body: { deviceId: 'a', mutations: [upsert('songs', s)] },
    });
    const before = await api.call('/sync/pull', { token });
    await api.call('/sync/push', {
      token,
      body: {
        deviceId: 'a',
        mutations: [
          { mid: id(), table: 'songs', op: 'delete', rowId: s.id, baseVersion: 1, data: s },
        ],
      },
    });
    const after = await api.call(
      `/sync/pull?cursors=${encodeURIComponent(JSON.stringify(before.json.cursors))}`,
      { token },
    );
    expect(after.json.changes.songs[0].deleted).toBe(true);
  });

  it('não deixa gravar música de outro usuário (mesmo chamando a API direto)', async () => {
    const dono = await api.signUp('dono1');
    const outro = await api.signUp('intruso1');
    const s = song(dono.userId);
    await api.call('/sync/push', {
      token: dono.token,
      body: { deviceId: 'a', mutations: [upsert('songs', s)] },
    });
    const r = await api.call('/sync/push', {
      token: outro.token,
      body: { deviceId: 'x', mutations: [upsert('songs', { ...s, title: 'hackeada' }, 1)] },
    });
    expect(r.json.results[0].status).toBe('rejected');
    const r2 = await api.call('/sync/push', {
      token: outro.token,
      body: { deviceId: 'x', mutations: [upsert('songs', song(dono.userId))] },
    });
    expect(r2.json.results[0].status).toBe('rejected');
  });

  it('rejeita dados inválidos', async () => {
    const { token, userId } = await api.signUp('invalido');
    const r = await api.call('/sync/push', {
      token,
      body: { deviceId: 'a', mutations: [upsert('songs', song(userId, { capo: 99 }))] },
    });
    expect(r.json.results[0].status).toBe('rejected');
  });
});

describe('outras rotas', () => {
  it('busca usuários por prefixo (mín. 3 caracteres), sem incluir a si mesmo', async () => {
    const a = await api.signUp('carlos');
    await api.signUp('carla');
    await api.signUp('camila');
    const r = await api.call('/users/search?q=car', { token: a.token });
    expect(r.json.users.map((u: { username: string }) => u.username)).toEqual(['carla']);
    const short = await api.call('/users/search?q=ca', { token: a.token });
    expect(short.json.users).toEqual([]);
  });

  it('exporta os dados e exclui a conta', async () => {
    const { token, userId } = await api.signUp('saindo');
    await api.call('/sync/push', {
      token,
      body: { deviceId: 'a', mutations: [upsert('songs', song(userId))] },
    });
    const exp = await api.call('/export', { token });
    expect(exp.json.songs).toHaveLength(1);
    expect((await api.call('/account', { method: 'DELETE', token })).status).toBe(200);
    expect((await api.call('/sync/pull', { token })).status).toBe(401);
  });

  it('health responde sem sessão', async () => {
    expect((await api.call('/health')).json).toEqual({ ok: true });
  });
});
