/**
 * Banco local (IndexedDB via Dexie): espelho das tabelas do servidor + fila de mutações.
 * A UI lê e grava só aqui; o motor de sync leva as mudanças ao servidor (ADR 0005).
 */
import type {
  Group,
  GroupMember,
  GroupSetlist,
  Profile,
  Setlist,
  SetlistItem,
  Song,
  UserSettings,
} from '@cifrasync/shared';
import Dexie, { type EntityTable } from 'dexie';

/** Música no banco local: a entidade + palavras normalizadas para busca (não sincronizadas). */
export type LocalSong = Song & { _words: string[] };

export type SyncedTable =
  | 'songs'
  | 'setlists'
  | 'setlistItems'
  | 'groups'
  | 'groupMembers'
  | 'groupSetlists'
  | 'userSettings';

export interface Mutation {
  /** Chave local autoincremental (ordem de envio). */
  localSeq?: number;
  /** Id único da mutação (idempotência no servidor). */
  mid: string;
  table: SyncedTable;
  op: 'upsert' | 'delete';
  rowId: string;
  /** Versão do registro no servidor quando a edição começou. */
  baseVersion: number;
  /** Campos alterados (upsert) — o registro completo, sem campos locais. */
  data: Record<string, unknown>;
  createdAt: string;
  /** true enquanto um envio está em andamento (não pode ser fundido com edições novas). */
  inFlight: boolean;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

export class CifraDB extends Dexie {
  songs!: EntityTable<LocalSong, 'id'>;
  setlists!: EntityTable<Setlist, 'id'>;
  setlistItems!: EntityTable<SetlistItem, 'id'>;
  groups!: EntityTable<Group, 'id'>;
  groupMembers!: EntityTable<GroupMember, 'id'>;
  groupSetlists!: EntityTable<GroupSetlist, 'id'>;
  userSettings!: EntityTable<UserSettings, 'id'>;
  profiles!: EntityTable<Profile, 'id'>;
  outbox!: EntityTable<Mutation, 'localSeq'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name = 'cifrasync') {
    super(name);
    this.version(1).stores({
      songs: 'id, ownerId, title, artist, key, style, updatedAt, *_words',
      setlists: 'id, ownerId, name, eventDate, updatedAt',
      setlistItems: 'id, setlistId, [setlistId+position], songId',
      groups: 'id, ownerId',
      groupMembers: 'id, groupId, userId, [groupId+userId]',
      groupSetlists: 'id, groupId, setlistId',
      userSettings: 'id, userId, [userId+deviceId]',
      profiles: 'id, username',
      outbox: '++localSeq, mid, [table+rowId]',
      meta: 'key',
    });
  }
}

/** Banco padrão do app. Testes criam instâncias próprias com nomes diferentes. */
let defaultDb: CifraDB | null = null;
export function getDb(): CifraDB {
  defaultDb ??= new CifraDB();
  return defaultDb;
}
