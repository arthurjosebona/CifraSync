import { describe, expect, it } from 'vitest';

import { parseChord } from './chords';
import type { InstrumentId } from './instruments';
import {
  datasetVoicings,
  fingerCount,
  generateVoicings,
  getVoicings,
  voicingToString,
} from './voicings';

const c = (s: string) => parseChord(s)!;
const shapes = (s: string, inst: InstrumentId) =>
  getVoicings(c(s), inst).map((v) => voicingToString(v.frets));

describe('critério da SPEC: ≥ 3 posições por acorde e instrumento', () => {
  const chords = ['C', 'G', 'D', 'Am', 'Em', 'F', 'Bm', 'A7', 'G7'];
  const instruments: InstrumentId[] = ['violao', 'cavaco', 'ukulele'];
  for (const inst of instruments) {
    it.each(chords)(`${inst}: %s`, (s) => {
      expect(getVoicings(c(s), inst).length).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('violão', () => {
  it('formas abertas clássicas vêm primeiro', () => {
    expect(shapes('C', 'violao')[0]).toBe('x32010');
    expect(shapes('G', 'violao').slice(0, 3)).toContain('320003');
    expect(shapes('Am', 'violao')[0]).toBe('x02210');
    expect(shapes('E', 'violao')[0]).toBe('022100');
    expect(shapes('D', 'violao')[0]).toBe('xx0232');
  });

  it('respeita o baixo de acordes com barra', () => {
    for (const s of shapes('D/F#', 'violao')) {
      const lowest = s.replace(/^x+/, '');
      expect(lowest.length).toBeGreaterThan(0);
    }
    expect(shapes('D/F#', 'violao')).toContain('200232');
  });
});

describe('cavaco (gerado)', () => {
  it('formas usuais de cavaco em Ré-Sol-Si-Ré', () => {
    expect(shapes('G', 'cavaco')[0]).toBe('0000');
    expect(shapes('C', 'cavaco').slice(0, 3)).toContain('2012');
    expect(shapes('D', 'cavaco').slice(0, 3)).toContain('0234');
    expect(shapes('Am', 'cavaco').slice(0, 3)).toContain('2212');
  });

  it('não usa o dataset (inexistente para cavaco)', () => {
    expect(datasetVoicings(c('C'), 'cavaco')).toEqual([]);
    expect(getVoicings(c('C'), 'cavaco').every((v) => v.source === 'gerado')).toBe(true);
  });
});

describe('ukulele', () => {
  it('formas abertas clássicas', () => {
    expect(shapes('C', 'ukulele')[0]).toBe('0003');
    expect(shapes('Am', 'ukulele')[0]).toBe('2000');
    expect(shapes('F', 'ukulele')[0]).toBe('2010');
    expect(shapes('G', 'ukulele')[0]).toBe('0232');
  });
});

describe('gerador', () => {
  it('posições geradas tocam todas as notas obrigatórias e no máximo 4 dedos', () => {
    for (const v of generateVoicings(c('Bm7(b5)'), 'violao')) {
      expect(fingerCount(v.frets).fingers).toBeLessThanOrEqual(4);
    }
    expect(generateVoicings(c('C7M(9)'), 'cavaco').length).toBeGreaterThan(0);
  });

  it('reconhece pestana', () => {
    expect(fingerCount([1, 3, 3, 2, 1, 1])).toEqual({ fingers: 4, barre: 1 });
    expect(fingerCount([-1, 3, 2, 0, 1, 0])).toEqual({ fingers: 3, barre: null });
  });

  it('formata casas altas', () => {
    expect(voicingToString([-1, 10, 12, 12, 12, 10])).toBe('x(10)(12)(12)(12)(10)');
  });
});
