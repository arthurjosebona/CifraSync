/**
 * Posições (voicings) de acordes: dataset curado + gerador algorítmico.
 *
 * Uma posição é a casa de cada corda, da mais grave à mais aguda: -1 = abafada, 0 = solta.
 * O dataset (violão e ukulele) vem do chords-db (MIT); o gerador cobre o cavaco/banjo e
 * qualquer acorde que falte no dataset.
 */
import { chordIntervals, type Chord } from './chords';
import ukuleleData from './data/ukulele.json' with { type: 'json' };
import violaoData from './data/violao.json' with { type: 'json' };
import { getInstrument, type Instrument, type InstrumentId } from './instruments';
import { mod12 } from './notes';

export interface Voicing {
  frets: number[];
  source: 'dataset' | 'gerado';
}

const DATASETS: Partial<Record<InstrumentId, number[][]>> = {
  violao: violaoData.voicings,
  ukulele: ukuleleData.voicings,
};

interface Target {
  required: Set<number>;
  allowed: Set<number>;
  /** Classe de altura que precisa ser a nota mais grave (se o instrumento liga para baixo). */
  bass: number;
}

function targetFor(chord: Chord): Target {
  const { required, optional } = chordIntervals(chord);
  const root = chord.root.pc;
  const req = new Set(required.map((i) => mod12(root + i)));
  const allowed = new Set([...req, ...optional.map((i) => mod12(root + i))]);
  const bass = chord.bass ? chord.bass.pc : root;
  if (chord.bass) {
    allowed.add(chord.bass.pc);
  }
  return { required: req, allowed, bass };
}

/** Classes de altura que soam numa posição, e a mais grave. */
function sounding(frets: number[], inst: Instrument): { pcs: Set<number>; lowest: number | null } {
  const pcs = new Set<number>();
  let lowestMidi = Infinity;
  let lowest: number | null = null;
  frets.forEach((f, s) => {
    if (f < 0) return;
    const midi = inst.tuning[s]! + f;
    pcs.add(mod12(midi));
    if (midi < lowestMidi) {
      lowestMidi = midi;
      lowest = mod12(midi);
    }
  });
  return { pcs, lowest };
}

function matches(frets: number[], inst: Instrument, t: Target): boolean {
  if (frets.length !== inst.tuning.length) return false;
  const { pcs, lowest } = sounding(frets, inst);
  if (pcs.size === 0) return false;
  for (const r of t.required) if (!pcs.has(r)) return false;
  for (const p of pcs) if (!t.allowed.has(p)) return false;
  if (inst.bassMatters && lowest !== t.bass) return false;
  return true;
}

/** Abafadas só nas pontas: grave (qualquer quantidade) e no máximo 1 aguda. */
function mutesOk(frets: number[], inst: Instrument): boolean {
  const n = frets.length;
  let i = 0;
  while (i < n && frets[i]! < 0) i++;
  let j = n - 1;
  while (j >= i && frets[j]! < 0) j--;
  for (let k = i; k <= j; k++) if (frets[k]! < 0) return false;
  const lowMutes = i;
  const highMutes = n - 1 - j;
  if (highMutes > 1) return false;
  if (!inst.bassMatters && lowMutes + highMutes > 1) return false;
  return n - lowMutes - highMutes >= inst.minStrings;
}

/** Dedos necessários, contando pestana na casa mais baixa como 1 dedo. */
export function fingerCount(frets: number[]): { fingers: number; barre: number | null } {
  const fretted = frets.map((f, s) => ({ f, s })).filter((x) => x.f > 0);
  if (fretted.length === 0) return { fingers: 0, barre: null };
  const min = Math.min(...fretted.map((x) => x.f));
  const atMin = fretted.filter((x) => x.f === min);
  let barre: number | null = null;
  let fingers = fretted.length;
  if (atMin.length >= 2) {
    const from = atMin[0]!.s;
    const to = atMin[atMin.length - 1]!.s;
    // pestana possível se nenhuma corda entre as pontas está solta ou abafada
    const covered = frets.slice(from, to + 1).every((f) => f >= min);
    if (covered) {
      barre = min;
      fingers = fretted.length - atMin.length + 1;
    }
  }
  return { fingers, barre };
}

