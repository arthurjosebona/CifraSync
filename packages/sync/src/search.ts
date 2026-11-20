/**
 * Índice de busca local: palavras normalizadas (minúsculas, sem acento) de título, artista,
 * estilo e letra. A busca exige que cada termo digitado seja prefixo de alguma palavra.
 */
import { lyricText, parseSong } from '@cifrasync/core';

const COMBINING = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, 'g');

export function normalize(s: string): string {
  return s.normalize('NFD').replace(COMBINING, '').toLowerCase();
}

export function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
}

export function songWords(song: {
  title: string;
  artist: string;
  style: string;
  content: string;
}): string[] {
  const lyric = lyricText(parseSong(song.content));
  const words = new Set([
    ...tokens(song.title),
    ...tokens(song.artist),
    ...tokens(song.style),
    ...tokens(lyric),
  ]);
  return [...words];
}

/** true se todos os termos da consulta são prefixos de alguma palavra. */
export function matchesQuery(words: string[], query: string): boolean {
  const terms = tokens(query);
  return terms.every((t) => words.some((w) => w.startsWith(t)));
}
