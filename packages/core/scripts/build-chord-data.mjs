/**
 * Converte o dataset @tombatossals/chords-db (MIT) em JSON compacto por instrumento.
 * Saída: src/data/<instrumento>.json → { source, license, tuning, voicings: number[][] }
 * Cada voicing tem as casas absolutas por corda (grave → aguda); -1 = corda abafada.
 *
 * Uso: pnpm --filter @cifrasync/core data:build
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = dirname(require.resolve('@tombatossals/chords-db/package.json'));
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));

const SOURCES = [
  { file: 'guitar.json', out: 'violao.json' },
  { file: 'ukulele.json', out: 'ukulele.json' },
];

for (const { file, out } of SOURCES) {
  const db = JSON.parse(readFileSync(join(pkgDir, 'lib', file), 'utf8'));
  const seen = new Set();
  const voicings = [];
  for (const list of Object.values(db.chords)) {
    for (const chord of list) {
      for (const p of chord.positions) {
        const abs = p.frets.map((f) => (f <= 0 ? f : f + p.baseFret - 1));
        const key = abs.join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        voicings.push(abs);
      }
    }
  }
  voicings.sort((a, b) => a.join(',').localeCompare(b.join(',')));
  const data = {
    source: `${pkg.name}@${pkg.version}`,
    license: 'MIT — Copyright (c) David Rubert (tombatossals). Ver THIRD_PARTY_NOTICES.md.',
    tuning: db.tunings.standard,
    voicings,
  };
  writeFileSync(join(here, '..', 'src', 'data', out), JSON.stringify(data) + '\n');
  console.log(`${out}: ${voicings.length} posições`);
}
