/**
 * Dois aparelhos (dois bancos locais + motores de sync) contra a API real sobre PGlite.
 */
import 'fake-indexeddb/auto';

import {
  adoptLocalData,
  CifraDB,
  deleteSong,
  getSong,
  listSongs,
  saveSong,
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

function transportFor(token: string): Transport {
  return {
    async push(body) {
      const r = await api.call('/sync/push', { token, body });
      if (r.status !== 200) throw new Error(`push ${r.status}`);
      return r.json;
    },
    async pull(cursors) {
      const r = await api.call(
        `/sync/pull?cursors=${encodeURIComponent(JSON.stringify(cursors))}`,
        {
          token,
        },
      );
      if (r.status !== 200) throw new Error(`pull ${r.status}`);
      return r.json;
    },
  };
}

async function device(token: string, userId: string) {
  const db = new CifraDB(`aparelho-${uuidv7()}`);
  await adoptLocalData(db, userId);
  return { db, engine: new SyncEngine(db, transportFor(token)) };
}

describe('sync entre aparelhos', () => {
  it('edição offline no aparelho A aparece no B depois de sincronizar', async () => {
    const { token, userId } = await api.signUp('aparelhos1');
    const a = await device(token, userId);
    const b = await device(token, userId);

    const s = await saveSong(a.db, { title: 'Feita no A', content: 'G\nla la' });
    expect(await a.db.outbox.count()).toBe(1);
    await a.engine.sync();
    expect(await a.db.outbox.count()).toBe(0);
    expect((await a.db.songs.get(s.id))?.version).toBe(1);

    await b.engine.sync();
    expect((await listSongs(b.db)).map((x) => x.title)).toEqual(['Feita no A']);
    expect(b.engine.getState().status).toBe('idle');
  });

  it('conflito de letra gera cópia nos dois aparelhos, sem perda', async () => {
    const { token, userId } = await api.signUp('aparelhos2');
    const a = await device(token, userId);
    const b = await device(token, userId);
    const s = await saveSong(a.db, { title: 'Disputada', content: 'G\noriginal' });
    await a.engine.sync();
    await b.engine.sync();

    // ambos editam offline a partir da mesma versão
    await saveSong(a.db, { id: s.id, content: 'G\nversão A' });
    await saveSong(b.db, { id: s.id, content: 'G\nversão B' });
    await a.engine.sync();
    await b.engine.sync();
    await a.engine.sync();

    for (const d of [a, b]) {
      const songs = await listSongs(d.db);
      expect(songs.map((x) => x.content).sort()).toEqual(['G\nversão A', 'G\nversão B']);
      expect(songs.some((x) => x.title === 'Disputada (conflito)')).toBe(true);
    }
  });

  it('exclusão propaga para o outro aparelho', async () => {
    const { token, userId } = await api.signUp('aparelhos3');
    const a = await device(token, userId);
    const b = await device(token, userId);
    const s = await saveSong(a.db, { title: 'Some' });
    await a.engine.sync();
    await b.engine.sync();
    expect(await getSong(b.db, s.id)).toBeDefined();
    await deleteSong(b.db, s.id);
    await b.engine.sync();
    await a.engine.sync();
    expect(await getSong(a.db, s.id)).toBeUndefined();
  });

  it('dados criados antes do login passam para a conta', async () => {
    const db = new CifraDB(`aparelho-${uuidv7()}`);
    const s = await saveSong(db, { title: 'Sem conta ainda' });
    const { token, userId } = await api.signUp('aparelhos4');
    await adoptLocalData(db, userId);
    const engine = new SyncEngine(db, transportFor(token));
    await engine.sync();
    expect(engine.getState().status).toBe('idle');
    expect((await db.songs.get(s.id))?.ownerId).toBe(userId);
    const other = await device(token, userId);
    await other.engine.sync();
    expect((await listSongs(other.db)).map((x) => x.title)).toEqual(['Sem conta ainda']);
  });

  it('sem login, o motor não tenta sincronizar', async () => {
    const db = new CifraDB(`aparelho-${uuidv7()}`);
    const engine = new SyncEngine(db, transportFor('x'));
    await saveSong(db, { title: 'Local' });
    await engine.sync();
    expect(engine.getState()).toMatchObject({ status: 'signed-out', pending: 1 });
  });
});
