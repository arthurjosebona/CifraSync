import { describe, expect, it } from 'vitest';

import { autoFormat, expandTabs, splitInlineChords } from './format';

describe('expandTabs', () => {
  it('respeita colunas', () => {
    expect(expandTabs('G\tD', 4)).toBe('G   D');
    expect(expandTabs('Em\tC', 4)).toBe('Em  C');
    expect(expandTabs('\tA', 8)).toBe('        A');
  });
});

describe('splitInlineChords', () => {
  it('converte ChordPro em cifra sobre a letra', () => {
    expect(splitInlineChords('[G]Quando a [D/F#]noite chegar')).toEqual([
      'G        D/F#',
      'Quando a noite chegar',
    ]);
  });

  it('afasta acordes colados', () => {
    expect(splitInlineChords('[Am]a[F]b')).toEqual(['Am F', 'a  b']);
  });

  it('ignora colchetes que não são acordes', () => {
    expect(splitInlineChords('[Refrão] vamos lá')).toBeNull();
    expect(splitInlineChords('sem acordes')).toBeNull();
  });
});

describe('autoFormat', () => {
  it('normaliza quebras, tabs, NBSP e linhas vazias', () => {
    const { text } = autoFormat('\r\n\r\nG\tD\r\nLetra aqui   \r\n\r\n\r\n\r\nFim\r\n\r\n');
    expect(text).toBe('G       D\nLetra aqui\n\n\nFim');
  });

  it('envolve tablaturas soltas em {tab}', () => {
    const { text, report } = autoFormat('Solo:\ne|--0--3--|\nB|--1-----|\nLetra depois');
    expect(text).toBe('Solo:\n{tab}\ne|--0--3--|\nB|--1-----|\n{/tab}\nLetra depois');
    expect(report.counts.tab).toBe(2);
  });

  it('não mexe dentro de {tab} existente', () => {
    const src = '{tab}\nqualquer coisa\n{/tab}';
    expect(autoFormat(src).text).toBe(src);
  });

  it('converte linhas ChordPro', () => {
    expect(autoFormat('[C]Ô ô [G]ô').text).toBe('C   G\nÔ ô ô');
  });

  it('conta linhas e aponta tokens desconhecidos em linhas de cifra', () => {
    const { report } = autoFormat('G  D  Em  Cx  C\nLetra da música\n[Refrão]');
    expect(report.counts).toEqual({ chords: 1, lyric: 1, tab: 0, header: 1, comment: 0 });
    expect(report.unknown).toEqual([{ line: 0, token: 'Cx' }]);
  });

  it('sugere refrão por título de seção', () => {
    const { report } = autoFormat('[Verso]\nlinha a\nlinha b\n\n[Refrão]\nC  G\nÔ ô ô\nÉ o som');
    expect(report.chorusSuggestions).toEqual([{ from: 5, to: 7, reason: 'secao-refrao' }]);
  });

  it('sugere refrão por repetição', () => {
    const src = [
      'primeira estrofe aqui',
      'segunda linha dela',
      '',
      'C        G',
      'Ô ô ô é o nosso som',
      'Vem cantar com a gente',
      '',
      'outra estrofe aqui',
      'com outra linha',
      '',
      'C        G',
      'Ô ô ô, é o nosso som!',
      'Vem cantar com a gente',
    ].join('\n');
    expect(autoFormat(src).report.chorusSuggestions).toEqual([
      { from: 3, to: 5, reason: 'repeticao' },
      { from: 10, to: 12, reason: 'repeticao' },
    ]);
  });
});
