/**
 * Gera uma página estática com os diagramas das posições mais comuns de cavaco e ukulele,
 * para revisão humana (T21). Não depende da UI: desenha SVG simples.
 *
 * Uso: pnpm --filter @cifrasync/core review:voicings
 * Saída: packages/core/review/posicoes.html (ignorado pelo git)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getInstrument, getVoicings, parseChord, voicingToString } from '../src/index';

const CHORDS = [
  'C',
  'D',
  'E',
  'F',
  'G',
  'A',
  'Am',
  'Dm',
  'Em',
  'Bm',
  'F#m',
  'A7',
  'D7',
  'E7',
  'G7',
];
const INSTRUMENTS = ['cavaco', 'ukulele'];
const PER_CHORD = 4;

function diagram(frets: number[], inst: { stringNames: string[] }) {
  const n = frets.length;
  const shown = 5;
  const fretted = frets.filter((f) => f > 0);
  const max = fretted.length ? Math.max(...fretted) : 0;
  const start = max > shown ? Math.min(...fretted) : 1;
  const w = 18,
    h = 22,
    left = 22,
    top = 26;
  const width = left + (n - 1) * w + 22;
  const height = top + shown * h + 14;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui" font-size="11">`;
  if (start === 1)
    s += `<rect x="${left - 1}" y="${top - 4}" width="${(n - 1) * w + 2}" height="4" fill="currentColor"/>`;
  else s += `<text x="${left - 6}" y="${top + h / 2 + 4}" text-anchor="end">${start}</text>`;
  for (let i = 0; i <= shown; i++)
    s += `<line x1="${left}" y1="${top + i * h}" x2="${left + (n - 1) * w}" y2="${top + i * h}" stroke="currentColor" stroke-width="1"/>`;
  for (let i = 0; i < n; i++) {
    const x = left + i * w;
    s += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + shown * h}" stroke="currentColor" stroke-width="1"/>`;
    const f = frets[i]!;
    if (f < 0) s += `<text x="${x}" y="${top - 9}" text-anchor="middle">×</text>`;
    else if (f === 0)
      s += `<circle cx="${x}" cy="${top - 13}" r="4" fill="none" stroke="currentColor"/>`;
    else s += `<circle cx="${x}" cy="${top + (f - start + 0.5) * h}" r="6.5" fill="currentColor"/>`;
    s += `<text x="${x}" y="${height - 1}" text-anchor="middle" opacity=".6">${inst.stringNames[i]}</text>`;
  }
  return s + '</svg>';
}

let body = '';
for (const id of INSTRUMENTS) {
  const inst = getInstrument(id);
  body += `<h2>${inst.name} <small>(${inst.stringNames.join(' ')})</small></h2><div class="grid">`;
  for (const name of CHORDS) {
    const vs = getVoicings(parseChord(name)!, id, PER_CHORD);
    body += `<section><h3>${name}</h3><div class="row">`;
    vs.forEach((v, i) => {
      body += `<figure>${diagram(v.frets, inst)}<figcaption><b>${id}:${name}#${i + 1}</b><br>${voicingToString(v.frets)} · ${v.source}</figcaption></figure>`;
    });
    body += '</div></section>';
  }
  body += '</div>';
}

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisão de posições</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#1d1d1f;--muted:#666;--card:#f5f5f7}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--muted:#aaa;--card:#202020}}
body{font-family:system-ui,sans-serif;margin:0 auto;max-width:1100px;padding:16px;background:var(--bg);color:var(--fg)}
h2{margin-top:32px}small{color:var(--muted);font-weight:400}
.grid{display:grid;gap:12px}section{background:var(--card);border-radius:10px;padding:8px 12px}
h3{margin:4px 0}.row{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;text-align:center}
figcaption{font-size:12px;color:var(--muted)}
</style></head><body>
<h1>Revisão das posições de cavaco e ukulele</h1>
<p>Marque as posições que <b>não</b> fazem sentido para quem toca, citando o código (ex.: <code>cavaco:Bm#1</code>) e, se quiser, a posição que esperava ver.</p>
${body}
</body></html>`;

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'review', 'posicoes.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(out);
