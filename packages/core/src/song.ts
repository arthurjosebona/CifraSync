/**
 * Documento da música (AST): parse do texto cifrado com marcações e serialização de volta.
 *
 * Formato do texto: cifra na linha de cima, letra embaixo, mais marcações de bloco —
 * {refrao:N}…{/refrao}, {voz2}…{/voz2}, {nota}…{/nota}, {tab[:título]}…{/tab},
 * "((trecho))" para 2ª voz dentro da linha e "# texto" para anotação pessoal.
 * Ver docs/contexto/dominio-musical.md.
 */
import { formatChord } from './chords';
import { analyzeChordLine, classifyLine, headerTitle, type ChordToken } from './lines';

export type LineStyle = 'normal' | 'chorus1' | 'chorus2' | 'chorus3' | 'voice2' | 'note';

export interface Segment {
  text: string;
  voice2?: boolean;
}

export type Line =
  | { kind: 'pair'; chords: ChordToken[]; lyric: Segment[] }
  | { kind: 'chords'; chords: ChordToken[] }
  | { kind: 'lyric'; lyric: Segment[] }
  | { kind: 'blank' };

export type Block =
  | { kind: 'section'; title: string }
  | { kind: 'lines'; style: LineStyle; lines: Line[] }
  | { kind: 'tab'; title?: string; raw: string[] }
  | { kind: 'comment'; text: string; personal: boolean };

export interface SongDoc {
  blocks: Block[];
}

const DIRECTIVE_RE = /^\s*\{(\/?)([a-zA-Z0-9_-]+)(?::\s*([^}]*))?\}\s*$/;
const INLINE_NOTE_RE = /^\s*\{nota\}(.*)\{\/nota\}\s*$/;

/** Texto exibido de um token de cifra (acordes reescritos a partir do modelo). */
export function tokenText(t: ChordToken): string {
  return t.chord ? t.pre + formatChord(t.chord) + t.post : t.raw;
}

/**
 * Recalcula as colunas para que nenhum token encoste no anterior
 * (necessário quando um acorde cresce na transposição: G → G#).
 */
export function layoutChordTokens(tokens: ChordToken[]): ChordToken[] {
  const out: ChordToken[] = [];
  let end = -1;
  for (const t of [...tokens].sort((a, b) => a.col - b.col)) {
    const col = end < 0 ? t.col : Math.max(t.col, end + 1);
    const text = tokenText(t);
    out.push({ ...t, col, raw: text });
    end = col + text.length;
  }
  return out;
}

export function renderChordLine(tokens: ChordToken[]): string {
  let s = '';
  for (const t of layoutChordTokens(tokens)) s = s.padEnd(t.col) + t.raw;
  return s;
}

/** Remove "((" e "))" da letra; devolve segmentos e o mapa coluna crua → coluna limpa. */
function parseLyric(raw: string): { segments: Segment[]; map: number[] } {
  const segments: Segment[] = [];
  const map: number[] = [];
  let buf = '';
  let voice2 = false;
  let clean = 0;
  const flush = () => {
    if (buf) segments.push(voice2 ? { text: buf, voice2: true } : { text: buf });
    buf = '';
  };
  for (let i = 0; i < raw.length; i++) {
    if (raw.startsWith('((', i) && !voice2) {
      flush();
      voice2 = true;
      map.push(clean, clean);
      i++;
      continue;
    }
    if (raw.startsWith('))', i) && voice2) {
      flush();
      voice2 = false;
      map.push(clean, clean);
      i++;
      continue;
    }
    map.push(clean);
    buf += raw[i];
    clean++;
  }
  flush();
  return { segments, map };
}

function mapCol(col: number, map: number[], rawLen: number, cleanLen: number): number {
  if (col < map.length) return map[col]!;
  return col - (rawLen - cleanLen);
}

function chorusStyle(arg: string | undefined): LineStyle {
  const n = Number(arg ?? '1');
  return n === 2 ? 'chorus2' : n === 3 ? 'chorus3' : 'chorus1';
}

