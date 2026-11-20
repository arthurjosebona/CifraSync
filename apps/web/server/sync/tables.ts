/**
 * Tabelas sincronizadas: nome no protocolo ↔ tabela do Drizzle ↔ schema Zod compartilhado.
 */
import {
  Group,
  GroupMember,
  GroupSetlist,
  Setlist,
  SetlistItem,
  Song,
  UserSettings,
} from '@cifrasync/shared';
import type { z } from 'zod';

import {
  groupMembers,
  groups,
  groupSetlists,
  setlistItems,
  setlists,
  songs,
  userSettings,
} from '../db/schema.js';

export const SYNC_TABLES = {
  songs: { table: songs, schema: Song },
  setlists: { table: setlists, schema: Setlist },
  setlistItems: { table: setlistItems, schema: SetlistItem },
  groups: { table: groups, schema: Group },
  groupMembers: { table: groupMembers, schema: GroupMember },
  groupSetlists: { table: groupSetlists, schema: GroupSetlist },
  userSettings: { table: userSettings, schema: UserSettings },
} as const;

export type SyncTableName = keyof typeof SYNC_TABLES;
export const SYNC_TABLE_NAMES = Object.keys(SYNC_TABLES) as SyncTableName[];

export type Row = Record<string, unknown> & {
  id: string;
  version: number;
  seq: number;
  deleted: boolean;
  updatedAt: string;
  updatedByDevice: string;
};

export type RowOf<T extends SyncTableName> = z.infer<(typeof SYNC_TABLES)[T]['schema']>;
