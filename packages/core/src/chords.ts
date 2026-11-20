/**
 * Parser de acordes na notação brasileira e internacional.
 *
 * O sufixo original é preservado (`suffix`) para que a transposição mude só a fundamental e o
 * baixo, sem reescrever a forma como o músico escreveu o acorde ("C7M(9)" → "D7M(9)").
 */
import { normalizeAccidentals, readNote, type Note } from './notes';

export type Quality = 'major' | 'minor' | 'dim' | 'aug' | 'sus2' | 'sus4' | 'power';
export type Seventh = '7' | '7M' | 'dim7';
export type Alteration = 'b5' | '#5' | 'b9' | '#9' | '#11' | 'b13';

export interface Chord {
  root: Note;
  /** Sufixo como foi escrito (♯/♭ normalizados), ex.: "m7(b5)". */
  suffix: string;
  bass?: Note;
  quality: Quality;
  seventh?: Seventh;
  sixth: boolean;
  /** Extensões empilhadas (9, 11, 13) — implicam sétima. */
  extensions: number[];
  /** Notas adicionadas sem sétima: add9, (9), (11)... */
  add: number[];
  alterations: Alteration[];
}

type Draft = Omit<Chord, 'root' | 'suffix' | 'bass'>;

const ALT_NORMAL: Record<string, Alteration> = {
  b5: 'b5',
  '-5': 'b5',
  '#5': '#5',
  '+5': '#5',
  b9: 'b9',
  '-9': 'b9',
  '#9': '#9',
  '+9': '#9',
  '#11': '#11',
  '+11': '#11',
  b13: 'b13',
  '-13': 'b13',
};

/** Interpreta um item dentro de parênteses: "9", "b5", "7M", "11"... */
function applyParenItem(d: Draft, item: string): boolean {
  const alt = ALT_NORMAL[item];
  if (alt) {
    d.alterations.push(alt);
    return true;
  }
  if (/^(7M|7\+|maj7|M7)$/.test(item)) {
    d.seventh = '7M';
    return true;
  }
  if (item === '7') {
    d.seventh ??= '7';
    return true;
  }
  if (/^(9|11|13)$/.test(item)) {
    // BR: "C(9)" = add9; "C7(9)" = sétima com nona.
    if (d.seventh) d.extensions.push(Number(item));
    else d.add.push(Number(item));
    return true;
  }
  if (item === '2') {
    d.add.push(9);
    return true;
  }
  if (item === '4') {
    // BR: "A7(4)" = A7sus4; em acorde menor/alterado, "(4)" vira 11ª adicionada.
    if (d.quality === 'major') d.quality = 'sus4';
    else d.add.push(11);
    return true;
  }
  if (item === '6') {
    d.sixth = true;
    return true;
  }
  return false;
}

type Rule = [RegExp, (d: Draft, m: RegExpExecArray, atStart: boolean) => boolean];

