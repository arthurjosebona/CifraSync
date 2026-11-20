/**
 * Notas, classes de altura (0–11) e grafia com sustenido/bemol.
 */

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Accidental = '' | '#' | 'b';

export interface Note {
  /** Classe de altura: 0 = C … 11 = B. */
  pc: number;
  /** Grafia, ex.: "F#", "Bb". */
  name: string;
}

const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Grafia usada quando o tom de destino tem sustenidos. */
export const SHARP_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;
/** Grafia usada quando o tom de destino tem bemóis. */
export const FLAT_NAMES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;
/** Grafia neutra (sem tom conhecido): a forma mais comum em cifras. */
export const DEFAULT_NAMES = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const;

export type Spelling = 'sharps' | 'flats' | 'default';

/** Normaliza símbolos tipográficos: ♯ → #, ♭ → b. */
export function normalizeAccidentals(s: string): string {
  return s.replace(/♯/g, '#').replace(/♭/g, 'b');
}

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** Lê uma nota no início da string ("F#m" → F#). Retorna a nota e quantos caracteres consumiu. */
export function readNote(s: string): { note: Note; length: number } | null {
  const m = /^([A-G])([#b]?)/.exec(normalizeAccidentals(s));
  if (!m) return null;
  const letter = m[1] as Letter;
  const acc = (m[2] ?? '') as Accidental;
  const pc = mod12(LETTER_PC[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0));
  return { note: { pc, name: letter + acc }, length: m[0].length };
}

export function parseNote(s: string): Note | null {
  const r = readNote(s);
  return r && r.length === normalizeAccidentals(s).length ? r.note : null;
}

export function noteName(pc: number, spelling: Spelling = 'default'): string {
  const table =
    spelling === 'sharps' ? SHARP_NAMES : spelling === 'flats' ? FLAT_NAMES : DEFAULT_NAMES;
  return table[mod12(pc)]!;
}

export function noteFromPc(pc: number, spelling: Spelling = 'default'): Note {
  return { pc: mod12(pc), name: noteName(pc, spelling) };
}

/** Intervalo ascendente em semitons de `from` até `to` (0–11). */
export function interval(from: number, to: number): number {
  return mod12(to - from);
}

/** Tons maiores escritos com bemóis (e os relativos menores). */
const FLAT_MAJOR = new Set([5, 10, 3, 8, 1, 6]); // F, Bb, Eb, Ab, Db, Gb
const FLAT_MINOR = new Set([2, 7, 0, 5, 10, 3]); // Dm, Gm, Cm, Fm, Bbm, Ebm
const NEUTRAL_MAJOR = new Set([0]); // C
const NEUTRAL_MINOR = new Set([9]); // Am

export interface Key {
  tonic: Note;
  minor: boolean;
}

/** Lê um tom: "A", "F#m", "Bb", "Ebm". */
export function parseKey(s: string): Key | null {
  const r = readNote(s.trim());
  if (!r) return null;
  const rest = normalizeAccidentals(s.trim()).slice(r.length);
  if (rest === '' || rest === 'M' || rest === 'maj') return { tonic: r.note, minor: false };
  if (rest === 'm' || rest === 'min' || rest === '-') return { tonic: r.note, minor: true };
  return null;
}

export function formatKey(key: Key): string {
  return key.tonic.name + (key.minor ? 'm' : '');
}

/** Grafia que um tom pede para os acordes. */
export function spellingForKey(key: Key): Spelling {
  const pc = key.tonic.pc;
  if (key.minor) {
    if (NEUTRAL_MINOR.has(pc)) return 'default';
    return FLAT_MINOR.has(pc) ? 'flats' : 'sharps';
  }
  if (NEUTRAL_MAJOR.has(pc)) return 'default';
  return FLAT_MAJOR.has(pc) ? 'flats' : 'sharps';
}

/** Nome mais usual de um tom (Bb em vez de A#, F# em vez de Gb, C#m em vez de Dbm). */
export function keyFromPc(pc: number, minor: boolean): Key {
  const p = mod12(pc);
  const flatTonic = minor ? FLAT_MINOR.has(p) : FLAT_MAJOR.has(p) && p !== 6; // Gb → F#
  const name = flatTonic ? FLAT_NAMES[p]! : SHARP_NAMES[p]!;
  return { tonic: { pc: p, name }, minor };
}

export function transposeKey(key: Key, semitones: number): Key {
  return keyFromPc(key.tonic.pc + semitones, key.minor);
}
