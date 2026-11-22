import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CifraDB } from './db';
import { uuidv7 } from './ids';
import {
  addSetlistItem,
  deleteSetlist,
  deleteSong,
  duplicateSetlist,
  getCurrentUserId,
  getDeviceId,
  getSettingsRows,
  getSong,
  listSetlistItems,
  listSetlists,
  listSongs,
  moveSetlistItem,
  pendingCount,
  removeSetlistItem,
  saveSetlist,
  saveSettings,
  saveSong,
} from './repo';
import { matchesQuery, normalize, songWords } from './search';

let db: CifraDB;
beforeEach(() => {
  db = new CifraDB(`teste-${uuidv7()}`);
});
afterEach(async () => {
  await db.delete();
});

describe('uuidv7', () => {
  it('gera ids v7 ordenáveis', () => {
    const a = uuidv7(1_000);
    const b = uuidv7(2_000);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
  });
});

describe('identidade', () => {
  it('device e usuário local são estáveis', async () => {
    expect(await getDeviceId(db)).toBe(await getDeviceId(db));
    expect(await getCurrentUserId(db)).toBe(await getCurrentUserId(db));
  });
});

describe('músicas', () => {
  it('salva, enfileira e funde edições pendentes', async () => {
    const s = await saveSong(db, { title: 'Estrada', content: 'G\nPeguei a estrada' });
    expect(s.ownerId).toBe(await getCurrentUserId(db));
    expect(await pendingCount(db)).toBe(1);

    await saveSong(db, { id: s.id, title: 'Estrada de terra' });
    expect(await pendingCount(db)).toBe(1);
    const m = (await db.outbox.toArray())[0]!;
    expect(m.data.title).toBe('Estrada de terra');
    expect(m.data._words).toBeUndefined();
    expect(m.data.content).toBe('G\nPeguei a estrada');
  });

  it('não funde com mutação em envio', async () => {
    const s = await saveSong(db, { title: 'A' });
    await db.outbox.toCollection().modify({ inFlight: true });
    await saveSong(db, { id: s.id, title: 'B' });
    expect(await pendingCount(db)).toBe(2);
  });

  it('exclusão é lógica e some da biblioteca', async () => {
    const s = await saveSong(db, { title: 'Apagar' });
    await deleteSong(db, s.id);
    expect(await getSong(db, s.id)).toBeUndefined();
    expect((await db.songs.get(s.id))?.deleted).toBe(true);
    expect(await listSongs(db)).toEqual([]);
    const ops = (await db.outbox.toArray()).map((m) => m.op);
    expect(ops).toEqual(['delete']);
  });

  it('busca por título, artista e trecho da letra, sem acento', async () => {
    await saveSong(db, { title: 'Canção da Manhã', artist: 'Zé', content: 'C\nO café passando' });
    await saveSong(db, { title: 'Outra', artist: 'Ana', content: 'G\nNada a ver', key: 'G' });
    expect((await listSongs(db, { query: 'cancao' })).map((s) => s.title)).toEqual([
      'Canção da Manhã',
    ]);
    expect((await listSongs(db, { query: 'cafe pass' })).length).toBe(1);
    expect((await listSongs(db, { query: 'ze' })).length).toBe(1);
    expect((await listSongs(db, { key: 'G' })).map((s) => s.title)).toEqual(['Outra']);
    expect((await listSongs(db)).map((s) => s.title)).toEqual(['Canção da Manhã', 'Outra']);
  });
});

describe('busca', () => {
  it('normaliza e indexa só a letra (sem cifras)', () => {
    expect(normalize('ÁÉÎõü Ç')).toBe('aeiou c');
    const words = songWords({ title: 'T', artist: '', style: '', content: 'G7M\nLetra boa' });
    expect(words).toContain('letra');
    expect(words).not.toContain('g7m');
    expect(matchesQuery(['estrada', 'terra'], 'est ter')).toBe(true);
    expect(matchesQuery(['estrada'], 'mar')).toBe(false);
  });
});

