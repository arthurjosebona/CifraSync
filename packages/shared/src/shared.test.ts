import { describe, expect, it } from 'vitest';

import { AppSettings, parseAppSettings, Song, StageSettings, Username } from './index';

describe('configurações', () => {
  it('preenche todos os padrões a partir de um objeto vazio', () => {
    const s = parseAppSettings({});
    expect(s.theme).toBe('system');
    expect(s.stage.fontSize).toBe(26);
    expect(s.stage.colors.chord).toBe('#ffcc00');
    expect(s.stage.navigation).toBe('paged');
  });

  it('mantém o que veio e completa o resto', () => {
    const s = parseAppSettings({ stage: { fontSize: 40, colors: { bg: '#ffffff' } } });
    expect(s.stage.fontSize).toBe(40);
    expect(s.stage.colors.bg).toBe('#ffffff');
    expect(s.stage.colors.lyric).toBe('#ffffff');
  });

  it('dados inválidos voltam ao padrão', () => {
    expect(parseAppSettings({ stage: { fontSize: 'grande' } })).toEqual(AppSettings.parse({}));
    expect(parseAppSettings(null).stage).toEqual(StageSettings.parse({}));
  });
});

describe('entidades', () => {
  const base = {
    id: '018f3c2e-7b1a-7c00-8000-000000000001',
    version: 0,
    seq: null,
    deleted: false,
    updatedAt: '2026-11-20T00:00:00.000Z',
    updatedByDevice: 'dev',
  };

  it('valida uma música', () => {
    const song = Song.parse({
      ...base,
      ownerId: '018f3c2e-7b1a-7c00-8000-000000000002',
      title: 'Teste',
      artist: '',
      key: 'G',
      capo: 0,
      transpose: 0,
      style: '',
      bpm: null,
      durationSec: null,
      scrollSpeed: null,
      content: 'G\nla',
      chordPrefs: { violao: { F: 1 } },
      notes: '',
    });
    expect(song.title).toBe('Teste');
  });

  it('valida nomes de usuário', () => {
    expect(Username.parse('  Joao.Silva ')).toBe('joao.silva');
    expect(Username.safeParse('ab').success).toBe(false);
    expect(Username.safeParse('-joao').success).toBe(false);
    expect(Username.safeParse('maria_2').success).toBe(true);
  });
});
