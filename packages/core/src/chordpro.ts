/**
 * Conversão de e para ChordPro (.cho), para importar/exportar músicas (RF-13).
 *
 * Mapeamento:
 *   refrão 1/2/3  ↔ {start_of_chorus[: Refrão N]} … {end_of_chorus}
 *   tablatura     ↔ {start_of_tab[: título]} … {end_of_tab}
 *   2ª voz        ↔ {start_of_voz2} … {end_of_voz2}   (seção personalizada)
 *   nota (bloco)  ↔ {start_of_nota} … {end_of_nota}   (seção personalizada)
 *   seção [Nome]  ↔ {comment: Nome}
 *   nota (linha)  ↔ {comment_italic: texto}
 *   anotação "#"  ↔ "# texto" (comentário do ChordPro)
 */
import { formatChord } from './chords';
import { splitInlineChords } from './format';
import { analyzeChordLine, type ChordToken } from './lines';
import { tokenText, type Line, type LineStyle, type Segment, type SongDoc } from './song';

export interface SongMeta {
  title?: string;
  artist?: string;
  key?: string;
  capo?: number;
}

function lyricString(segments: Segment[]): string {
  return segments.map((s) => (s.voice2 ? `((${s.text}))` : s.text)).join('');
}

function inlinePair(chords: ChordToken[], segments: Segment[]): string {
  const lyric = segments.map((s) => s.text).join('');
  // posição de cada acorde na letra limpa; inserimos de trás para frente
  const marks = chords
    .filter((t) => t.chord)
    .map((t) => ({ col: t.col, text: `[${formatChord(t.chord!)}]` }))
    .sort((a, b) => b.col - a.col);
  // reconstruímos a letra com "((…))" mantendo o mapa de colunas
  let out = '';
  const pos: number[] = [];
  for (const s of segments) {
    if (s.voice2) out += '((';
    for (const ch of s.text) {
      pos.push(out.length);
      out += ch;
    }
    if (s.voice2) out += '))';
  }
  const padded = out.padEnd(Math.max(out.length, ...marks.map((m) => m.col)));
  let result = padded;
  for (const m of marks) {
    const at = m.col < pos.length ? pos[m.col]! : m.col + (out.length - lyric.length);
    result = result.slice(0, at) + m.text + result.slice(at);
  }
  return result.replace(/\s+$/, '');
}

/**
 * Linha só de cifra em ChordPro. Cada "[X]" ocupa a mesma largura que "X  " ocupa ao importar,
 * então manter a coluna original aqui preserva o alinhamento na ida e volta.
 */
function chordsOnly(chords: ChordToken[]): string {
  let s = '';
  let lastWasText = false;
  for (const t of [...chords].sort((a, b) => a.col - b.col)) {
    const text = t.chord ? `[${formatChord(t.chord)}]` : tokenText(t);
    const gap = s.length && (lastWasText || !t.chord) ? 1 : 0;
    s = s.padEnd(Math.max(t.col, s.length + gap)) + text;
    lastWasText = !t.chord;
  }
  return s;
}

function lineToChordPro(line: Line): string {
  switch (line.kind) {
    case 'blank':
      return '';
    case 'lyric':
      return lyricString(line.lyric);
    case 'chords':
      return chordsOnly(line.chords);
    case 'pair':
      return inlinePair(line.chords, line.lyric);
  }
}

const SECTION_OPEN: Record<Exclude<LineStyle, 'normal'>, [string, string]> = {
  chorus1: ['{start_of_chorus}', '{end_of_chorus}'],
  chorus2: ['{start_of_chorus: Refrão 2}', '{end_of_chorus}'],
  chorus3: ['{start_of_chorus: Refrão 3}', '{end_of_chorus}'],
  voice2: ['{start_of_voz2}', '{end_of_voz2}'],
  note: ['{start_of_nota}', '{end_of_nota}'],
};

