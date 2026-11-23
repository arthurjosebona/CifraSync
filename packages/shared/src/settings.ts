/**
 * Configurações de tela e do palco (docs/contexto/modo-palco.md §4).
 * Todo campo tem padrão: um objeto parcial vindo do banco é completado com `parseStageSettings`.
 */
import { z } from 'zod';

import { ChordPrefs, Id, InstrumentId, SyncColumns } from './entities';

const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const StageColors = z.object({
  bg: Color.default('#000000'),
  lyric: Color.default('#ffffff'),
  chord: Color.default('#ffcc00'),
  chorus1: Color.default('#00ffff'),
  chorus2: Color.default('#81c784'),
  chorus3: Color.default('#f48fb1'),
  voice2: Color.default('#b39ddb'),
  tab: Color.default('#bdbdbd'),
  note: Color.default('#ff8a65'),
});
export type StageColors = z.infer<typeof StageColors>;

export const NAMED_FONT_SIZES = {
  Pequena: 18,
  Normal: 22,
  'Ao vivo 1': 26,
  'Ao vivo 2': 30,
  'Ao vivo 3': 34,
} as const;

/** Maior tamanho de letra do palco (o do "Ao vivo 3"): acima disso a cifra corta e quebra. */
export const MAX_FONT_SIZE = NAMED_FONT_SIZES['Ao vivo 3'];

export const StageSettings = z.object({
  fontFamily: z.string().default('Inter'),
  chordFont: z.string().default('JetBrains Mono'),
  // valores maiores salvos antes do limite viram o máximo (em vez de invalidar tudo)
  fontSize: z
    .number()
    .min(12)
    .max(96)
    .transform((v) => Math.min(v, MAX_FONT_SIZE))
    .default(26),
  lineHeight: z.number().min(1).max(2.5).default(1.35),
  chordScale: z.number().min(0.6).max(1.4).default(0.9),
  colors: StageColors.default(StageColors.parse({})),
  chorusStyle: z.enum(['marker', 'background', 'marker+background']).default('marker+background'),
  columns: z.enum(['1', '2', 'auto']).default('auto'),
  showChords: z.boolean().default(true),
  showChordColumn: z.boolean().default(true),
  hidePersonalNotes: z.boolean().default(false),
  uppercase: z.boolean().default(false),
  center: z.boolean().default(false),
  referenceBand: z.boolean().default(false),
  instrument: InstrumentId.default('violao'),
  lefty: z.boolean().default(false),
  chordStyle: z.enum(['original', 'br', 'intl']).default('original'),
  navigation: z.enum(['paged', 'autoscroll', 'hybrid']).default('paged'),
  tapZonesInverted: z.boolean().default(false),
  transition: z.enum(['none', 'slide', 'fade']).default('slide'),
  /** Segundos para a rolagem automática retomar após interação manual (modo híbrido). */
  hybridResumeDelay: z.number().min(0).max(5).default(1),
  /** Segundos de espera antes da rolagem automática começar (ex.: introdução). */
  scrollStartDelay: z.number().min(0).max(60).default(0),
});
export type StageSettings = z.infer<typeof StageSettings>;

export const AppSettings = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  stage: StageSettings.default(StageSettings.parse({})),
  /** Posição preferida por acorde, padrão da conta (cada música pode sobrescrever). */
  chordPrefs: ChordPrefs.default({}),
});
export type AppSettings = z.infer<typeof AppSettings>;

/** Completa configurações parciais (ou inválidas) com os padrões. */
export function parseAppSettings(data: unknown): AppSettings {
  const r = AppSettings.safeParse(data ?? {});
  return r.success ? r.data : AppSettings.parse({});
}

export const UserSettings = SyncColumns.extend({
  userId: Id,
  /** null = configuração global da conta; preenchido = override deste dispositivo. */
  deviceId: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
});
export type UserSettings = z.infer<typeof UserSettings>;

/** Presets prontos de cores do palco. */
export const STAGE_PRESETS: Record<string, Partial<StageColors>> = {
  'Palco escuro': { bg: '#000000', lyric: '#ffffff', chord: '#ffcc00', chorus1: '#00ffff' },
  'Ensaio claro': {
    bg: '#ffffff',
    lyric: '#1c1b18',
    chord: '#b45309',
    chorus1: '#0369a1',
    chorus2: '#15803d',
    chorus3: '#be185d',
    voice2: '#6d28d9',
    tab: '#4b5563',
    note: '#c2410c',
  },
  'Alto contraste': { bg: '#000000', lyric: '#ffffff', chord: '#00ffff', chorus1: '#ffff00' },
  'Sol forte': { bg: '#ffffff', lyric: '#000000', chord: '#c00000', chorus1: '#0040c0' },
};
