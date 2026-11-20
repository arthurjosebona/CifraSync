import { parseSong } from '@cifrasync/core';
import { describe, expect, it } from 'vitest';

import { columnCount, flattenUnits, keepWithNext, paginate } from './paginate';

describe('flattenUnits', () => {
  it('mantém o par cifra+letra como uma unidade só', () => {
    const units = flattenUnits(parseSong('[Verso]\nG     D\nla la\nfim\n\n# nota'));
    expect(units.map((u) => (u.kind === 'line' ? u.line.kind : u.kind))).toEqual([
      'section',
      'pair',
      'lyric',
      'blank',
      'comment',
    ]);
  });

  it('pode esconder anotações pessoais e corta brancos nas pontas', () => {
    const units = flattenUnits(parseSong('\n\n# minha nota\nla\n\n'), { hidePersonalNotes: true });
    expect(units).toHaveLength(1);
  });
});

describe('paginate', () => {
  it('distribui sem cortar unidades', () => {
    expect(paginate([40, 40, 40, 40], [false, false, false, false], 100)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  it('cabeçalho nunca fica sozinho no fim da página', () => {
    // [linha 50][cabeçalho 20][linha 40]: o cabeçalho cabe (70), mas não com a próxima (110)
    expect(paginate([50, 20, 40], [false, true, false], 100)).toEqual([[0], [1, 2]]);
  });

  it('unidade maior que a página fica sozinha', () => {
    expect(paginate([30, 250, 30], [false, false, false], 100)).toEqual([[0], [1], [2]]);
  });

  it('nenhuma página começa com letra separada da cifra (pares são unidades)', () => {
    const units = flattenUnits(
      parseSong(Array.from({ length: 20 }, () => 'G   D\nla la').join('\n')),
    );
    const pages = paginate(
      units.map(() => 50),
      keepWithNext(units),
      120,
    );
    for (const p of pages) {
      const first = units[p[0]!]!;
      expect(first.kind === 'line' && first.line.kind).toBe('pair');
    }
  });
});

describe('columnCount', () => {
  it('auto usa 2 páginas só em paisagem larga', () => {
    expect(columnCount('auto', 1280, 800)).toBe(2);
    expect(columnCount('auto', 800, 1280)).toBe(1);
    expect(columnCount('auto', 900, 500)).toBe(1);
    expect(columnCount('2', 400, 800)).toBe(2);
    expect(columnCount('1', 2000, 800)).toBe(1);
  });
});