export function toChordPro(doc: SongDoc, meta: SongMeta = {}): string {
  const out: string[] = [];
  if (meta.title) out.push(`{title: ${meta.title}}`);
  if (meta.artist) out.push(`{artist: ${meta.artist}}`);
  if (meta.key) out.push(`{key: ${meta.key}}`);
  if (meta.capo) out.push(`{capo: ${meta.capo}}`);
  if (out.length) out.push('');
  for (const b of doc.blocks) {
    switch (b.kind) {
      case 'section':
        out.push(`{comment: ${b.title}}`);
        break;
      case 'comment':
        out.push(b.personal ? `# ${b.text}` : `{comment_italic: ${b.text}}`);
        break;
      case 'tab':
        out.push(
          b.title ? `{start_of_tab: ${b.title}}` : '{start_of_tab}',
          ...b.raw,
          '{end_of_tab}',
        );
        break;
      case 'lines': {
        const body = b.lines.map(lineToChordPro);
        if (b.style === 'normal') out.push(...body);
        else out.push(SECTION_OPEN[b.style][0], ...body, SECTION_OPEN[b.style][1]);
        break;
      }
    }
  }
  return out.join('\n');
}

const DIRECTIVE_RE = /^\s*\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*(.*?))?\s*\}\s*$/;

/** Converte ChordPro no formato do CifraSync (cifra em cima + marcações). */
export function fromChordPro(text: string): { text: string; meta: SongMeta } {
  const meta: SongMeta = {};
  const out: string[] = [];
  let inTab = false;
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const d = DIRECTIVE_RE.exec(line);
    if (d) {
      const name = d[1]!.toLowerCase();
      const arg = d[2]?.trim() ?? '';
      switch (name) {
        case 'title':
        case 't':
          meta.title = arg;
          break;
        case 'artist':
        case 'subtitle':
        case 'st':
          meta.artist ??= arg;
          break;
        case 'key':
          meta.key = arg;
          break;
        case 'capo': {
          const n = Number(arg);
          if (Number.isFinite(n)) meta.capo = n;
          break;
        }
        case 'start_of_chorus':
        case 'soc': {
          const n = /(\d)/.exec(arg)?.[1];
          out.push(`{refrao:${n === '2' || n === '3' ? n : '1'}}`);
          break;
        }
        case 'end_of_chorus':
        case 'eoc':
          out.push('{/refrao}');
          break;
        case 'start_of_tab':
        case 'sot':
          out.push(arg ? `{tab:${arg}}` : '{tab}');
          inTab = true;
          break;
        case 'end_of_tab':
        case 'eot':
          out.push('{/tab}');
          inTab = false;
          break;
        case 'start_of_voz2':
          out.push('{voz2}');
          break;
        case 'end_of_voz2':
          out.push('{/voz2}');
          break;
        case 'start_of_nota':
          out.push('{nota}');
          break;
        case 'end_of_nota':
          out.push('{/nota}');
          break;
        case 'comment':
        case 'c':
          out.push(`[${arg}]`);
          break;
        case 'comment_italic':
        case 'ci':
        case 'comment_box':
        case 'cb':
          out.push(`{nota}${arg}{/nota}`);
          break;
        case 'start_of_verse':
        case 'sov':
          out.push(`[${arg || 'Verso'}]`);
          break;
        case 'start_of_bridge':
        case 'sob':
          out.push(`[${arg || 'Ponte'}]`);
          break;
        default:
          // diretivas sem equivalente (end_of_verse, tempo, etc.) são descartadas
          break;
      }
      continue;
    }
    if (inTab) {
      out.push(line);
      continue;
    }
    // linha só de acordes, com rótulos/símbolos: "Intro: [G]  [D]" → "Intro: G    D"
    if (/\[[^\]]+\]/.test(line)) {
      const unbracketed = line
        .replace(/\[([^\]]+)\]/g, (_m, c: string) => c.padEnd(c.length + 2))
        .replace(/\s+$/, '');
      const analysis = analyzeChordLine(unbracketed);
      if (analysis.isChordLine && analysis.unknown.length === 0) {
        out.push(unbracketed);
        continue;
      }
    }
    const split = splitInlineChords(line);
    if (split) {
      out.push(split[0], split[1]);
      continue;
    }
    out.push(line);
  }
  return { text: out.join('\n'), meta };
}
