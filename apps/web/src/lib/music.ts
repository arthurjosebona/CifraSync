/**
 * Cálculo do que exibir de uma música: tom efetivo, transposição e capo.
 * Usado pela tela da música e pelo palco.
 */
import {
  applyCapo,
  chordsUsed,
  detectKey,
  formatKey,
  getVoicings,
  parseChord,
  parseKey,
  parseSong,
  shapesKey,
  transposeDoc,
  transposeKey,
  type InstrumentId,
  type Key,
  type SongDoc,
  type Spelling,
  type Voicing,
} from '@cifrasync/core';
import type { Song } from '@cifrasync/shared';

export type CapoMode = 'shapes' | 'sounding';
export type SpellingChoice = 'auto' | Spelling;

export interface DisplayOptions {
  /** Semitons em relação ao tom escrito. */
  semitones: number;
  spelling: SpellingChoice;
  capoMode: CapoMode;
}

export interface DisplayResult {
  doc: SongDoc;
  /** Tom escrito (do cadastro ou detectado). */
  writtenKey: Key | null;
  /** Tom em que vai soar. */
  soundingKey: Key | null;
  /** Tom das formas tocadas com capo (quando capo > 0). */
  shapesKey: Key | null;
  keyWasDetected: boolean;
}

export function songDisplay(
  song: Pick<Song, 'content' | 'key' | 'capo'>,
  o: DisplayOptions,
): DisplayResult {
  const parsed = parseSong(song.content);
  const declared = song.key ? parseKey(song.key) : null;
  const detected = declared ? null : (detectKey(parsed)?.key ?? null);
  const writtenKey = declared ?? detected;
  const soundingKey = writtenKey ? transposeKey(writtenKey, o.semitones) : null;

  const transposed = transposeDoc(parsed, o.semitones, {
    ...(o.spelling !== 'auto' ? { spelling: o.spelling } : {}),
    ...(soundingKey && o.spelling === 'auto' ? { targetKey: soundingKey } : {}),
  });
  const doc =
    song.capo > 0 && o.capoMode === 'shapes'
      ? applyCapo(transposed, song.capo, 'shapes', soundingKey ?? undefined)
      : transposed;

  return {
    doc,
    writtenKey,
    soundingKey,
    shapesKey: soundingKey && song.capo > 0 ? shapesKey(soundingKey, song.capo) : null,
    keyWasDetected: !declared && !!detected,
  };
}

export function keyLabel(k: Key | null): string {
  return k ? formatKey(k) : '—';
}

/** Os 12 tons possíveis a partir do tom escrito, para escolher o destino diretamente. */
export function keyOptions(written: Key | null): { semitones: number; label: string }[] {
  if (!written) return [];
  return Array.from({ length: 12 }, (_, i) => {
    const n = i <= 6 ? i : i - 12; // de -5 a +6
    return { semitones: n, label: formatKey(transposeKey(written, n)) };
  }).sort((a, b) => a.semitones - b.semitones);
}

export interface ChordShape {
  name: string;
  voicings: Voicing[];
  /** Índice da posição a exibir (preferência salva ou 0). */
  index: number;
}

/** Acordes usados na música com as posições do instrumento escolhido. */
export function chordShapes(
  doc: SongDoc,
  instrument: InstrumentId,
  prefs: Record<string, number> = {},
): ChordShape[] {
  return chordsUsed(doc).flatMap((name) => {
    const chord = parseChord(name);
    if (!chord) return [];
    const voicings = getVoicings(chord, instrument);
    if (!voicings.length) return [];
    const pref = prefs[name] ?? 0;
    return [{ name, voicings, index: pref < voicings.length ? pref : 0 }];
  });
}
