import { describe, expect, it } from 'vitest';

import { fromChordPro, toChordPro } from './chordpro';
import { parseSong, serializeSong } from './song';

const SONG = `[Primeira parte]
G               D/F#
Quando a noite chegar

{refrao:2}
C        G
Ô ô ô, é o nosso som
{/refrao}

{voz2}
(é o nosso som)
{/voz2}

{tab:Solo}
e|-----0---3---|
{/tab}

# segurar o último acorde
{nota}Baixo entra na 2ª volta{/nota}
Intro: G  D`;

describe('toChordPro', () => {
  const cho = toChordPro(parseSong(SONG), { title: 'Teste', artist: 'Autor', key: 'G', capo: 2 });

  it('escreve metadados e seções', () => {
    expect(cho).toContain('{title: Teste}');
    expect(cho).toContain('{artist: Autor}');
    expect(cho).toContain('{key: G}');
    expect(cho).toContain('{capo: 2}');
    expect(cho).toContain('{comment: Primeira parte}');
    expect(cho).toContain('{start_of_chorus: Refrão 2}');
    expect(cho).toContain('{start_of_tab: Solo}');
    expect(cho).toContain('{start_of_voz2}');
    expect(cho).toContain('# segurar o último acorde');
    expect(cho).toContain('{comment_italic: Baixo entra na 2ª volta}');
  });

  it('coloca acordes dentro da letra', () => {
    expect(cho).toContain('[G]Quando a noite c[D/F#]hegar');
    expect(cho).toContain('[C]Ô ô ô, é [G]o nosso som');
  });
});

describe('fromChordPro', () => {
  it('importa ChordPro típico', () => {
    const src = [
      '{title: Canção}',
      '{st: Fulano}',
      '{key: D}',
      '{sov}',
      '[D]Linha um da [A]música',
      '{eov}',
      '{soc}',
      '[G]Refrão [D]aqui',
      '{eoc}',
      '{sot}',
      'e|--0--|',
      '{eot}',
      '{c: Final}',
      '[D]  [A]  [D]',
    ].join('\n');
    const { text, meta } = fromChordPro(src);
    expect(meta).toEqual({ title: 'Canção', artist: 'Fulano', key: 'D' });
    expect(text).toBe(
      [
        '[Verso]',
        'D           A',
        'Linha um da música',
        '{refrao:1}',
        'G      D',
        'Refrão aqui',
        '{/refrao}',
        '{tab}',
        'e|--0--|',
        '{/tab}',
        '[Final]',
        'D    A    D',
      ].join('\n'),
    );
  });

  it('ida e volta preserva o documento', () => {
    const doc = parseSong(SONG);
    const back = parseSong(fromChordPro(toChordPro(doc)).text);
    expect(serializeSong(back)).toBe(serializeSong(doc));
  });
});