export function parseSong(text: string): SongDoc {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let style: LineStyle = 'normal';
  let cur: Extract<Block, { kind: 'lines' }> | null = null;

  const push = (line: Line) => {
    if (!cur || cur.style !== style) {
      cur = { kind: 'lines', style, lines: [] };
      blocks.push(cur);
    }
    cur.lines.push(line);
  };
  const close = () => {
    cur = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!.replace(/\s+$/, '');

    const inlineNote = INLINE_NOTE_RE.exec(raw);
    if (inlineNote) {
      blocks.push({ kind: 'comment', text: inlineNote[1]!.trim(), personal: false });
      close();
      continue;
    }

    const d = DIRECTIVE_RE.exec(raw);
    if (d) {
      const closing = d[1] === '/';
      const name = d[2]!.toLowerCase();
      const arg = d[3]?.trim();
      if (name === 'tab' && !closing) {
        const tabLines: string[] = [];
        i++;
        while (i < lines.length && !/^\s*\{\/tab\}\s*$/.test(lines[i]!)) {
          tabLines.push(lines[i]!.replace(/\s+$/, ''));
          i++;
        }
        blocks.push(
          arg ? { kind: 'tab', title: arg, raw: tabLines } : { kind: 'tab', raw: tabLines },
        );
        close();
        continue;
      }
      if (['refrao', 'voz2', 'nota', 'tab'].includes(name)) {
        if (closing) style = 'normal';
        else if (name === 'refrao') style = chorusStyle(arg);
        else if (name === 'voz2') style = 'voice2';
        else if (name === 'nota') style = 'note';
        close();
        continue;
      }
    }

    const kind = classifyLine(raw);
    switch (kind) {
      case 'blank':
        push({ kind: 'blank' });
        break;
      case 'comment':
        blocks.push({ kind: 'comment', text: raw.replace(/^\s*#\s?/, ''), personal: true });
        close();
        break;
      case 'header':
        blocks.push({ kind: 'section', title: headerTitle(raw) });
        close();
        break;
      case 'tab': {
        const tabLines = [raw];
        while (i + 1 < lines.length && classifyLine(lines[i + 1]!) === 'tab') {
          tabLines.push(lines[++i]!.replace(/\s+$/, ''));
        }
        blocks.push({ kind: 'tab', raw: tabLines });
        close();
        break;
      }
      case 'chords': {
        const { tokens } = analyzeChordLine(raw);
        const next = lines[i + 1];
        if (next !== undefined && classifyLine(next) === 'lyric') {
          const lyricRaw = next.replace(/\s+$/, '');
          const { segments, map } = parseLyric(lyricRaw);
          const cleanLen = segments.reduce((n, s) => n + s.text.length, 0);
          const chords = tokens.map((t) => ({
            ...t,
            col: mapCol(t.col, map, lyricRaw.length, cleanLen),
          }));
          push({ kind: 'pair', chords, lyric: segments });
          i++;
        } else {
          push({ kind: 'chords', chords: tokens });
        }
        break;
      }
      case 'directive':
      case 'lyric':
        push({ kind: 'lyric', lyric: parseLyric(raw).segments });
        break;
    }
  }
  return { blocks };
}

/** Monta a letra com "((…))" e devolve o mapa coluna limpa → coluna crua. */
function renderLyric(segments: Segment[]): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  for (const s of segments) {
    if (s.voice2) text += '((';
    for (const ch of s.text) {
      map.push(text.length);
      text += ch;
    }
    if (s.voice2) text += '))';
  }
  return { text, map };
}

function serializeLine(line: Line): string[] {
  switch (line.kind) {
    case 'blank':
      return [''];
    case 'chords':
      return [renderChordLine(line.chords)];
    case 'lyric':
      return [renderLyric(line.lyric).text];
    case 'pair': {
      const { text, map } = renderLyric(line.lyric);
      const extra = text.length - map.length;
      const chords = line.chords.map((t) => ({
        ...t,
        col: t.col < map.length ? map[t.col]! : t.col + extra,
      }));
      return [renderChordLine(chords), text];
    }
  }
}

const OPEN: Record<Exclude<LineStyle, 'normal'>, [string, string]> = {
  chorus1: ['{refrao:1}', '{/refrao}'],
  chorus2: ['{refrao:2}', '{/refrao}'],
  chorus3: ['{refrao:3}', '{/refrao}'],
  voice2: ['{voz2}', '{/voz2}'],
  note: ['{nota}', '{/nota}'],
};

export function serializeSong(doc: SongDoc): string {
  const out: string[] = [];
  for (const b of doc.blocks) {
    switch (b.kind) {
      case 'section':
        out.push(`[${b.title}]`);
        break;
      case 'comment':
        out.push(b.personal ? `# ${b.text}` : `{nota}${b.text}{/nota}`);
        break;
      case 'tab':
        out.push(b.title ? `{tab:${b.title}}` : '{tab}', ...b.raw, '{/tab}');
        break;
      case 'lines': {
        const body = b.lines.flatMap(serializeLine);
        if (b.style === 'normal') out.push(...body);
        else out.push(OPEN[b.style][0], ...body, OPEN[b.style][1]);
        break;
      }
    }
  }
  return out.join('\n');
}

/** Todos os tokens de cifra do documento, em ordem. */
export function* chordTokens(doc: SongDoc): Generator<ChordToken> {
  for (const b of doc.blocks) {
    if (b.kind !== 'lines') continue;
    for (const l of b.lines) if (l.kind === 'pair' || l.kind === 'chords') yield* l.chords;
  }
}

/** Acordes usados na música, sem repetição, na ordem em que aparecem. */
export function chordsUsed(doc: SongDoc): string[] {
  const seen = new Set<string>();
  for (const t of chordTokens(doc)) if (t.chord) seen.add(formatChord(t.chord));
  return [...seen];
}

/** Texto puro da letra (sem cifras, tabs e marcações) — usado na busca. */
export function lyricText(doc: SongDoc): string {
  const out: string[] = [];
  for (const b of doc.blocks) {
    if (b.kind !== 'lines') continue;
    for (const l of b.lines) {
      if (l.kind === 'pair' || l.kind === 'lyric') out.push(l.lyric.map((s) => s.text).join(''));
    }
  }
  return out.join('\n');
}
