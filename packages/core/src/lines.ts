/**
 * Classificação de linhas de uma cifra: cifra, letra, tablatura, cabeçalho, marcação...
 */
import { parseChord, type Chord } from './chords';

export type LineKind = 'blank' | 'chords' | 'lyric' | 'tab' | 'header' | 'directive' | 'comment';

/** Token de uma linha de cifra, na coluna em que aparece. */
export interface ChordToken {
  col: number;
  /** Texto do token como está na linha, ex.: "(A7)", "Intro:", "|". */
  raw: string;
  /** Acorde reconhecido dentro do token (sem parênteses), ou null para rótulos e símbolos. */
  chord: Chord | null;
  /** Texto antes do acorde dentro do token, ex.: "(". */
  pre: string;
  /** Texto depois do acorde dentro do token, ex.: ")". */
  post: string;
}

const SECTION_WORDS = [
  'intro',
  'introdução',
  'introducao',
  'refrão',
  'refrao',
  'pré-refrão',
  'pre-refrão',
  'pré-refrao',
  'pre-refrao',
  'ponte',
  'solo',
  'final',
  'verso',
  'estrofe',
  'parte',
  'primeira parte',
  'segunda parte',
  'terceira parte',
  'interlúdio',
  'interludio',
  'riff',
  'base',
  'coda',
  'bridge',
  'chorus',
  'verse',
  'outro',
];

const SECTION_RE = new RegExp(
  `^\\s*(${SECTION_WORDS.map((w) => w.replace(/[-]/g, '\\-')).join('|')})(\\s+\\d+)?\\s*(\\(.*\\))?\\s*:?\\s*$`,
  'i',
);
const LABEL_PREFIX_RE = new RegExp(
  `^(\\s*(?:${SECTION_WORDS.map((w) => w.replace(/[-]/g, '\\-')).join('|')})(?:\\s+\\d+)?\\s*:\\s*)`,
  'i',
);

/** Tokens que podem aparecer numa linha de cifra sem ser acorde nem palavra. */
const SYMBOL_RE =
  /^(\|+|:?\|\|?:?|%|-+|–|—|\.{2,}|\/|x\d+|\d+x|\(x?\d+x?\)|\*+|>|N\.?C\.?|\(|\))$/i;

export function isSymbolToken(tok: string): boolean {
  return SYMBOL_RE.test(tok);
}

/** Lê um token como acorde, aceitando parênteses ou colchetes em volta: "(A7)", "[G]". */
export function readChordToken(raw: string): Pick<ChordToken, 'chord' | 'pre' | 'post'> {
  const whole = parseChord(raw);
  if (whole) return { chord: whole, pre: '', post: '' };
  const m = /^([([]*)(.*?)([)\]]*[,.]?)$/.exec(raw);
  const pre = m?.[1] ?? '';
  const core = m?.[2] ?? raw;
  const post = m?.[3] ?? '';
  const chord = core ? parseChord(core) : null;
  if (chord) return { chord, pre, post };
  return { chord: null, pre: '', post: '' };
}

/** Separa a linha em tokens com coluna. */
export function tokenize(line: string): { col: number; raw: string }[] {
  const out: { col: number; raw: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push({ col: m.index, raw: m[0] });
  return out;
}

export interface ChordLineAnalysis {
  isChordLine: boolean;
  tokens: ChordToken[];
  /** Tokens que não são acorde, símbolo nem rótulo — candidatos a erro de digitação. */
  unknown: string[];
}

/**
 * Decide se a linha é de cifra: ≥ 70% dos tokens "significativos" são acordes.
 * Rótulos ("Intro:") no começo e símbolos ("|", "x2") não contam.
 */
export function analyzeChordLine(line: string): ChordLineAnalysis {
  const tokens: ChordToken[] = [];
  const unknown: string[] = [];
  let chordCount = 0;
  let wordCount = 0;

  const label = LABEL_PREFIX_RE.exec(line);
  if (label) {
    const raw = label[1]!.trim();
    tokens.push({ col: line.indexOf(raw), raw, chord: null, pre: '', post: '' });
  }
  const from = label ? label[1]!.length : 0;
  for (const t of tokenize(line.slice(from))) {
    const col = t.col + from;
    if (isSymbolToken(t.raw)) {
      tokens.push({ col, raw: t.raw, chord: null, pre: '', post: '' });
      continue;
    }
    const r = readChordToken(t.raw);
    if (r.chord) {
      chordCount++;
      tokens.push({ col, raw: t.raw, ...r });
    } else {
      wordCount++;
      unknown.push(t.raw);
      tokens.push({ col, raw: t.raw, chord: null, pre: '', post: '' });
    }
  }
  const total = chordCount + wordCount;
  const isChordLine = chordCount > 0 && chordCount / total >= 0.7;
  return { isChordLine, tokens, unknown: isChordLine ? unknown : [] };
}

const TAB_START_RE = /^\s*[eBGDAEbgda]\s*[|:]/;

export function isTabLine(line: string): boolean {
  if (!TAB_START_RE.test(line)) return false;
  const body = line.replace(TAB_START_RE, '');
  const tabChars = body.replace(/[^-|0-9hpbrx/\\~^.()*]/g, '').length;
  return tabChars >= 6 && tabChars / Math.max(1, body.trim().length) >= 0.8;
}

export function isHeaderLine(line: string): boolean {
  if (/^\s*\[[^\]]+\]\s*$/.test(line)) return !parseChord(headerTitle(line));
  return SECTION_RE.test(line);
}

export function headerTitle(line: string): string {
  const t = line.trim();
  const b = /^\[(.+)\]$/.exec(t);
  return (b ? b[1]! : t.replace(/:\s*$/, '')).trim();
}

export function isDirectiveLine(line: string): boolean {
  return /^\s*\{\/?[a-zA-Z_][\w-]*(?::[^}]*)?\}\s*$/.test(line);
}

export function classifyLine(line: string): LineKind {
  if (line.trim() === '') return 'blank';
  if (isDirectiveLine(line)) return 'directive';
  if (/^\s*#/.test(line)) return 'comment';
  if (isTabLine(line)) return 'tab';
  // "[Refrão]" é cabeçalho; "[G]" sozinho é acorde.
  if (isHeaderLine(line)) return 'header';
  if (analyzeChordLine(line).isChordLine) return 'chords';
  return 'lyric';
}
