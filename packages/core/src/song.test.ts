import { describe, expect, it } from 'vitest';

import { classifyLine } from './lines';
import {
  chordsUsed,
  lyricText,
  parseSong,
  renderChordLine,
  serializeSong,
  type Block,
} from './song';

const SAMPLE = `Intro: G  D/F#  Em  C

[Primeira parte]
G               D/F#
Quando a noite chegar
Em              C
Eu vou cantar pra você

{refrao:1}
C        G         D
Ô ô ô, é o nosso som
{/refrao}

{voz2}
(é o nosso som)
{/voz2}
G        C
Tem ((uma frase)) com 2ª voz no meio

{tab:Solo}
e|-----0---3---|
B|---1---------|
G|-0-----------|
{/tab}

# lembrar: segurar o último acorde
{nota}Baixo entra só na 2ª volta{/nota}`;

function kinds(blocks: Block[]): string[] {
  return blocks.map((b) => (b.kind === 'lines' ? `lines:${b.style}` : b.kind));
}

describe('classifyLine', () => {
  it.each([
    ['', 'blank'],
    ['E  A  Bm  F#m', 'chords'],
    ['E agora, A casa caiu', 'lyric'],
    ['Intro: G D Em C', 'chords'],
    ['| G  D | Em  C | (x2)', 'chords'],
    ['(A7)', 'chords'],
    ['[Refrão]', 'header'],
    ['Refrão:', 'header'],
    ['Pré-refrão', 'header'],
    ['[G]', 'chords'],
    ['e|-----0---3---|', 'tab'],
    ['E|--3--2--0-----|', 'tab'],
    ['# anotação', 'comment'],
    ['{refrao:2}', 'directive'],
    ['A', 'chords'],
    ['A vida é bela', 'lyric'],
    ['Eu sei que vou te amar', 'lyric'],
    ['Do jeito que você é', 'lyric'],
    ['Am   F   C   G', 'chords'],
    ['C7M(9)    Dm7(11)   G7(13)', 'chords'],
  ])('%j → %s', (line, kind) => {
    expect(classifyLine(line)).toBe(kind);
  });
});

describe('parseSong', () => {
  const doc = parseSong(SAMPLE);

  it('monta os blocos na ordem', () => {
    expect(kinds(doc.blocks)).toEqual([
      'lines:normal',
      'section',
      'lines:normal',
      'lines:chorus1',
      'lines:normal',
      'lines:voice2',
      'lines:normal',
      'tab',
      'lines:normal',
      'comment',
      'comment',
    ]);
  });

  it('pareia cifra e letra mantendo colunas', () => {
    const b = doc.blocks[2] as Extract<Block, { kind: 'lines' }>;
    const pair = b.lines[0]!;
    expect(pair.kind).toBe('pair');
    if (pair.kind !== 'pair') return;
    expect(pair.chords.map((c) => [c.col, c.raw])).toEqual([
      [0, 'G'],
      [16, 'D/F#'],
    ]);
    expect(pair.lyric).toEqual([{ text: 'Quando a noite chegar' }]);
  });

  it('marca a 2ª voz dentro da linha e corrige a coluna das cifras', () => {
    const b = doc.blocks[6] as Extract<Block, { kind: 'lines' }>;
    const pair = b.lines[0]!;
    if (pair.kind !== 'pair') throw new Error('esperava par');
    expect(pair.lyric).toEqual([
      { text: 'Tem ' },
      { text: 'uma frase', voice2: true },
      { text: ' com 2ª voz no meio' },
    ]);
    // "C" estava na coluna 9 do texto cru, que tem "((" antes → coluna 7 na letra limpa
    expect(pair.chords.map((c) => c.col)).toEqual([0, 7]);
  });

  it('lê tablatura com título e anotações', () => {
    expect(doc.blocks[7]).toEqual({
      kind: 'tab',
      title: 'Solo',
      raw: ['e|-----0---3---|', 'B|---1---------|', 'G|-0-----------|'],
    });
    expect(doc.blocks[9]).toEqual({
      kind: 'comment',
      text: 'lembrar: segurar o último acorde',
      personal: true,
    });
    expect(doc.blocks[10]).toEqual({
      kind: 'comment',
      text: 'Baixo entra só na 2ª volta',
      personal: false,
    });
  });

  it('agrupa tablaturas sem marcação', () => {
    const d = parseSong('E|--0--|---3---|\nB|--1--|---0---|');
    expect(d.blocks).toEqual([{ kind: 'tab', raw: ['E|--0--|---3---|', 'B|--1--|---0---|'] }]);
  });

  it('lista acordes usados e a letra pura', () => {
    expect(chordsUsed(doc)).toEqual(['G', 'D/F#', 'Em', 'C', 'D']);
    expect(lyricText(doc)).toContain('Tem uma frase com 2ª voz no meio');
  });

  it('ida e volta sem perda', () => {
    const again = parseSong(serializeSong(doc));
    expect(again).toEqual(doc);
    expect(serializeSong(again)).toBe(serializeSong(doc));
  });

  it('refrão 2 e 3', () => {
    const d = parseSong('{refrao:2}\nA\n{/refrao}\n{refrao:3}\nB\n{/refrao}');
    expect(kinds(d.blocks)).toEqual(['lines:chorus2', 'lines:chorus3']);
  });
});

describe('renderChordLine', () => {
  it('empurra acordes que colidiriam', () => {
    const doc = parseSong('G D\nab cd');
    const b = doc.blocks[0] as Extract<Block, { kind: 'lines' }>;
    const pair = b.lines[0]!;
    if (pair.kind !== 'pair') throw new Error('esperava par');
    const grown = pair.chords.map((t) => ({ ...t, raw: t.raw + '#', chord: null }));
    expect(renderChordLine(grown)).toBe('G# D#');
  });
});
