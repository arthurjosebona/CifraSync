/**
 * Acesso a dados da UI: sempre o banco local (offline-first), com consultas reativas.
 */
import { parseAppSettings, type AppSettings } from '@cifrasync/shared';
import {
  getDb,
  getSettingsRows,
  getSong,
  listSetlistItems,
  listSetlists,
  listSongs,
  type SongFilter,
} from '@cifrasync/sync';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

export const db = getDb();

export function useSongs(filter: SongFilter = {}) {
  return useLiveQuery(
    () => listSongs(db, filter),
    [filter.query, filter.artist, filter.key, filter.style],
  );
}

/** `undefined` enquanto carrega; `null` se não existe. */
export function useSong(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await getSong(db, id)) ?? null) : null), [id]);
}

export function useSetlists() {
  return useLiveQuery(() => listSetlists(db), []);
}

export function useSetlist(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null;
    const s = await db.setlists.get(id);
    return s && !s.deleted ? s : null;
  }, [id]);
}

export function useSetlistItems(id: string | undefined) {
  return useLiveQuery(async () => (id ? listSetlistItems(db, id) : []), [id]);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Junta objetos recursivamente (b sobrescreve a). */
export function deepMerge(a: unknown, b: unknown): unknown {
  if (!isObject(a) || !isObject(b)) return b === undefined ? a : b;
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = deepMerge(a[k], v);
  return out;
}

export interface SettingsState {
  settings: AppSettings;
  /** Dados crus de cada escopo, para editar sem perder o que não foi alterado. */
  global: Record<string, unknown>;
  device: Record<string, unknown>;
  /** false enquanto o banco local ainda não respondeu. */
  loaded: boolean;
}

/** Configurações efetivas: padrões ← globais da conta ← override deste dispositivo. */
export function useSettings(): SettingsState {
  const rows = useLiveQuery(() => getSettingsRows(db), []);
  // mesmo objeto enquanto as linhas não mudam: evita refazer layout (palco) a cada render
  return useMemo(() => {
    const global = (rows?.global?.data ?? {}) as Record<string, unknown>;
    const device = (rows?.device?.data ?? {}) as Record<string, unknown>;
    return {
      settings: parseAppSettings(deepMerge(global, device)),
      global,
      device,
      loaded: rows !== undefined,
    };
  }, [rows]);
}
