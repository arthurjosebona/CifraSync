/**
 * Entidades sincronizadas — o mesmo contrato no cliente (IndexedDB) e no servidor (Postgres).
 * Ver docs/contexto/sincronizacao-offline.md §2.
 */
import { z } from 'zod';

export const Id = z.string().uuid();
export type Id = z.infer<typeof Id>;

/** Colunas presentes em toda tabela sincronizada. */
export const SyncColumns = z.object({
  id: Id,
  /** Incrementa a cada escrita aceita pelo servidor; 0 = ainda não enviada. */
  version: z.number().int().nonnegative(),
  /** Cursor global atribuído pelo servidor; null enquanto só existe localmente. */
  seq: z.number().int().nonnegative().nullable(),
  /** Exclusão lógica (tombstone), para propagar a outros dispositivos. */
  deleted: z.boolean(),
  /** ISO 8601. */
  updatedAt: z.string(),
  updatedByDevice: z.string(),
});
export type SyncColumns = z.infer<typeof SyncColumns>;

export const INSTRUMENT_IDS = ['violao', 'cavaco', 'ukulele'] as const;
export const InstrumentId = z.enum(INSTRUMENT_IDS);

/** Posição preferida por acorde e instrumento: { violao: { F: 1 } }. */
export const ChordPrefs = z.partialRecord(
  InstrumentId,
  z.record(z.string(), z.number().int().min(0)),
);
export type ChordPrefs = z.infer<typeof ChordPrefs>;

export const Song = SyncColumns.extend({
  ownerId: Id,
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200),
  /** Tom em que a cifra foi escrita, ex.: "G", "F#m". */
  key: z.string().max(4).nullable(),
  capo: z.number().int().min(0).max(11),
  /** Deslocamento preferido do usuário em semitons. */
  transpose: z.number().int().min(-11).max(11),
  style: z.string().max(60),
  bpm: z.number().int().min(20).max(400).nullable(),
  durationSec: z.number().int().min(1).max(3600).nullable(),
  /** Velocidade de rolagem salva (px/s), se definida. */
  scrollSpeed: z.number().positive().max(500).nullable(),
  /** Texto da cifra com marcações (ver docs/contexto/dominio-musical.md). */
  content: z.string().max(100_000),
  chordPrefs: ChordPrefs,
  notes: z.string().max(5_000),
});
export type Song = z.infer<typeof Song>;

export const Setlist = SyncColumns.extend({
  ownerId: Id,
  name: z.string().trim().min(1).max(200),
  /** AAAA-MM-DD. */
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  notes: z.string().max(5_000),
});
export type Setlist = z.infer<typeof Setlist>;

export const SetlistItem = SyncColumns.extend({
  setlistId: Id,
  kind: z.enum(['song', 'moment']),
  /** Preenchido quando kind = song. */
  songId: Id.nullable(),
  /** Texto do momento ("Intervalo") quando kind = moment. */
  label: z.string().max(100).nullable(),
  /** Índice fracionário para ordenar sem reescrever os vizinhos. */
  position: z.string().min(1).max(64),
  /** Tom próprio neste repertório (semitons sobre o tom escrito); null = usa o da música. */
  transpose: z.number().int().min(-11).max(11).nullable(),
  note: z.string().max(500),
});
export type SetlistItem = z.infer<typeof SetlistItem>;

export const GroupRole = z.enum(['owner', 'editor', 'member']);
export type GroupRole = z.infer<typeof GroupRole>;

export const Group = SyncColumns.extend({
  ownerId: Id,
  name: z.string().trim().min(1).max(100),
});
export type Group = z.infer<typeof Group>;

export const GroupMember = SyncColumns.extend({
  groupId: Id,
  userId: Id,
  role: GroupRole,
  status: z.enum(['pending', 'active']),
});
export type GroupMember = z.infer<typeof GroupMember>;

export const GroupSetlist = SyncColumns.extend({
  groupId: Id,
  setlistId: Id,
  addedBy: Id,
});
export type GroupSetlist = z.infer<typeof GroupSetlist>;

/** Perfil público mínimo de um usuário (membros de grupo, busca por nome de usuário). */
export const Profile = z.object({
  id: Id,
  username: z.string(),
  name: z.string(),
});
export type Profile = z.infer<typeof Profile>;

export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/;
export const Username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_RE, 'Use 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou _');
