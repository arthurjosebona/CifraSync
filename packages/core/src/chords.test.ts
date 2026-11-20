import { describe, expect, it } from 'vitest';

import { chordIntervals, formatChord, isChord, parseChord, type Chord } from './chords';

function p(s: string): Chord {
  const c = parseChord(s);
  if (!c) throw new Error(`não reconheceu ${s}`);
  return c;
}

/** Grafias reconhecidas, com o resumo esperado: qualidade|sétima|6|extensões|add|alterações|baixo */
const VALID: [string, string][] = [
  ['C', 'major||||||'],
  ['D', 'major||||||'],
  ['F#', 'major||||||'],
  ['Bb', 'major||||||'],
  ['Am', 'minor||||||'],
  ['Amin', 'minor||||||'],
  ['A-', 'minor||||||'],
  ['C#m', 'minor||||||'],
  ['Ebm', 'minor||||||'],
  ['CM', 'major||||||'],
  ['Cmaj', 'major||||||'],
  ['G7', 'major|7|||||'],
  ['Em7', 'minor|7|||||'],
  ['A-7', 'minor|7|||||'],
  ['C7M', 'major|7M|||||'],
  ['Cmaj7', 'major|7M|||||'],
  ['CM7', 'major|7M|||||'],
  ['C7+', 'major|7M|||||'],
  ['CΔ', 'major|7M|||||'],
  ['CΔ7', 'major|7M|||||'],
  ['Cm7M', 'minor|7M|||||'],
  ['CmM7', 'minor|7M|||||'],
  ['Cm(7M)', 'minor|7M|||||'],
  ['Cm(maj7)', 'minor|7M|||||'],
  ['Cmmaj7', 'minor|7M|||||'],
  ['B°', 'dim||||||'],
  ['Bº', 'dim||||||'],
  ['Bdim', 'dim||||||'],
  ['B°7', 'dim|dim7|||||'],
  ['Bdim7', 'dim|dim7|||||'],
  ['Bm7(b5)', 'minor|7||||b5|'],
  ['Bm7b5', 'minor|7||||b5|'],
  ['Bm7(-5)', 'minor|7||||b5|'],
  ['Bø', 'minor|7||||b5|'],
  ['Bø7', 'minor|7||||b5|'],
  ['C+', 'aug||||||'],
  ['Caug', 'aug||||||'],
  ['C7(#5)', 'major|7||||#5|'],
  ['C7#5', 'major|7||||#5|'],
  ['C7+5', 'major|7||||#5|'],
  ['Csus4', 'sus4||||||'],
  ['Csus', 'sus4||||||'],
  ['C4', 'sus4||||||'],
  ['Csus2', 'sus2||||||'],
  ['C2', 'sus2||||||'],
  ['A7sus4', 'sus4|7|||||'],
  ['A7(4)', 'sus4|7|||||'],
  ['A7/4', 'sus4|7|||||'],
  ['C5', 'power||||||'],
  ['Bb5', 'power||||||'],
  ['C6', 'major||6||||'],
  ['Am6', 'minor||6||||'],
  ['C6/9', 'major||6||9||'],
  ['C69', 'major||6||9||'],
  ['C6(9)', 'major||6||9||'],
  ['Cadd9', 'major||||9||'],
  ['Cadd2', 'major||||9||'],
  ['C(9)', 'major||||9||'],
  ['Am(9)', 'minor||||9||'],
  ['Cadd11', 'major||||11||'],
  ['C9', 'major|7||9|||'],
  ['C11', 'major|7||11|||'],
  ['C13', 'major|7||13|||'],
  ['Cmaj9', 'major|7M||9|||'],
  ['C7(9)', 'major|7||9|||'],
  ['C7M(9)', 'major|7M||9|||'],
  ['Am7(9)', 'minor|7||9|||'],
  ['Am7(11)', 'minor|7||11|||'],
  ['C7(9,13)', 'major|7||9,13|||'],
  ['C7(9/13)', 'major|7||9,13|||'],
  ['C7(b9)', 'major|7||||b9|'],
  ['C7b9', 'major|7||||b9|'],
  ['E7(#9)', 'major|7||||#9|'],
  ['E7#9', 'major|7||||#9|'],
  ['C7(#11)', 'major|7||||#11|'],
  ['C7M(#11)', 'major|7M||||#11|'],
  ['C7(b13)', 'major|7||||b13|'],
  ['G7(b9,b13)', 'major|7||||b9,b13|'],
  ['D/F#', 'major||||||F#'],
  ['C/E', 'major||||||E'],
  ['Am/G', 'minor||||||G'],
  ['Em7/D', 'minor|7|||||D'],
  ['G/B', 'major||||||B'],
  ['F7M/A', 'major|7M|||||A'],
  ['C9/E', 'major|7||9|||E'],
  ['Ab/Eb', 'major||||||Eb'],
  ['F♯m', 'minor||||||'],
  ['B♭7', 'major|7|||||'],
];

