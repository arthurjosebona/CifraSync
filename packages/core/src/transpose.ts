/**
 * Transposição de acordes: muda fundamental e baixo, preserva o sufixo.
 */
import type { Chord } from './chords';
import { noteFromPc, spellingForKey, type Key, type Spelling } from './notes';

export interface TransposeOptions {
  /**
   * Grafia dos acordes resultantes. Se omitida, usa a grafia do `targetKey`;
   * sem tom de destino, usa a grafia neutra (C#, Eb, F#, Ab, Bb).
   */
  spelling?: Spelling;
  /** Tom de destino — define a grafia quando `spelling` não é informado. */
  targetKey?: Key;
}

export function resolveSpelling(opts: TransposeOptions = {}): Spelling {
  if (opts.spelling) return opts.spelling;
  if (opts.targetKey) return spellingForKey(opts.targetKey);
  return 'default';
}

export function transposeChord(
  chord: Chord,
  semitones: number,
  opts: TransposeOptions = {},
): Chord {
  const spelling = resolveSpelling(opts);
  const out: Chord = {
    ...chord,
    root: noteFromPc(chord.root.pc + semitones, spelling),
    extensions: [...chord.extensions],
    add: [...chord.add],
    alterations: [...chord.alterations],
  };
  if (chord.bass) out.bass = noteFromPc(chord.bass.pc + semitones, spelling);
  return out;
}
