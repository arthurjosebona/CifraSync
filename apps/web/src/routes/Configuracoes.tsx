import { INSTRUMENTS, parseSong } from '@cifrasync/core';
import {
  NAMED_FONT_SIZES,
  STAGE_PRESETS,
  StageSettings,
  type StageColors,
  type StageSettings as Stage,
} from '@cifrasync/shared';
import { useMemo, useState, type ReactNode } from 'react';

import { AboutSection } from '../components/AboutSection';
import { AccountSection } from '../components/AccountSection';
import { BackupSection } from '../components/BackupSection';
import { Page } from '../components/Page';
import { SongView } from '../components/SongView';
import { Button, Field, Select } from '../components/ui';
import { useSettings } from '../lib/data';
import { updateSettings } from '../lib/settings';
import { useTheme, type ThemePreference } from '../lib/theme';

const SAMPLE = parseSong(`[Refrão]
{refrao:1}
C          G         Am
Ô ô ô, é o nosso som
{/refrao}
G        D/F#      Em
Quando a noite ((chegar))
# segurar o último acorde
{tab}
e|--0--3--|
{/tab}`);

const FONTS = ['Inter', 'Arial', 'Verdana', 'Trebuchet MS', 'Georgia', 'Atkinson Hyperlegible'];
const CHORD_FONTS = ['JetBrains Mono', 'Consolas', 'Courier New', 'Inter', 'Arial'];

