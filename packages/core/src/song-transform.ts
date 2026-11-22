/**
 * Transformações musicais sobre o documento: transposição, capotraste e detecção de tom.
 */
import type { Chord } from './chords';
import type { ChordToken } from './lines';
import { keyFromPc, mod12, type Key } from './notes';
import { chordTokens, layoutChordTokens, type Line, type SongDoc } from './song';
import { transposeChord, type TransposeOptions } from './transpose';

function mapTokens(tokens: ChordToken[], fn: (c: Chord) => Chord): ChordToken[] {
  const mapped = tokens.map((t) => (t.chord ? { ...t, chord: fn(t.chord) } : t));
  return layoutChordTokens(mapped);
}

function mapLine(line: Line, fn: (c: Chord) => Chord): Line {
  if (line.kind === 'pair') return { ...line, chords: mapTokens(line.chords, fn) };
  if (line.kind === 'chords') return { ...line, chords: mapTokens(line.chords, fn) };
  return line;
}

/** Aplica uma função a todos os acordes (tablaturas e letra ficam intactas). */
export function mapChords(doc: SongDoc, fn: (c: Chord) => Chord): SongDoc {
  return {
    blocks: doc.blocks.map((b) =>
      b.kind === 'lines' ? { ...b, lines: b.lines.map((l) => mapLine(l, fn)) } : b,
    ),
  };
}

/**
 * Transpõe a música. Acordes que crescem ("G" → "G#") empurram os seguintes para não colar;
 * tablaturas nunca são transpostas.
 */
export function transposeDoc(
  doc: SongDoc,
  semitones: number,
  opts: TransposeOptions = {},
): SongDoc {
  if (mod12(semitones) === 0 && !opts.spelling && !opts.targetKey) return doc;
  return mapChords(doc, (c) => transposeChord(c, semitones, opts));
}

export function hasTabs(doc: SongDoc): boolean {
  return doc.blocks.some((b) => b.kind === 'tab');
}

export type CapoMode = 'shapes' | 'sounding';

/**
 * Capotraste: em `shapes` mostra as formas que se tocam com o capo (tom − capo);
 * em `sounding` mostra os acordes como soam.
 * `soundingKey` (tom real da música) define a grafia das formas.
 */
export function applyCapo(doc: SongDoc, capo: number, mode: CapoMode, soundingKey?: Key): SongDoc {
  if (mode === 'sounding' || mod12(capo) === 0) return doc;
  const opts: TransposeOptions = soundingKey
    ? { targetKey: keyFromPc(soundingKey.tonic.pc - capo, soundingKey.minor) }
    : {};
  return transposeDoc(doc, -capo, opts);
}

/** Tom das formas com capo: A com capo 2 → G. */
export function shapesKey(soundingKey: Key, capo: number): Key {
  return keyFromPc(soundingKey.tonic.pc - capo, soundingKey.minor);
}

type Family = 'maj' | 'min' | 'dim';

function family(c: Chord): Family | null {
  switch (c.quality) {
    case 'major':
    case 'aug':
    case 'sus2':
    case 'sus4':
    case 'power':
      return 'maj';
    case 'minor':
      return c.alterations.includes('b5') ? 'dim' : 'min';
    case 'dim':
      return 'dim';
  }
}

/** Graus diatônicos de um tom maior: intervalo da fundamental → família esperada. */
const MAJOR_DEGREES: [number, Family][] = [
  [0, 'maj'],
  [2, 'min'],
  [4, 'min'],
  [5, 'maj'],
  [7, 'maj'],
  [9, 'min'],
  [11, 'dim'],
];
/** Menor (natural + V maior da harmônica). */
const MINOR_DEGREES: [number, Family][] = [
  [0, 'min'],
  [2, 'dim'],
  [3, 'maj'],
  [5, 'min'],
  [7, 'maj'],
  [7, 'min'],
  [8, 'maj'],
  [10, 'maj'],
];

export interface KeyGuess {
  key: Key;
  /** 0–1: fração das ocorrências de acordes que são diatônicas ao tom, com bônus. */
  confidence: number;
}

/**
 * Estima o tom pelo histograma de acordes diatônicos e pelo primeiro/último acorde.
 * Retorna null se não houver acordes.
 */
export function detectKey(doc: SongDoc): KeyGuess | null {
  const chords = [...chordTokens(doc)].map((t) => t.chord).filter((c): c is Chord => !!c);
  if (chords.length === 0) return null;
  const first = chords[0]!;
  const last = chords[chords.length - 1]!;

  // Acorde de sétima dominante (ex.: B7) quase sempre é o V do tom (E), não o repouso:
  // reforça o tom uma quarta acima e não conta como tônica no começo nem no fim.
  const isDominant = (c: Chord) => c.quality === 'major' && c.seventh === '7';
  const restsOn = (c: Chord, tonic: number, fam: Family) =>
    c.root.pc === tonic && family(c) === fam && !isDominant(c);

  let best: { key: Key; score: number } | null = null;
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const minor of [false, true]) {
      const degrees = minor ? MINOR_DEGREES : MAJOR_DEGREES;
      let score = 0;
      for (const c of chords) {
        const f = family(c);
        const iv = mod12(c.root.pc - tonic);
        if (degrees.some(([d, fam]) => d === iv && fam === f)) score += 1;
        if (isDominant(c) && iv === 7) score += 0.5;
      }
      const tonicFamily: Family = minor ? 'min' : 'maj';
      if (restsOn(first, tonic, tonicFamily)) score += chords.length * 0.15;
      if (restsOn(last, tonic, tonicFamily)) score += chords.length * 0.25;
      if (!best || score > best.score) best = { key: keyFromPc(tonic, minor), score };
    }
  }
  const confidence = Math.min(1, best!.score / (chords.length * 1.4));
  return { key: best!.key, confidence: Math.round(confidence * 100) / 100 };
}
