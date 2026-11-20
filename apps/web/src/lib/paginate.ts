/**
 * Motor de paginação do palco (docs/contexto/modo-palco.md §2).
 *
 * A música vira uma lista de "unidades indivisíveis" (um par cifra+letra, uma linha, um bloco
 * de tablatura, um cabeçalho). As alturas são medidas no DOM e distribuídas em páginas sem
 * nunca cortar uma unidade — nem separar a cifra da sua letra.
 */
import type { Block, Line, LineStyle, SongDoc } from '@cifrasync/core';

export type Unit =
  | { kind: 'section'; title: string }
  | { kind: 'comment'; text: string; personal: boolean }
  | { kind: 'tab'; title?: string; raw: string[] }
  | { kind: 'line'; line: Line; style: LineStyle; first: boolean; last: boolean };

export interface FlattenOptions {
  hidePersonalNotes?: boolean;
}

/** Achata o documento em unidades, na ordem de exibição. */
export function flattenUnits(doc: SongDoc, opts: FlattenOptions = {}): Unit[] {
  const out: Unit[] = [];
  for (const b of doc.blocks as Block[]) {
    switch (b.kind) {
      case 'section':
        out.push({ kind: 'section', title: b.title });
        break;
      case 'comment':
        if (b.personal && opts.hidePersonalNotes) break;
        out.push({ kind: 'comment', text: b.text, personal: b.personal });
        break;
      case 'tab':
        out.push(
          b.title ? { kind: 'tab', title: b.title, raw: b.raw } : { kind: 'tab', raw: b.raw },
        );
        break;
      case 'lines':
        b.lines.forEach((line, i) =>
          out.push({
            kind: 'line',
            line,
            style: b.style,
            first: i === 0,
            last: i === b.lines.length - 1,
          }),
        );
        break;
    }
  }
  // linhas em branco no começo/fim não ocupam página
  while (out[0]?.kind === 'line' && out[0].line.kind === 'blank') out.shift();
  while (out.at(-1)?.kind === 'line' && (out.at(-1) as { line: Line }).line.kind === 'blank')
    out.pop();
  return out;
}

/** Cabeçalhos (e o rótulo de uma tablatura) ficam presos à unidade seguinte. */
export function keepWithNext(units: Unit[]): boolean[] {
  return units.map((u) => u.kind === 'section');
}

/**
 * Distribui unidades em páginas de altura `pageHeight`.
 * Devolve os índices das unidades de cada página. Uma unidade maior que a página fica
 * sozinha numa página (nunca é cortada).
 */
export function paginate(heights: number[], keep: boolean[], pageHeight: number): number[][] {
  const pages: number[][] = [];
  let page: number[] = [];
  let used = 0;
  const h = Math.max(1, pageHeight);

  for (let i = 0; i < heights.length; i++) {
    // um cabeçalho só entra se couber junto com a próxima unidade
    const need = heights[i]! + (keep[i] && i + 1 < heights.length ? heights[i + 1]! : 0);
    if (page.length && used + need > h) {
      pages.push(page);
      page = [];
      used = 0;
    }
    // linha em branco no topo de página é descartada visualmente, mas mantém o índice
    page.push(i);
    used += heights[i]!;
  }
  if (page.length) pages.push(page);
  return pages;
}

/** Quantas colunas (páginas lado a lado) usar. */
export function columnCount(setting: '1' | '2' | 'auto', width: number, height: number): 1 | 2 {
  if (setting === '1') return 1;
  if (setting === '2') return 2;
  return width >= 960 && width > height ? 2 : 1;
}
