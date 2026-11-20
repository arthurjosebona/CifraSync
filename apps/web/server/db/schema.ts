/**
 * Schema do Postgres (Neon em produção, PGlite em desenvolvimento e testes).
 * Ver docs/contexto/sincronizacao-offline.md §2 e ADR 0004/0005.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Autenticação (Better Auth + plugin username)
// ---------------------------------------------------------------------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Sincronização
// ---------------------------------------------------------------------------

/** Cursor global: toda escrita recebe o próximo valor (trigger na migration). */
export const syncSeq = pgSequence('sync_seq');

/** Colunas comuns a toda tabela sincronizada (novas instâncias a cada tabela). */
function syncColumns() {
  return {
    id: text('id').primaryKey(),
    version: integer('version').notNull().default(1),
    seq: bigint('seq', { mode: 'number' })
      .notNull()
      .default(sql`nextval('sync_seq')`),
    deleted: boolean('deleted').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedByDevice: text('updated_by_device').notNull().default(''),
  };
}

export const songs = pgTable(
  'songs',
  {
    ...syncColumns(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    artist: text('artist').notNull().default(''),
    key: text('key'),
    capo: integer('capo').notNull().default(0),
    transpose: integer('transpose').notNull().default(0),
    style: text('style').notNull().default(''),
    bpm: integer('bpm'),
    durationSec: integer('duration_sec'),
    scrollSpeed: real('scroll_speed'),
    content: text('content').notNull().default(''),
    chordPrefs: jsonb('chord_prefs').notNull().default({}),
    notes: text('notes').notNull().default(''),
  },
  (t) => [index('songs_owner_seq_idx').on(t.ownerId, t.seq)],
);

export const setlists = pgTable(
  'setlists',
  {
    ...syncColumns(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    eventDate: text('event_date'),
    notes: text('notes').notNull().default(''),
  },
  (t) => [index('setlists_owner_seq_idx').on(t.ownerId, t.seq)],
);

export const setlistItems = pgTable(
  'setlist_items',
  {
    ...syncColumns(),
    setlistId: text('setlist_id')
      .notNull()
      .references(() => setlists.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['song', 'moment'] }).notNull(),
    songId: text('song_id'),
    label: text('label'),
    position: text('position').notNull(),
    transpose: integer('transpose'),
    note: text('note').notNull().default(''),
  },
  (t) => [
    index('setlist_items_setlist_seq_idx').on(t.setlistId, t.seq),
    index('setlist_items_song_idx').on(t.songId),
  ],
);

export const groups = pgTable(
  'groups',
  {
    ...syncColumns(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
  },
  (t) => [index('groups_owner_idx').on(t.ownerId)],
);

export const groupMembers = pgTable(
  'group_members',
  {
    ...syncColumns(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'editor', 'member'] }).notNull(),
    status: text('status', { enum: ['pending', 'active'] }).notNull(),
  },
  (t) => [
    uniqueIndex('group_members_group_user_uq').on(t.groupId, t.userId),
    index('group_members_group_seq_idx').on(t.groupId, t.seq),
    index('group_members_user_idx').on(t.userId),
  ],
);

export const groupSetlists = pgTable(
  'group_setlists',
  {
    ...syncColumns(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    setlistId: text('setlist_id')
      .notNull()
      .references(() => setlists.id, { onDelete: 'cascade' }),
    addedBy: text('added_by').notNull(),
  },
  (t) => [
    uniqueIndex('group_setlists_group_setlist_uq').on(t.groupId, t.setlistId),
    index('group_setlists_group_seq_idx').on(t.groupId, t.seq),
    index('group_setlists_setlist_idx').on(t.setlistId),
  ],
);

export const userSettings = pgTable(
  'user_settings',
  {
    ...syncColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    deviceId: text('device_id'),
    data: jsonb('data').notNull().default({}),
  },
  (t) => [index('user_settings_user_seq_idx').on(t.userId, t.seq)],
);

/** Mutações já aplicadas (idempotência do push); limpas após 7 dias. */
export const appliedMutations = pgTable(
  'applied_mutations',
  {
    mid: text('mid').primaryKey(),
    userId: text('user_id').notNull(),
    result: jsonb('result').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('applied_mutations_created_idx').on(t.createdAt)],
);