/** Regras aplicadas em ordem, sempre na posição atual do sufixo (regex "sticky"). */
const RULES: Rule[] = [
  // menor com sétima maior
  [
    /(?:mM7|m7M|m\(7M\)|mmaj7|m\(maj7\)|m7\+|mΔ7?)/y,
    (d) => ((d.quality = 'minor'), (d.seventh = '7M'), true),
  ],
  // meio-diminuto
  [/ø7?/y, (d) => ((d.quality = 'minor'), (d.seventh = '7'), d.alterations.push('b5'), true)],
  // sétima maior
  [/(?:maj7|M7|7M|Δ7?|7\+(?![0-9]))/y, (d) => ((d.seventh = '7M'), true)],
  [/maj(?=9|11|13)/y, (d) => ((d.seventh = '7M'), true)],
  [/maj(?=$|\/)/y, () => true],
  // diminuto (com ou sem sétima diminuta)
  [/(?:dim7|°7|º7)/y, (d, _m, s) => s && ((d.quality = 'dim'), (d.seventh = 'dim7'), true)],
  [/(?:dim|°|º)/y, (d, _m, s) => s && ((d.quality = 'dim'), true)],
  // menor
  [/(?:min|m(?!aj)|-(?=$|[0-9(/]))/y, (d, _m, s) => s && ((d.quality = 'minor'), true)],
  // aumentado
  [/(?:aug|\+(?=$|[0-9(/]))/y, (d, _m, s) => s && ((d.quality = 'aug'), true)],
  [/M(?=$|\/)/y, (_d, _m, s) => s],
  // suspensos
  [/sus2/y, (d) => ((d.quality = 'sus2'), true)],
  [/sus4?/y, (d) => ((d.quality = 'sus4'), true)],
  // add
  [/add(9|11|13|2|4)/y, (d, m) => (d.add.push({ '2': 9, '4': 11 }[m[1]!] ?? Number(m[1])), true)],
  // 6/9
  [/(?:6\/9|69)/y, (d) => ((d.sixth = true), d.add.push(9), true)],
  // grupo entre parênteses: (9), (b5), (9,11), (7M/9)
  [
    /\(([^)]*)\)/y,
    (d, m) => {
      const items = m[1]!
        .split(/[,/]/)
        .map((x) => x.trim())
        .filter(Boolean);
      return items.length > 0 && items.every((it) => applyParenItem(d, it));
    },
  ],
  // item após barra dentro do sufixo: A7/4, C7/9
  [/\/([b#+-]?\d{1,2})/y, (d, m) => applyParenItem(d, m[1]!)],
  // alterações soltas: C7b9, C7#5, C7+5, C7-9
  [
    /(?:b|#|\+|-)(?:5|9|11|13)/y,
    (d, m) => {
      const alt = ALT_NORMAL[m[0]];
      if (!alt) return false;
      d.alterations.push(alt);
      return true;
    },
  ],
  // extensões empilhadas: 9, 11, 13 (implicam sétima menor se não houver outra)
  [/(?:13|11|9)/y, (d, m) => ((d.seventh ??= '7'), d.extensions.push(Number(m[0])), true)],
  [/7/y, (d) => ((d.seventh ??= '7'), true)],
  [/6/y, (d) => ((d.sixth = true), true)],
  // notação BR: C4 = sus4, C2 = sus2, C5 = power chord
  [/5/y, (d, _m, s) => s && ((d.quality = 'power'), true)],
  [
    /4/y,
    (d) => {
      if (d.quality !== 'major') return false;
      d.quality = 'sus4';
      return true;
    },
  ],
  [
    /2/y,
    (d) => {
      if (d.quality !== 'major') return false;
      d.quality = 'sus2';
      return true;
    },
  ],
];

function parseSuffix(suffix: string): Draft | null {
  const d: Draft = {
    quality: 'major',
    sixth: false,
    extensions: [],
    add: [],
    alterations: [],
  };
  let i = 0;
  while (i < suffix.length) {
    let matched = false;
    for (const [re, apply] of RULES) {
      re.lastIndex = i;
      const m = re.exec(suffix);
      if (m && m[0].length > 0) {
        if (!apply(d, m, i === 0)) continue;
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }
  return d;
}

/**
 * Interpreta um acorde. Retorna `null` se a string não for um acorde válido
 * (é assim que palavras como "Agora" ou "Era" são rejeitadas).
 */
export function parseChord(input: string): Chord | null {
  const s = normalizeAccidentals(input.trim());
  if (s.length === 0 || s.length > 24) return null;
  const r = readNote(s);
  if (!r) return null;

  let rest = s.slice(r.length);
  let bass: Note | undefined;
  const slash = /\/([A-G][#b]?)$/.exec(rest);
  if (slash) {
    const b = readNote(slash[1]!);
    if (!b || b.length !== slash[1]!.length) return null;
    bass = b.note;
    rest = rest.slice(0, slash.index);
  }

  const draft = parseSuffix(rest);
  if (!draft) return null;
  const chord: Chord = { root: r.note, suffix: rest, ...draft };
  if (bass) chord.bass = bass;
  return chord;
}

export function isChord(s: string): boolean {
  return parseChord(s) !== null;
}

export type ChordStyle = 'original' | 'br' | 'intl';

const ALT_ORDER: Alteration[] = ['b5', '#5', 'b9', '#9', '#11', 'b13'];

function suffixFor(c: Chord, style: 'br' | 'intl'): string {
  const br = style === 'br';
  let q = '';
  switch (c.quality) {
    case 'minor':
      q = 'm';
      break;
    case 'dim':
      q = br ? '°' : 'dim';
      break;
    case 'aug':
      q = br ? '+' : 'aug';
      break;
    case 'sus2':
      q = br ? '2' : 'sus2';
      break;
    case 'sus4':
      q = br ? '4' : 'sus4';
      break;
    case 'power':
      q = '5';
      break;
  }
  const alts = [...c.alterations].sort((a, b) => ALT_ORDER.indexOf(a) - ALT_ORDER.indexOf(b));
  const exts = [...c.extensions].sort((a, b) => a - b);
  const adds = [...c.add].sort((a, b) => a - b);
  const halfDim = c.quality === 'minor' && c.seventh === '7' && alts.includes('b5');

  if (br) {
    let seventh = '';
    if (c.seventh === '7') seventh = '7';
    else if (c.seventh === '7M') seventh = '7M';
    else if (c.seventh === 'dim7') seventh = '7';
    const sixth = c.sixth ? '6' : '';
    const paren = [...exts.map(String), ...adds.map(String), ...alts];
    // sus4 com sétima em BR: "7(4)"
    if (c.quality === 'sus4' && c.seventh)
      return `${seventh}(4${paren.length ? ',' + paren.join(',') : ''})`;
    return `${q}${sixth}${seventh}${paren.length ? `(${paren.join(',')})` : ''}`;
  }

  // internacional
  if (halfDim) {
    const others = alts.filter((a) => a !== 'b5');
    return `m7b5${exts.length ? exts.join('') : ''}${others.join('')}`;
  }
  let core = q;
  const top = exts.length ? exts[exts.length - 1]! : undefined;
  if (c.seventh === '7M') core += top ? `maj${top}` : 'maj7';
  else if (c.seventh === 'dim7') core += '7';
  else if (c.seventh === '7') core += top ? String(top) : '7';
  if (c.sixth) core += adds.includes(9) && !c.seventh ? '6/9' : '6';
  const addList = c.sixth && !c.seventh ? adds.filter((a) => a !== 9) : adds;
  core += addList.map((a) => `add${a}`).join('');
  core += alts.join('');
  if ((c.quality === 'sus2' || c.quality === 'sus4') && c.seventh) {
    // Csus4 com sétima → C7sus4
    core = core.replace(/^sus[24]/, '') + q;
  }
  return core;
}

/** Escreve o acorde. `original` mantém o sufixo como o usuário escreveu. */
export function formatChord(c: Chord, style: ChordStyle = 'original'): string {
  const suffix = style === 'original' ? c.suffix : suffixFor(c, style);
  return c.root.name + suffix + (c.bass ? '/' + c.bass.name : '');
}

/**
 * Intervalos (em semitons a partir da fundamental) que compõem o acorde.
 * `required` precisa soar; `optional` pode ser omitido numa posição (ex.: a 5ª justa).
 */
export function chordIntervals(c: Chord): { required: number[]; optional: number[] } {
  const required = new Set<number>([0]);
  const optional = new Set<number>();
  const third: Record<Quality, number | null> = {
    major: 4,
    minor: 3,
    dim: 3,
    aug: 4,
    sus2: 2,
    sus4: 5,
    power: null,
  };
  const t = third[c.quality];
  if (t !== null) required.add(t);

  let fifth = 7;
  if (c.quality === 'dim') fifth = 6;
  if (c.quality === 'aug') fifth = 8;
  if (c.alterations.includes('b5')) fifth = 6;
  if (c.alterations.includes('#5')) fifth = 8;
  if (fifth === 7 && c.quality !== 'power') optional.add(7);
  else required.add(fifth);

  if (c.seventh === '7') required.add(10);
  if (c.seventh === '7M') required.add(11);
  if (c.seventh === 'dim7') required.add(9);
  if (c.sixth) required.add(9);

  const extInterval: Record<number, number> = { 9: 2, 11: 5, 13: 9 };
  const exts = [...c.extensions].sort((a, b) => a - b);
  exts.forEach((e, idx) => {
    const iv = extInterval[e];
    if (iv === undefined) return;
    if (idx === exts.length - 1) required.add(iv);
    else optional.add(iv);
  });
  for (const a of c.add) {
    const iv = extInterval[a];
    if (iv !== undefined) required.add(iv);
  }
  const altInterval: Record<Alteration, number> = {
    b5: 6,
    '#5': 8,
    b9: 1,
    '#9': 3,
    '#11': 6,
    b13: 8,
  };
  for (const a of c.alterations) required.add(altInterval[a]);

  for (const r of required) optional.delete(r);
  return { required: [...required], optional: [...optional] };
}
