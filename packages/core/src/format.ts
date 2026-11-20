/**
 * Formatação automática da cifra colada pelo usuário (RF-02).
 */
import { parseChord } from './chords';
import { analyzeChordLine, classifyLine, headerTitle, type LineKind } from './lines';

export interface FormatOptions {
  /** Largura de tabulação usada para converter \t em espaços. Padrão 8. */
  tabWidth?: number;
}

export interface UnknownToken {
  /** Linha (base 0) no texto formatado. */
  line: number;
  token: string;
}

export interface ChorusSuggestion {
  /** Primeira e última linha (base 0, inclusivas) no texto formatado. */
  from: number;
  to: number;
  reason: 'secao-refrao' | 'repeticao';
}

export interface FormatReport {
  counts: Record<'chords' | 'lyric' | 'tab' | 'header' | 'comment', number>;
  unknown: UnknownToken[];
  chorusSuggestions: ChorusSuggestion[];
}

/** Expande \t respeitando colunas, para não desalinhar acordes. */
export function expandTabs(line: string, width = 8): string {
  let out = '';
  for (const ch of line) {
    if (ch === '\t') out += ' '.repeat(width - (out.length % width));
    else out += ch;
  }
  return out;
}

/** Converte uma linha estilo ChordPro ("[G]Quando a [D]noite") em cifra em cima + letra embaixo. */
export function splitInlineChords(line: string): [string, string] | null {
  const re = /\[([^\]]+)\]/g;
  if (!re.test(line)) return null;
  re.lastIndex = 0;
  let chords = '';
  let lyric = '';
  let last = 0;
  let m: RegExpExecArray | null;
  let found = 0;
  while ((m = re.exec(line))) {
    if (!parseChord(m[1]!)) return null;
    lyric += line.slice(last, m.index);
    const col = Math.max(lyric.length, chords.length ? chords.length + 1 : 0);
    lyric = lyric.padEnd(col);
    chords = chords.padEnd(col) + m[1];
    last = m.index + m[0].length;
    found++;
  }
  lyric += line.slice(last);
  if (!found || !lyric.trim()) return null;
  return [chords, lyric.replace(/\s+$/, '')];
}

/** Espaços não separáveis (NBSP e afins) e caracteres de largura zero, montados por código. */
const SPACE_LIKE_RE = new RegExp(`[${String.fromCharCode(0xa0, 0x2007, 0x202f)}]`, 'g');
const ZERO_WIDTH_RE = new RegExp(`[${String.fromCharCode(0x200b, 0xfeff)}]`, 'g');

function normalize(text: string, tabWidth: number): string[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .replace(SPACE_LIKE_RE, ' ')
    .replace(ZERO_WIDTH_RE, '')
    .split('\n')
    .map((l) => expandTabs(l, tabWidth).replace(/\s+$/, ''));
  // remove linhas vazias no começo/fim e colapsa 3+ vazias seguidas em 2
  while (lines.length && lines[0] === '') lines.shift();
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  const out: string[] = [];
  let blanks = 0;
  for (const l of lines) {
    blanks = l === '' ? blanks + 1 : 0;
    if (blanks <= 2) out.push(l);
  }
  return out;
}

const CHORUS_TITLE_RE = /^(refr[aã]o|chorus|coro)\b/i;

/**
 * Normaliza a cifra colada e devolve o texto pronto + relatório da detecção.
 * Não aplica destaques de refrão sozinha: só sugere (o usuário decide).
 */
export function autoFormat(
  text: string,
  opts: FormatOptions = {},
): { text: string; report: FormatReport } {
  const src = normalize(text, opts.tabWidth ?? 8);

  // 1. Converte linhas ChordPro e agrupa tablaturas soltas em {tab}
  const out: string[] = [];
  let inTabDirective = false;
  for (let i = 0; i < src.length; i++) {
    const line = src[i]!;
    if (/^\s*\{tab(:[^}]*)?\}\s*$/.test(line)) inTabDirective = true;
    if (/^\s*\{\/tab\}\s*$/.test(line)) inTabDirective = false;
    if (inTabDirective) {
      out.push(line);
      continue;
    }
    const kind = classifyLine(line);
    if (kind === 'tab') {
      out.push('{tab}');
      while (i < src.length && classifyLine(src[i]!) === 'tab') out.push(src[i++]!);
      i--;
      out.push('{/tab}');
      continue;
    }
    if (kind === 'lyric') {
      const split = splitInlineChords(line);
      if (split) {
        out.push(split[0], split[1]);
        continue;
      }
    }
    out.push(line);
  }

  // 2. Relatório
  const counts: FormatReport['counts'] = { chords: 0, lyric: 0, tab: 0, header: 0, comment: 0 };
  const unknown: UnknownToken[] = [];
  const kinds: LineKind[] = [];
  let tabDepth = false;
  out.forEach((line, idx) => {
    if (/^\s*\{tab(:[^}]*)?\}\s*$/.test(line)) tabDepth = true;
    else if (/^\s*\{\/tab\}\s*$/.test(line)) tabDepth = false;
    const kind: LineKind = tabDepth && !/^\s*\{/.test(line) ? 'tab' : classifyLine(line);
    kinds.push(kind);
    if (kind in counts) counts[kind as keyof typeof counts]++;
    if (kind === 'chords') {
      for (const token of analyzeChordLine(line).unknown) unknown.push({ line: idx, token });
    }
  });

  return {
    text: out.join('\n'),
    report: { counts, unknown, chorusSuggestions: suggestChorus(out, kinds) },
  };
}

/** Parágrafos: trechos entre linhas vazias/cabeçalhos com pelo menos uma linha de letra. */
function paragraphs(lines: string[], kinds: LineKind[]) {
  const result: { from: number; to: number; title?: string }[] = [];
  let start = -1;
  let title: string | undefined;
  const end = (i: number) => {
    if (start >= 0)
      result.push(title ? { from: start, to: i - 1, title } : { from: start, to: i - 1 });
    start = -1;
  };
  kinds.forEach((k, i) => {
    if (k === 'blank' || k === 'directive') {
      end(i);
      title = undefined;
    } else if (k === 'header') {
      end(i);
      title = headerTitle(lines[i]!);
    } else if (start < 0) start = i;
  });
  end(kinds.length);
  return result;
}

function suggestChorus(lines: string[], kinds: LineKind[]): ChorusSuggestion[] {
  const paras = paragraphs(lines, kinds);
  const suggestions: ChorusSuggestion[] = [];
  const lyricKey = (p: { from: number; to: number }) =>
    lines
      .slice(p.from, p.to + 1)
      .filter((_, j) => kinds[p.from + j] === 'lyric')
      .map((l) =>
        l
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/\(\(|\)\)|[^\p{L}\p{N} ]/gu, '')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .join('|');

  const seen = new Map<string, number>();
  for (const p of paras) {
    const lyricLines = kinds.slice(p.from, p.to + 1).filter((k) => k === 'lyric').length;
    if (p.title && CHORUS_TITLE_RE.test(p.title)) {
      suggestions.push({ from: p.from, to: p.to, reason: 'secao-refrao' });
      continue;
    }
    if (lyricLines < 2) continue;
    const key = lyricKey(p);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const p of paras) {
    if (p.title && CHORUS_TITLE_RE.test(p.title)) continue;
    const key = lyricKey(p);
    if ((seen.get(key) ?? 0) >= 2 && key)
      suggestions.push({ from: p.from, to: p.to, reason: 'repeticao' });
  }
  return suggestions.sort((a, b) => a.from - b.from);
}
