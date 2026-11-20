import { formatKey, parseKey, transposeKey } from '@cifrasync/core';
import type { Setlist, SetlistItem, Song } from '@cifrasync/shared';

/** Semitons efetivos de um item: o do repertório, senão o salvo na música. */
export function itemSemitones(item: SetlistItem, song: Song | undefined): number {
  return item.transpose ?? song?.transpose ?? 0;
}

/** Tom em que a música soa neste repertório (ou null se o tom é desconhecido). */
export function itemKey(item: SetlistItem, song: Song | undefined): string | null {
  const k = song?.key ? parseKey(song.key) : null;
  return k ? formatKey(transposeKey(k, itemSemitones(item, song))) : null;
}

/** Texto do repertório para colar no WhatsApp/e-mail, com numeração e tons. */
export function setlistAsText(
  setlist: Setlist,
  items: SetlistItem[],
  songs: Map<string, Song>,
): string {
  const lines = [setlist.name];
  if (setlist.eventDate) {
    const [y, m, d] = setlist.eventDate.split('-');
    lines[0] += ` — ${d}/${m}/${y}`;
  }
  lines.push('');
  let n = 0;
  for (const it of items) {
    if (it.kind === 'moment') {
      lines.push('', `— ${it.label ?? ''} —`, '');
      continue;
    }
    const song = songs.get(it.songId ?? '');
    n++;
    const key = itemKey(it, song);
    const artist = song?.artist ? ` (${song.artist})` : '';
    lines.push(`${n}. ${song?.title ?? 'Música removida'}${artist}${key ? ` — ${key}` : ''}`);
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
