import { getVoicings, INSTRUMENTS, parseChord, type InstrumentId } from '@cifrasync/core';
import { Star } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ChordDiagram } from '../components/ChordDiagram';
import { Empty, Page } from '../components/Page';
import { Field, Select } from '../components/ui';
import { useSettings } from '../lib/data';
import { updateSettings } from '../lib/settings';

const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const TYPES: [string, string][] = [
  ['', 'Maior'],
  ['m', 'Menor'],
  ['7', 'Sétima'],
  ['7M', 'Sétima maior'],
  ['m7', 'Menor com sétima'],
  ['m7M', 'Menor com sétima maior'],
  ['6', 'Sexta'],
  ['m6', 'Menor com sexta'],
  ['(9)', 'Nona adicionada'],
  ['m(9)', 'Menor com nona'],
  ['7(9)', 'Sétima e nona'],
  ['7M(9)', 'Sétima maior e nona'],
  ['m7(9)', 'Menor com sétima e nona'],
  ['m7(11)', 'Menor com sétima e 11ª'],
  ['7(13)', 'Sétima e 13ª'],
  ['7(b9)', 'Sétima e nona menor'],
  ['7(#9)', 'Sétima e nona aumentada'],
  ['m7(b5)', 'Meio-diminuto'],
  ['°', 'Diminuto'],
  ['°7', 'Diminuto com sétima'],
  ['4', 'Suspenso (4ª)'],
  ['2', 'Suspenso (2ª)'],
  ['7(4)', 'Sétima suspensa'],
  ['+', 'Aumentado'],
  ['5', 'Quinta (power chord)'],
];

export default function Dicionario() {
  const { settings, global } = useSettings();
  const [root, setRoot] = useState('C');
  const [type, setType] = useState('');
  const instrument = settings.stage.instrument as InstrumentId;
  const lefty = settings.stage.lefty;
  const name = root + type;

  const voicings = useMemo(() => {
    const chord = parseChord(name);
    return chord ? getVoicings(chord, instrument, 12) : [];
  }, [name, instrument]);

  const preferred = settings.chordPrefs[instrument]?.[name] ?? 0;

  return (
    <Page title="Dicionário de acordes">
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Field label="Instrumento">
          <Select
            value={instrument}
            onChange={(e) => void updateSettings(global, { stage: { instrument: e.target.value } })}
          >
            {Object.values(INSTRUMENTS).map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mão">
          <Select
            value={lefty ? 'canhoto' : 'destro'}
            onChange={(e) =>
              void updateSettings(global, { stage: { lefty: e.target.value === 'canhoto' } })
            }
          >
            <option value="destro">Destro</option>
            <option value="canhoto">Canhoto</option>
          </Select>
        </Field>
        <Field label="Nota">
          <Select value={root} onChange={(e) => setRoot(e.target.value)}>
            {ROOTS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map(([suffix, label]) => (
              <option key={suffix} value={suffix}>
                {root + suffix} — {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {voicings.length === 0 ? (
        <Empty>Nenhuma posição encontrada para {name}.</Empty>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            {voicings.length} posições de <strong className="text-text">{name}</strong>. Toque numa
            posição para torná-la a padrão nas suas músicas.
          </p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {voicings.map((v, i) => (
              <li key={v.frets.join(',')}>
                <button
                  type="button"
                  onClick={() =>
                    void updateSettings(global, { chordPrefs: { [instrument]: { [name]: i } } })
                  }
                  aria-pressed={i === preferred}
                  className={`relative flex w-full flex-col items-center rounded-xl border p-2 ${
                    i === preferred ? 'border-accent' : 'border-border hover:bg-surface-2'
                  }`}
                >
                  {i === preferred && (
                    <Star
                      className="absolute top-2 right-2 size-4 fill-accent text-accent"
                      aria-label="Padrão"
                    />
                  )}
                  <ChordDiagram frets={v.frets} instrument={instrument} lefty={lefty} size={84} />
                  <span className="text-[10px] text-muted">
                    {i + 1} · {v.source === 'dataset' ? 'catálogo' : 'gerada'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}
