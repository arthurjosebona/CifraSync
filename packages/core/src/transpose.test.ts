import { describe, expect, it } from 'vitest';

import { formatChord, parseChord } from './chords';
import { parseKey } from './notes';
import { transposeChord, type TransposeOptions } from './transpose';

function t(s: string, n: number, opts?: TransposeOptions): string {
  return formatChord(transposeChord(parseChord(s)!, n, opts));
}

describe('transposeChord', () => {
  it('critério da SPEC: G D/F# Em7 C7M(9) +2 em A', () => {
    const targetKey = parseKey('A')!;
    expect(['G', 'D/F#', 'Em7', 'C7M(9)'].map((c) => t(c, 2, { targetKey }))).toEqual([
      'A',
      'E/G#',
      'F#m7',
      'D7M(9)',
    ]);
  });

  it('usa bemóis quando o destino é Fá maior', () => {
    const targetKey = parseKey('F')!;
    expect(t('A', 1, { targetKey })).toBe('Bb');
    expect(t('D7', 1, { targetKey })).toBe('Eb7');
    expect(t('G/B', -2, { targetKey })).toBe('F/A');
  });

  it('usa sustenidos quando o destino é Mi maior', () => {
    const targetKey = parseKey('E')!;
    expect(t('C', 1, { targetKey })).toBe('C#');
    expect(t('F', 1, { targetKey })).toBe('F#');
    expect(t('Bb', 0, { targetKey })).toBe('A#');
  });

  it('grafia neutra sem tom de destino', () => {
    expect(t('C', 1)).toBe('C#');
    expect(t('C', 3)).toBe('Eb');
    expect(t('C', 8)).toBe('Ab');
    expect(t('C', 10)).toBe('Bb');
  });

  it('override manual da grafia', () => {
    expect(t('C', 1, { spelling: 'flats' })).toBe('Db');
    expect(t('C', 10, { spelling: 'sharps' })).toBe('A#');
  });

  it('transpõe o baixo e mantém o sufixo', () => {
    expect(t('Bm7(b5)/F', 2)).toBe('C#m7(b5)/G');
    expect(t('Am/G', -2)).toBe('Gm/F');
    expect(t('E7(#9)', 5)).toBe('A7(#9)');
  });

  it('ida e volta retorna ao acorde original', () => {
    for (const s of ['C', 'F#m7', 'Bb7M(9)', 'D/F#', 'G#°7']) {
      const there = transposeChord(parseChord(s)!, 5);
      const back = transposeChord(there, -5, { spelling: s.includes('b') ? 'flats' : 'sharps' });
      expect(formatChord(back)).toBe(s);
    }
  });

  it('semitons fora de 0–11', () => {
    expect(t('C', 12)).toBe('C');
    expect(t('C', -1)).toBe('B');
    expect(t('C', 25)).toBe('C#');
  });
});
