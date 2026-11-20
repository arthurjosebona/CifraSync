import { formatChord, type ChordStyle, type ChordToken, type Segment } from '@cifrasync/core';

export interface Part {
  text: string;
  voice2?: boolean;
}

export interface Chunk {
  chord?: string;
  parts: Part[];
}

/** Recorta os segmentos da letra entre as colunas [from, to). */
function sliceSegments(segments: Segment[], from: number, to: number): Part[] {
  const out: Part[] = [];
  let pos = 0;
  for (const s of segments) {
    const start = pos;
    const end = pos + s.text.length;
    pos = end;
    const a = Math.max(from, start);
    const b = Math.min(to, end);
    if (b > a) out.push({ text: s.text.slice(a - start, b - start), voice2: s.voice2 });
  }
  return out;
}

export function tokenLabel(t: ChordToken, style: ChordStyle): string {
  return t.chord ? t.pre + formatChord(t.chord, style) + t.post : t.raw;
}

/**
 * Divide um par cifra+letra em pedaços: cada acorde fica acima do trecho de letra que começa
 * na sua coluna. Funciona com fonte proporcional (não depende de alinhar por espaços).
 */
export function pairChunks(chords: ChordToken[], lyric: Segment[], style: ChordStyle): Chunk[] {
  const len = lyric.reduce((n, s) => n + s.text.length, 0);
  // acordes depois do fim da letra: estica a letra com espaços para caberem
  const padded =
    chords.length && chords.at(-1)!.col >= len
      ? [...lyric, { text: ' '.repeat(chords.at(-1)!.col - len + 1) }]
      : lyric;
  const total = padded.reduce((n, s) => n + s.text.length, 0);
  const sorted = [...chords].sort((a, b) => a.col - b.col);
  const chunks: Chunk[] = [];
  if (!sorted.length || sorted[0]!.col > 0) {
    chunks.push({ parts: sliceSegments(padded, 0, sorted[0]?.col ?? total) });
  }
  sorted.forEach((t, i) => {
    const next = sorted[i + 1]?.col ?? total;
    chunks.push({ chord: tokenLabel(t, style), parts: sliceSegments(padded, t.col, next) });
  });
  return chunks;
}
