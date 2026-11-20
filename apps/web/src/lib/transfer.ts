/**
 * Importação e exportação (RF-13): música em .txt (cifra) ou .cho (ChordPro) e backup completo
 * em JSON. Tudo funciona offline, a partir do banco local.
 */
import {
  autoFormat,
  fromChordPro,
  parseKey,
  formatKey,
  parseSong,
  toChordPro,
} from '@cifrasync/core';
import type { Setlist, SetlistItem, Song } from '@cifrasync/shared';
import {
  addSetlistItem,
  listSetlistItems,
  listSetlists,
  listSongs,
  saveSetlist,
  saveSong,
} from '@cifrasync/sync';

import { platform } from '../platform';
import { db } from './data';

function slug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g'), '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'musica'
  );
}

function titleFromFile(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Música importada'
  );
}

/** Importa um arquivo de música (.txt/.cho/.chordpro/.pro). Devolve a música criada. */
export async function importSongFile(file: File): Promise<Song> {
  const text = await file.text();
  const isChordPro =
    /\.(cho|chordpro|chopro|pro|crd)$/i.test(file.name) || /^\s*\{(t|title)\s*:/m.test(text);
  if (isChordPro) {
    const { text: content, meta } = fromChordPro(text);
    const key = meta.key ? parseKey(meta.key) : null;
    return saveSong(db, {
      title: meta.title || titleFromFile(file.name),
      artist: meta.artist ?? '',
      key: key ? formatKey(key) : null,
      capo: meta.capo && meta.capo >= 0 && meta.capo <= 11 ? meta.capo : 0,
      content,
    });
  }
  const { text: content } = autoFormat(text);
  return saveSong(db, { title: titleFromFile(file.name), content });
}

export async function exportSongText(song: Song): Promise<void> {
  await platform().saveFile(
    `${slug(song.title)}.txt`,
    new Blob([song.content], { type: 'text/plain' }),
  );
}

export async function exportSongChordPro(song: Song): Promise<void> {
  const cho = toChordPro(parseSong(song.content), {
    title: song.title,
    ...(song.artist ? { artist: song.artist } : {}),
    ...(song.key ? { key: song.key } : {}),
    ...(song.capo ? { capo: song.capo } : {}),
  });
  await platform().saveFile(`${slug(song.title)}.cho`, new Blob([cho], { type: 'text/plain' }));
}

export interface Backup {
  format: 'cifrasync-backup';
  version: 1;
  exportedAt: string;
  songs: Song[];
  setlists: Setlist[];
  setlistItems: SetlistItem[];
}

/** Backup de tudo que está neste aparelho (só o que é do usuário). */
export async function exportBackup(ownerId: string | undefined): Promise<void> {
  const songs = (await listSongs(db)).filter((s) => !ownerId || s.ownerId === ownerId);
  const setlists = (await listSetlists(db)).filter((s) => !ownerId || s.ownerId === ownerId);
  const setlistItems = (await Promise.all(setlists.map((s) => listSetlistItems(db, s.id)))).flat();
  const backup: Backup = {
    format: 'cifrasync-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    songs,
    setlists,
    setlistItems,
  };
  const date = backup.exportedAt.slice(0, 10);
  await platform().saveFile(
    `cifrasync-backup-${date}.json`,
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
  );
}

/**
 * Restaura um backup como cópias novas (não sobrescreve nada): músicas, repertórios e a ordem
 * dos itens. Devolve quantos itens foram criados.
 */
export async function restoreBackup(file: File): Promise<{ songs: number; setlists: number }> {
  const data = JSON.parse(await file.text()) as Partial<Backup>;
  if (data.format !== 'cifrasync-backup' || !Array.isArray(data.songs)) {
    throw new Error('Arquivo não é um backup do CifraSync.');
  }
  const songIds = new Map<string, string>();
  for (const s of data.songs) {
    if (s.deleted) continue;
    const copy = await saveSong(db, {
      title: s.title,
      artist: s.artist,
      key: s.key,
      capo: s.capo,
      transpose: s.transpose,
      style: s.style,
      bpm: s.bpm,
      durationSec: s.durationSec,
      scrollSpeed: s.scrollSpeed,
      content: s.content,
      chordPrefs: s.chordPrefs,
      notes: s.notes,
    });
    songIds.set(s.id, copy.id);
  }
  let setlists = 0;
  for (const sl of data.setlists ?? []) {
    if (sl.deleted) continue;
    const copy = await saveSetlist(db, { name: sl.name, eventDate: sl.eventDate, notes: sl.notes });
    setlists++;
    const items = (data.setlistItems ?? [])
      .filter((i) => i.setlistId === sl.id && !i.deleted)
      .sort((a, b) => (a.position < b.position ? -1 : 1));
    for (const it of items) {
      if (it.kind === 'moment') {
        await addSetlistItem(db, copy.id, { kind: 'moment', label: it.label ?? '' });
      } else if (it.songId && songIds.has(it.songId)) {
        await addSetlistItem(db, copy.id, {
          kind: 'song',
          songId: songIds.get(it.songId)!,
          transpose: it.transpose,
          note: it.note,
        });
      }
    }
  }
  return { songs: songIds.size, setlists };
}