describe('repertórios', () => {
  it('adiciona, ordena, move e remove itens', async () => {
    const sl = await saveSetlist(db, { name: 'Show' });
    const a = await saveSong(db, { title: 'A' });
    const b = await saveSong(db, { title: 'B' });
    const c = await saveSong(db, { title: 'C' });
    const ia = await addSetlistItem(db, sl.id, { kind: 'song', songId: a.id });
    const ib = await addSetlistItem(db, sl.id, { kind: 'song', songId: b.id });
    await addSetlistItem(db, sl.id, { kind: 'moment', label: 'Intervalo' }, ia.id);
    const ic = await addSetlistItem(db, sl.id, { kind: 'song', songId: c.id, transpose: 2 }, null);

    const order = async () => (await listSetlistItems(db, sl.id)).map((i) => i.label ?? i.songId);
    expect(await order()).toEqual([c.id, a.id, 'Intervalo', b.id]);

    await moveSetlistItem(db, ic.id, 3);
    expect(await order()).toEqual([a.id, 'Intervalo', b.id, c.id]);
    await moveSetlistItem(db, ib.id, 0);
    expect(await order()).toEqual([b.id, a.id, 'Intervalo', c.id]);

    await removeSetlistItem(db, ia.id);
    expect(await order()).toEqual([b.id, 'Intervalo', c.id]);
  });

  it('apagar repertório não apaga as músicas', async () => {
    const sl = await saveSetlist(db, { name: 'Ensaio' });
    const s = await saveSong(db, { title: 'Fica' });
    await addSetlistItem(db, sl.id, { kind: 'song', songId: s.id });
    await deleteSetlist(db, sl.id);
    expect(await listSetlists(db)).toEqual([]);
    expect(await listSetlistItems(db, sl.id)).toEqual([]);
    expect(await getSong(db, s.id)).toBeDefined();
  });

  it('duplica com os itens e ordena por data', async () => {
    const sl = await saveSetlist(db, { name: 'Sábado', eventDate: '2026-12-05' });
    await saveSetlist(db, { name: 'Sem data' });
    await saveSetlist(db, { name: 'Antigo', eventDate: '2026-01-01' });
    const s = await saveSong(db, { title: 'X' });
    await addSetlistItem(db, sl.id, { kind: 'song', songId: s.id, transpose: -1 });
    const copy = (await duplicateSetlist(db, sl.id))!;
    expect(copy.name).toBe('Sábado (cópia)');
    expect((await listSetlistItems(db, copy.id))[0]?.transpose).toBe(-1);
    expect((await listSetlists(db)).map((x) => x.name)).toEqual([
      'Sábado',
      'Sábado (cópia)',
      'Antigo',
      'Sem data',
    ]);
  });
});

describe('configurações', () => {
  it('separa global e override do dispositivo', async () => {
    await saveSettings(db, { theme: 'dark' }, 'global');
    await saveSettings(db, { stage: { fontSize: 40 } }, 'device');
    await saveSettings(db, { theme: 'light' }, 'global');
    const rows = await getSettingsRows(db);
    expect(rows.global?.data).toEqual({ theme: 'light' });
    expect(rows.device?.data).toEqual({ stage: { fontSize: 40 } });
    expect(await db.userSettings.count()).toBe(2);
  });
});

describe('consultas reativas (liveQuery)', () => {
  it('ler configurações num banco novo não tenta gravar (ReadOnlyError)', async () => {
    const { liveQuery } = await import('dexie');
    const result = await new Promise<unknown>((resolve, reject) => {
      const sub = liveQuery(() => getSettingsRows(db)).subscribe({
        next: (v) => {
          sub.unsubscribe();
          resolve(v);
        },
        error: (e: unknown) => {
          sub.unsubscribe();
          reject(e);
        },
      });
    });
    expect(result).toEqual({});
  });

  it('configuração salva chega na consulta reativa (com conta e sem conta)', async () => {
    const { liveQuery } = await import('dexie');
    for (const comConta of [false, true]) {
      const base = new CifraDB(`teste-${uuidv7()}`);
      await getCurrentUserId(base);
      if (comConta) await base.meta.put({ key: 'userId', value: 'usuario-da-conta' });
      const seen: unknown[] = [];
      const sub = liveQuery(() => getSettingsRows(base)).subscribe({
        next: (v) => seen.push(v.global?.data.theme),
      });
      await new Promise((r) => setTimeout(r, 50));
      await saveSettings(base, { theme: 'dark' }, 'global');
      await new Promise((r) => setTimeout(r, 100));
      await saveSettings(base, { theme: 'light' }, 'global');
      await new Promise((r) => setTimeout(r, 100));
      sub.unsubscribe();
      expect(seen.at(-1)).toBe('light');
      expect(seen).toContain('dark');
      await base.delete();
    }
  });
});
