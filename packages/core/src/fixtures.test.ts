import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { autoFormat } from './format';
import { classifyLine, type LineKind } from './lines';
import { parseSong, serializeSong } from './song';

const DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));

const LABEL: Record<string, LineKind> = {
  C: 'chords',
  L: 'lyric',
  T: 'tab',
  H: 'header',
  M: 'comment',
  D: 'directive',
  B: 'blank',
};

interface Fixture {
  name: string;
  lines: { expected: LineKind; text: string }[];
}

function load(): Fixture[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .map((f) => ({
      name: f,
      lines: readFileSync(join(DIR, f), 'utf8')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .filter((l) => l !== '')
        .map((l) => {
          const label = l.slice(0, 1);
          const expected = LABEL[label];
          if (!expected || l[1] !== '|') throw new Error(`${f}: rótulo inválido em "${l}"`);
          return { expected, text: l.slice(2) };
        }),
    }));
}

const fixtures = load();

describe('cifras de teste', () => {
  it('tem pelo menos 30 cifras', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(30);
  });

  describe.each(fixtures.map((f) => [f.name, f] as const))('%s', (_name, fx) => {
    it('classifica 100% das linhas', () => {
      const got = fx.lines.map((l) => `${classifyLine(l.text)} ← ${l.text}`);
      const want = fx.lines.map((l) => `${l.expected} ← ${l.text}`);
      expect(got).toEqual(want);
    });

    it('formata e faz ida e volta pelo AST sem perda', () => {
      const { text } = autoFormat(fx.lines.map((l) => l.text).join('\n'));
      const doc = parseSong(text);
      expect(parseSong(serializeSong(doc))).toEqual(doc);
    });
  });
});
