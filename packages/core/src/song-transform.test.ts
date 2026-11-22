import { describe, expect, it } from 'vitest';

import { formatKey, parseKey } from './notes';
import { parseSong, serializeSong } from './song';
import { applyCapo, detectKey, shapesKey, transposeDoc } from './song-transform';

const t = (text: string, n: number, key?: string) =>
  serializeSong(transposeDoc(parseSong(text), n, key ? { targetKey: parseKey(key)! } : {}));

describe('transposeDoc', () => {
  it('critério da SPEC: mantém cada acorde na coluna da sílaba', () => {
    const src = ['G      D/F#   Em7    C7M(9)', 'Vem    cá     meu    bem'].join('\n');
    expect(t(src, 2, 'A')).toBe(
      ['A      E/G#   F#m7   D7M(9)', 'Vem    cá     meu    bem'].join('\n'),
    );
  });

  it('empurra acordes que crescem e colidiriam', () => {
    // Lá maior usa sustenidos: G → G#, D → D#
    expect(t('G D\nab cd', 1, 'A')).toBe('G# D#\nab cd');
  });

  it('usa bemóis para Fá e não mexe na tablatura', () => {
    const src = 'C  G  Am\nLetra aqui\n{tab}\ne|--0--3--|\n{/tab}';
    const out = t(src, 5, 'F');
    expect(out).toBe('F  C  Dm\nLetra aqui\n{tab}\ne|--0--3--|\n{/tab}');
    expect(t('A  E\nla la', 1, 'Bb')).toBe('Bb F\nla la');
  });

  it('transpõe também linhas só de cifra e preserva rótulos e símbolos', () => {
    expect(t('Intro: G  D  | Em  C (x2)', 2, 'A')).toBe('Intro: A  E  | F#m D (x2)');
  });

  it('acordes entre parênteses mantêm os parênteses', () => {
    expect(t('(G)   (D)\nla    la', 2, 'A')).toBe('(A)   (E)\nla    la');
  });

  it('0 semitons devolve o mesmo documento', () => {
    const d = parseSong('G\nla');
    expect(transposeDoc(d, 0)).toBe(d);
    expect(transposeDoc(d, 12)).toBe(d);
  });
});

describe('capotraste', () => {
  const doc = parseSong('A    D    E\nVem  cá   bem');

  it('critério da SPEC: capo 2 em Lá mostra formas de Sol', () => {
    const shapes = applyCapo(doc, 2, 'shapes', parseKey('A')!);
    expect(serializeSong(shapes)).toBe('G    C    D\nVem  cá   bem');
    expect(formatKey(shapesKey(parseKey('A')!, 2))).toBe('G');
  });

  it('modo "como soa" não muda nada', () => {
    expect(applyCapo(doc, 2, 'sounding')).toBe(doc);
  });

  it('formas com capo usam a grafia do tom das formas', () => {
    const d = parseSong('C#   F#\nla   la');
    expect(serializeSong(applyCapo(d, 1, 'shapes', parseKey('C#')!))).toBe('C    F\nla   la');
    const e = parseSong('Eb   Ab\nla   la');
    expect(serializeSong(applyCapo(e, 3, 'shapes', parseKey('Eb')!))).toBe('C    F\nla   la');
  });
});

describe('detectKey', () => {
  it.each([
    ['G D Em C G D G', 'G'],
    ['C Am F G C', 'C'],
    ['Am Dm E7 Am', 'Am'],
    ['Em C G D Em', 'Em'],
    ['D A Bm G D', 'D'],
    ['F Bb C7 F', 'F'],
    ['E B C#m A E', 'E'],
    ['Bb Gm Eb F7 Bb', 'Bb'],
    // trecho que termina na dominante: B7 é o V de E, não a tônica
    ['E B7 E B7', 'E'],
    ['E B7', 'E'],
  ])('%s → %s', (line, key) => {
    const guess = detectKey(parseSong(line));
    expect(guess && formatKey(guess.key)).toBe(key);
    expect(guess!.confidence).toBeGreaterThan(0.5);
  });

  it('sem acordes → null', () => {
    expect(detectKey(parseSong('só letra aqui'))).toBeNull();
  });
});