const COLOR_LABELS: [keyof StageColors, string][] = [
  ['bg', 'Fundo'],
  ['lyric', 'Letra'],
  ['chord', 'Cifra'],
  ['chorus1', 'Refrão 1'],
  ['chorus2', 'Refrão 2'],
  ['chorus3', 'Refrão 3'],
  ['voice2', '2ª voz'],
  ['tab', 'Tablatura'],
  ['note', 'Anotação'],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  format = (v) => String(v),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={`${label}: ${format(value)}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-11 accent-[var(--accent)]"
      />
    </Field>
  );
}

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export default function Configuracoes() {
  const { preference, setPreference } = useTheme();
  const { settings, global, device } = useSettings();
  const [scope, setScope] = useState<'global' | 'device'>('global');
  const stage = settings.stage;

  const set = (patch: Partial<Stage>) =>
    void updateSettings(scope === 'device' ? device : global, { stage: patch }, scope);
  const setColors = (patch: Partial<StageColors>) =>
    void updateSettings(scope === 'device' ? device : global, { stage: { colors: patch } }, scope);

  const previewVars = useMemo(
    () =>
      ({
        background: stage.colors.bg,
        '--song-lyric': stage.colors.lyric,
        '--song-chord': stage.colors.chord,
        '--song-chorus1': stage.colors.chorus1,
        '--song-chorus2': stage.colors.chorus2,
        '--song-chorus3': stage.colors.chorus3,
        '--song-voice2': stage.colors.voice2,
        '--song-tab': stage.colors.tab,
        '--song-note': stage.colors.note,
        '--song-font-size': `${stage.fontSize}px`,
        '--song-line-height': String(stage.lineHeight),
        '--song-chord-scale': String(stage.chordScale),
        '--song-font': `'${stage.fontFamily}', var(--font-sans)`,
        '--song-chord-font': `'${stage.chordFont}', var(--font-mono)`,
      }) as React.CSSProperties,
    [stage],
  );

  return (
    <Page title="Ajustes">
      <div className="flex flex-col gap-4">
        <AccountSection />
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted">Tema da interface</h2>
          <div className="inline-flex rounded-lg border border-border p-1" role="radiogroup">
            {THEMES.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={preference === o.value}
                onClick={() => setPreference(o.value)}
                className={`min-h-11 rounded-md px-4 text-sm ${
                  preference === o.value ? 'bg-accent text-accent-contrast' : 'text-muted'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-bg px-4 py-2 md:-mx-8 md:px-8">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted">Alterações do palco valem para:</span>
            <div className="inline-flex rounded-lg border border-border p-1" role="radiogroup">
              {(
                [
                  ['global', 'Todos os aparelhos'],
                  ['device', 'Só neste aparelho'],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={scope === v}
                  onClick={() => setScope(v)}
                  className={`min-h-10 rounded-md px-3 ${scope === v ? 'bg-accent text-accent-contrast' : 'text-muted'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            {Object.keys(device).length > 0 && (
              <Button
                variant="ghost"
                onClick={() => void updateSettings({}, {}, 'device')}
                title="Volta a usar as configurações da conta neste aparelho"
              >
                Limpar ajustes deste aparelho
              </Button>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-border p-4" style={previewVars}>
            <SongView
              doc={SAMPLE}
              options={{
                showChords: stage.showChords,
                hidePersonalNotes: stage.hidePersonalNotes,
                uppercase: stage.uppercase,
                center: stage.center,
                chorusStyle: stage.chorusStyle,
                chordStyle: stage.chordStyle,
              }}
            />
          </div>
        </div>

        <Section title="Texto">
          <Field label="Fonte da letra">
            <Select value={stage.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
              {FONTS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fonte da cifra">
            <Select value={stage.chordFont} onChange={(e) => set({ chordFont: e.target.value })}>
              {CHORD_FONTS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted">Tamanho</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(NAMED_FONT_SIZES).map(([name, px]) => (
                <Button
                  key={name}
                  variant={stage.fontSize === px ? 'primary' : 'secondary'}
                  onClick={() => set({ fontSize: px })}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
          <Range
            label="Tamanho livre"
            value={stage.fontSize}
            min={12}
            max={96}
            step={1}
            format={(v) => `${v}px`}
            onChange={(fontSize) => set({ fontSize })}
          />
          <Range
            label="Entrelinha"
            value={stage.lineHeight}
            min={1}
            max={2.5}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(lineHeight) => set({ lineHeight })}
          />
          <Range
            label="Tamanho da cifra"
            value={stage.chordScale}
            min={0.6}
            max={1.4}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(chordScale) => set({ chordScale })}
          />
          <div>
            <Toggle
              label="Mostrar cifras"
              checked={stage.showChords}
              onChange={(showChords) => set({ showChords })}
            />
            <Toggle
              label="Letra centralizada"
              checked={stage.center}
              onChange={(center) => set({ center })}
            />
            <Toggle
              label="Tudo em maiúsculas"
              checked={stage.uppercase}
              onChange={(uppercase) => set({ uppercase })}
            />
            <Toggle
              label="Esconder anotações pessoais (#)"
              checked={stage.hidePersonalNotes}
              onChange={(hidePersonalNotes) => set({ hidePersonalNotes })}
            />
          </div>
        </Section>

        <Section title="Cores do palco">
          <div className="flex flex-wrap gap-1 sm:col-span-2">
            {Object.entries(STAGE_PRESETS).map(([name, colors]) => (
              <Button key={name} onClick={() => setColors(colors)}>
                {name}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:col-span-2 sm:grid-cols-5">
            {COLOR_LABELS.map(([k, label]) => (
              <label key={k} className="flex flex-col items-center gap-1 text-xs text-muted">
                <input
                  type="color"
                  value={stage.colors[k]}
                  onChange={(e) => setColors({ [k]: e.target.value })}
                  className="h-11 w-full cursor-pointer rounded-lg border border-border bg-transparent"
                />
                {label}
              </label>
            ))}
          </div>
          <Field label="Destaque do refrão">
            <Select
              value={stage.chorusStyle}
              onChange={(e) => set({ chorusStyle: e.target.value as Stage['chorusStyle'] })}
            >
              <option value="marker+background">Marcador e fundo</option>
              <option value="marker">Só marcador</option>
              <option value="background">Só fundo</option>
            </Select>
          </Field>
        </Section>

        <Section title="Layout">
          <Field label="Colunas">
            <Select
              value={stage.columns}
              onChange={(e) => set({ columns: e.target.value as Stage['columns'] })}
            >
              <option value="auto">Automático (2 em paisagem larga)</option>
              <option value="1">1 página</option>
              <option value="2">2 páginas lado a lado</option>
            </Select>
          </Field>
          <Field label="Transição de página">
            <Select
              value={stage.transition}
              onChange={(e) => set({ transition: e.target.value as Stage['transition'] })}
            >
              <option value="slide">Deslizar</option>
              <option value="fade">Esmaecer</option>
              <option value="none">Nenhuma</option>
            </Select>
          </Field>
          <Toggle
            label="Coluna de acordes"
            checked={stage.showChordColumn}
            onChange={(showChordColumn) => set({ showChordColumn })}
          />
          <Toggle
            label="Faixa de referência no meio da tela"
            checked={stage.referenceBand}
            onChange={(referenceBand) => set({ referenceBand })}
          />
        </Section>

        <Section title="Navegação no palco">
          <Field label="Modo padrão">
            <Select
              value={stage.navigation}
              onChange={(e) => set({ navigation: e.target.value as Stage['navigation'] })}
            >
              <option value="paged">Páginas (toque para virar)</option>
              <option value="autoscroll">Rolagem automática</option>
              <option value="hybrid">Híbrido (automática + manual)</option>
            </Select>
          </Field>
          <Toggle
            label="Inverter lados do toque (esquerda avança)"
            checked={stage.tapZonesInverted}
            onChange={(tapZonesInverted) => set({ tapZonesInverted })}
          />
          <Range
            label="Retomar rolagem após toque manual"
            value={stage.hybridResumeDelay}
            min={0}
            max={5}
            step={0.5}
            format={(v) => `${v}s`}
            onChange={(hybridResumeDelay) => set({ hybridResumeDelay })}
          />
          <Range
            label="Esperar antes de começar a rolar"
            value={stage.scrollStartDelay}
            min={0}
            max={30}
            step={1}
            format={(v) => `${v}s`}
            onChange={(scrollStartDelay) => set({ scrollStartDelay })}
          />
        </Section>

        <Section title="Acordes">
          <Field label="Instrumento dos diagramas">
            <Select
              value={stage.instrument}
              onChange={(e) => set({ instrument: e.target.value as Stage['instrument'] })}
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
              value={stage.lefty ? 'c' : 'd'}
              onChange={(e) => set({ lefty: e.target.value === 'c' })}
            >
              <option value="d">Destro</option>
              <option value="c">Canhoto</option>
            </Select>
          </Field>
          <Field label="Escrita dos acordes">
            <Select
              value={stage.chordStyle}
              onChange={(e) => set({ chordStyle: e.target.value as Stage['chordStyle'] })}
            >
              <option value="original">Como foi escrita</option>
              <option value="br">Padrão brasileiro (7M, m7(b5), °)</option>
              <option value="intl">Internacional (maj7, m7b5, dim)</option>
            </Select>
          </Field>
        </Section>

        <div>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Restaurar todas as configurações do palco para o padrão?'))
                void updateSettings(
                  scope === 'device' ? device : global,
                  { stage: StageSettings.parse({}) },
                  scope,
                );
            }}
          >
            Restaurar padrões do palco
          </Button>
        </div>

        <BackupSection />
        <AboutSection />
      </div>
    </Page>
  );
}