function score(frets: number[], t: Target, inst: Instrument): number {
  const { fingers, barre } = fingerCount(frets);
  const fretted = frets.filter((f) => f > 0);
  const minFret = fretted.length ? Math.min(...fretted) : 0;
  const maxFret = fretted.length ? Math.max(...fretted) : 0;
  const open = frets.filter((f) => f === 0).length;
  // abafar a corda mais aguda é incomum; abafar graves é normal no violão, raro nos de 4 cordas
  let lowMutes = 0;
  while (lowMutes < frets.length && frets[lowMutes]! < 0) lowMutes++;
  const highMuted = frets.length > lowMutes && frets[frets.length - 1]! < 0 ? 1 : 0;
  const mutePenalty = lowMutes * (inst.bassMatters ? 0.6 : 2.5) + highMuted * 3.0;
  const { pcs } = sounding(frets, inst);
  const missingOptional = [...t.allowed].filter((p) => !pcs.has(p)).length;
  return (
    fingers * 1.0 +
    (barre !== null ? 1.0 : 0) +
    minFret * 0.6 +
    (maxFret - minFret) * 0.4 +
    mutePenalty +
    missingOptional * 0.25 -
    open * 0.2
  );
}

/** Gera posições por busca em janelas de 4 casas (casas 0–12). */
export function generateVoicings(chord: Chord, instrumentId: InstrumentId, limit = 6): Voicing[] {
  const inst = getInstrument(instrumentId);
  const t = targetFor(chord);
  const n = inst.tuning.length;
  const found = new Map<string, { frets: number[]; score: number }>();

  for (let base = 1; base <= 12; base++) {
    const options: number[][] = inst.tuning.map((open) => {
      const opts = [-1];
      if (t.allowed.has(mod12(open))) opts.push(0);
      for (let f = base; f < base + 4; f++) if (t.allowed.has(mod12(open + f))) opts.push(f);
      return opts;
    });
    const cur = new Array<number>(n).fill(-1);
    const walk = (s: number) => {
      if (s === n) {
        if (!mutesOk(cur, inst) || !matches(cur, inst, t)) return;
        if (fingerCount(cur).fingers > 4) return;
        const key = cur.join(',');
        if (!found.has(key)) found.set(key, { frets: [...cur], score: score(cur, t, inst) });
        return;
      }
      for (const f of options[s]!) {
        cur[s] = f;
        walk(s + 1);
      }
    };
    walk(0);
  }

  return [...found.values()]
    .sort((a, b) => a.score - b.score || a.frets.join(',').localeCompare(b.frets.join(',')))
    .slice(0, limit)
    .map((v) => ({ frets: v.frets, source: 'gerado' as const }));
}

/** Posições do dataset que tocam exatamente o acorde. */
export function datasetVoicings(chord: Chord, instrumentId: InstrumentId): Voicing[] {
  return rankedDataset(chord, instrumentId).map(({ frets }) => ({
    frets,
    source: 'dataset' as const,
  }));
}

function rankedDataset(chord: Chord, instrumentId: InstrumentId) {
  const data = DATASETS[instrumentId];
  if (!data) return [];
  const inst = getInstrument(instrumentId);
  const t = targetFor(chord);
  return data
    .filter((frets) => matches(frets, inst, t) && mutesOk(frets, inst))
    .map((frets) => ({ frets, score: score(frets, t, inst) }))
    .sort((x, y) => x.score - y.score);
}

/**
 * Posições para exibir: dataset e gerador juntos, ordenados pela mesma pontuação
 * (em empate, a do dataset vem antes), sem repetição.
 */
export function getVoicings(chord: Chord, instrumentId: InstrumentId, limit = 8): Voicing[] {
  const inst = getInstrument(instrumentId);
  const t = targetFor(chord);
  const candidates = [
    ...rankedDataset(chord, instrumentId).map((v) => ({
      ...v,
      source: 'dataset' as const,
      rank: 0,
    })),
    ...generateVoicings(chord, instrumentId, limit * 2).map((v) => ({
      frets: v.frets,
      score: score(v.frets, t, inst),
      source: 'gerado' as const,
      rank: 1,
    })),
  ].sort((x, y) => x.score - y.score || x.rank - y.rank);
  const out: Voicing[] = [];
  const seen = new Set<string>();
  for (const v of candidates) {
    const key = v.frets.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ frets: v.frets, source: v.source });
    if (out.length >= limit) break;
  }
  return out;
}

/** Representação curta, ex.: "x32010". Casas ≥ 10 ficam entre parênteses: "x(10)(12)...". */
export function voicingToString(frets: number[]): string {
  return frets.map((f) => (f < 0 ? 'x' : f >= 10 ? `(${f})` : String(f))).join('');
}
