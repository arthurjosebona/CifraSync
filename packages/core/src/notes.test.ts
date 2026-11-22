import { describe, expect, it } from 'vitest';

import {
  formatKey,
  interval,
  keyFromPc,
  noteName,
  parseKey,
  parseNote,
  readNote,
  spellingForKey,
  transposeKey,
} from './notes';

describe('notas', () => {
  it.each([
    ['C', 0],
    ['C#', 1],
    ['Db', 1],
    ['E', 4],
    ['E#', 5],
    ['Fb', 4],
    ['B#', 0],
    ['Cb', 11],
    ['G♯', 8],
    ['B♭', 10],
  ])('parseNote(%s) = %i', (s, pc) => {
    expect(parseNote(s)?.pc).toBe(pc);
  });

  it('rejeita o que não é nota', () => {
    expect(parseNote('H')).toBeNull();
    expect(parseNote('c')).toBeNull();
    expect(parseNote('C#m')).toBeNull();
  });

  it('readNote consome só a nota', () => {
    expect(readNote('F#m7')).toEqual({ note: { pc: 6, name: 'F#' }, length: 2 });
  });

  it('nomeia classes de altura por grafia', () => {
    expect(noteName(10, 'sharps')).toBe('A#');
    expect(noteName(10, 'flats')).toBe('Bb');
    expect(noteName(10)).toBe('Bb');
    expect(noteName(6)).toBe('F#');
    expect(noteName(-1)).toBe('B');
    expect(noteName(13)).toBe('C#');
  });

  it('calcula intervalos ascendentes', () => {
    expect(interval(0, 7)).toBe(7);
    expect(interval(7, 0)).toBe(5);
    expect(interval(4, 4)).toBe(0);
  });
});

describe('tons', () => {
  it('lê e formata tons', () => {
    expect(formatKey(parseKey('F#m')!)).toBe('F#m');
    expect(formatKey(parseKey('Bb')!)).toBe('Bb');
    expect(parseKey('Bbm')?.minor).toBe(true);
    expect(parseKey('X')).toBeNull();
    expect(parseKey('C7')).toBeNull();
  });

  it.each([
    ['F', 'flats'],
    ['Bb', 'flats'],
    ['Eb', 'flats'],
    ['G', 'sharps'],
    ['A', 'sharps'],
    ['E', 'sharps'],
    ['C', 'default'],
    ['Dm', 'flats'],
    ['Em', 'sharps'],
    ['Am', 'default'],
    // mesma nota, grafias diferentes: o nome do tom decide
    ['F#', 'sharps'],
    ['Gb', 'flats'],
    ['C#m', 'sharps'],
  ])('tom %s usa grafia %s', (k, spelling) => {
    expect(spellingForKey(parseKey(k)!)).toBe(spelling);
  });

  it('escolhe o nome usual do tom', () => {
    expect(keyFromPc(10, false).tonic.name).toBe('Bb');
    expect(keyFromPc(6, false).tonic.name).toBe('F#');
    expect(keyFromPc(1, true).tonic.name).toBe('C#');
    expect(keyFromPc(3, true).tonic.name).toBe('Eb');
  });

  it('transpõe tons', () => {
    expect(formatKey(transposeKey(parseKey('G')!, 2))).toBe('A');
    expect(formatKey(transposeKey(parseKey('C')!, 5))).toBe('F');
    expect(formatKey(transposeKey(parseKey('Am')!, -2))).toBe('Gm');
  });
});