function summary(c: Chord): string {
  return [
    c.quality,
    c.seventh ?? '',
    c.sixth ? '6' : '',
    [...c.extensions].sort((a, b) => a - b).join(','),
    [...c.add].sort((a, b) => a - b).join(','),
    c.alterations.join(','),
    c.bass?.name ?? '',
  ].join('|');
}

describe('parseChord — grafias válidas', () => {
  it(`reconhece ${VALID.length} grafias`, () => {
    expect(VALID.length).toBeGreaterThanOrEqual(80);
  });

  it.each(VALID)('%s', (s, expected) => {
    expect(summary(p(s))).toBe(expected);
  });
});

describe('parseChord — o que não é acorde', () => {
  it.each([
    'Agora',
    'Era',
    'Eu',
    'Do',
    'Bem',
    'Fim',
    'Casa',
    'Amor',
    'Deus',
    'Grande',
    'H',
    'c',
    'am',
    '',
    'C7x',
    'Cm(9',
    'C()',
    'C/H',
    'Cmaj7maj7x',
    'Gente',
  ])('%s', (s) => {
    expect(isChord(s)).toBe(false);
  });
});

describe('formatChord', () => {
  it('mantém o sufixo original', () => {
    expect(formatChord(p('C7M(9)'))).toBe('C7M(9)');
    expect(formatChord(p('D/F#'))).toBe('D/F#');
    expect(formatChord(p('B♭7'))).toBe('Bb7');
  });

  it.each([
    ['Cmaj7', 'C7M', 'Cmaj7'],
    ['Bm7b5', 'Bm7(b5)', 'Bm7b5'],
    ['Cmaj9', 'C7M(9)', 'Cmaj9'],
    ['C9', 'C7(9)', 'C9'],
    ['Cadd9', 'C(9)', 'Cadd9'],
    ['Csus4', 'C4', 'Csus4'],
    ['A7sus4', 'A7(4)', 'A7sus4'],
    ['Bdim', 'B°', 'Bdim'],
    ['Caug', 'C+', 'Caug'],
    ['G7(b9)', 'G7(b9)', 'G7b9'],
    ['Em7/D', 'Em7/D', 'Em7/D'],
    ['C6/9', 'C6(9)', 'C6/9'],
    ['Am', 'Am', 'Am'],
  ])('%s → br %s, intl %s', (s, br, intl) => {
    expect(formatChord(p(s), 'br')).toBe(br);
    expect(formatChord(p(s), 'intl')).toBe(intl);
  });
});

describe('chordIntervals', () => {
  const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

  it.each([
    ['C', [0, 4], [7]],
    ['Am', [0, 3], [7]],
    ['G7', [0, 4, 10], [7]],
    ['C7M', [0, 4, 11], [7]],
    ['Bm7(b5)', [0, 3, 6, 10], []],
    ['B°7', [0, 3, 6, 9], []],
    ['Csus4', [0, 5], [7]],
    ['C5', [0, 7], []],
    ['C(9)', [0, 2, 4], [7]],
    ['C13', [0, 4, 9, 10], [7]],
    ['C7(9,13)', [0, 4, 9, 10], [2, 7]],
    ['C+', [0, 4, 8], []],
  ])('%s', (s, req, opt) => {
    const r = chordIntervals(p(s));
    expect(sorted(r.required)).toEqual(req);
    expect(sorted(r.optional)).toEqual(opt);
  });
});
