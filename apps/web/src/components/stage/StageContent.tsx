import type { SongDoc } from '@cifrasync/core';
import type { StageSettings } from '@cifrasync/shared';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { columnCount, flattenUnits, keepWithNext, paginate } from '../../lib/paginate';
import type { SongViewOptions } from '../SongView';
import { UnitView } from './UnitView';

export type StageMode = 'paged' | 'autoscroll' | 'hybrid';
export type TapZone = 'left' | 'center' | 'right';

export interface StageContentApi {
  /** Avança uma página (ou meia tela na rolagem). Retorna false se já está no fim. */
  next(): boolean;
  prev(): boolean;
  toStart(): void;
  toEnd(): void;
}

export interface StageContentProps {
  doc: SongDoc;
  stage: StageSettings;
  mode: StageMode;
  /** Rolagem automática ligada (modos autoscroll e híbrido). */
  playing: boolean;
  /** Velocidade em px/s (negativa = sobe). */
  speed: number;
  /** Atraso antes de começar a rolar, em segundos. */
  startDelay: number;
  /** Abrir no fim (ao voltar da música seguinte). */
  startAtEnd?: boolean;
  onTap(zone: TapZone): void;
  /** Chamado quando a navegação passa do fim ou do começo da música. */
  onBoundary(dir: 'next' | 'prev'): void;
  onPageChange?(page: number, total: number): void;
  /** Rolagem chegou ao fim (para o aviso de última página). */
  onScrollEnd?(atEnd: boolean): void;
  /** Altura rolável disponível — usada para calcular a velocidade pela duração. */
  onScrollableHeight?(px: number): void;
}

const TAP_MAX_MOVE = 10;
const TAP_MAX_MS = 350;
const DOUBLE_TAP_GUARD_MS = 300;

export const StageContent = forwardRef<StageContentApi, StageContentProps>(function StageContent(
  {
    doc,
    stage,
    mode,
    playing,
    speed,
    startDelay,
    startAtEnd,
    onTap,
    onBoundary,
    onPageChange,
    onScrollEnd,
    onScrollableHeight,
  },
  ref,
) {
  const opts = useMemo<Required<SongViewOptions>>(
    () => ({
      showChords: stage.showChords,
      hidePersonalNotes: stage.hidePersonalNotes,
      uppercase: stage.uppercase,
      center: stage.center,
      chorusStyle: stage.chorusStyle,
      chordStyle: stage.chordStyle,
    }),
    [stage],
  );
  const units = useMemo(
    () => flattenUnits(doc, { hidePersonalNotes: stage.hidePersonalNotes }),
    [doc, stage.hidePersonalNotes],
  );

  // ---------------------------------------------------------------- tamanho
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = area.current!;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const cols = mode === 'paged' ? columnCount(stage.columns, size.w, size.h) : 1;
  const gap = 32;
  const colWidth = cols === 2 ? (size.w - gap) / 2 : size.w;

  // ---------------------------------------------------------------- paginação
  const measure = useRef<(HTMLDivElement | null)[]>([]);
  // a divisão guarda as linhas para as quais foi calculada: ao trocar de música, a divisão
  // da anterior não pode ser aplicada às linhas da nova (índices fora do lugar)
  const [layout, setLayout] = useState<{ units: typeof units; pages: number[][] }>({
    units,
    pages: [],
  });
  const pages = useMemo(() => (layout.units === units ? layout.pages : []), [layout, units]);
  useLayoutEffect(() => {
    if (mode !== 'paged' || !size.h) return;
    const heights = units.map((_, i) => {
      const el = measure.current[i];
      if (!el) return 0;
      const cs = getComputedStyle(el);
      return el.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    });
    const next = paginate(heights, keepWithNext(units), size.h);
    // só atualiza se a divisão mudou (evita render em laço)
    setLayout((prev) =>
      prev.units === units && JSON.stringify(prev.pages) === JSON.stringify(next)
        ? prev
        : { units, pages: next },
    );
  }, [units, mode, size.h, colWidth, opts, stage.fontSize, stage.lineHeight, stage.fontFamily]);

  const spreads = useMemo(() => {
    const out: number[][][] = [];
    for (let i = 0; i < pages.length; i += cols) out.push(pages.slice(i, i + cols));
    return out;
  }, [pages, cols]);

  const [spread, setSpread] = useState(0);
  const [anim, setAnim] = useState<'next' | 'prev' | null>(null);
  const [docSeen, setDocSeen] = useState(doc);
  if (docSeen !== doc) {
    setDocSeen(doc);
    setSpread(startAtEnd ? Number.MAX_SAFE_INTEGER : 0);
    setAnim(null);
  }
  const current = Math.min(spread, Math.max(0, spreads.length - 1));
  useEffect(() => {
    if (mode === 'paged' && spreads.length) onPageChange?.(current, spreads.length);
  }, [current, spreads.length, mode, onPageChange]);

  // ---------------------------------------------------------------- rolagem
  const scroller = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const interacting = useRef(false);
  const resumeAt = useRef(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (mode === 'paged') return;
    const el = scroller.current;
    if (!el) return;
    if (startAtEnd) el.scrollTop = el.scrollHeight;
    pos.current = el.scrollTop;
    startedAt.current = performance.now();
    onScrollableHeight?.(el.scrollHeight - el.clientHeight);
  }, [doc, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode === 'paged' || !playing) return;
    const el = scroller.current!;
    let raf = 0;
    let last = performance.now();
    pos.current = el.scrollTop;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const waiting = now - startedAt.current < startDelay * 1000;
      const paused = interacting.current || now < resumeAt.current;
      if (paused) {
        // modo híbrido: continua de onde o músico deixou
        pos.current = el.scrollTop;
      } else if (!waiting) {
        pos.current = Math.max(
          0,
          Math.min(el.scrollHeight - el.clientHeight, pos.current + speed * dt),
        );
        el.scrollTop = pos.current;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, playing, speed, startDelay]);

  const onScroll = () => {
    const el = scroller.current!;
    onScrollEnd?.(el.scrollTop + el.clientHeight >= el.scrollHeight - 4);
  };

  // ---------------------------------------------------------------- navegação
  const go = useCallback(
    (dir: 'next' | 'prev'): boolean => {
      if (mode === 'paged') {
        const target = current + (dir === 'next' ? 1 : -1);
        if (target < 0 || target >= spreads.length) {
          onBoundary(dir);
          return false;
        }
        setAnim(dir);
        setSpread(target);
        return true;
      }
      const el = scroller.current!;
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      const atStart = el.scrollTop <= 4;
      if ((dir === 'next' && atEnd) || (dir === 'prev' && atStart)) {
        onBoundary(dir);
        return false;
      }
      const delta = el.clientHeight * 0.5 * (dir === 'next' ? 1 : -1);
      el.scrollBy({ top: delta, behavior: 'smooth' });
      resumeAt.current = performance.now() + stage.hybridResumeDelay * 1000 + 400;
      return true;
    },
    [mode, current, spreads.length, onBoundary, stage.hybridResumeDelay],
  );

  useImperativeHandle(
    ref,
    () => ({
      next: () => go('next'),
      prev: () => go('prev'),
      toStart() {
        if (mode === 'paged') setSpread(0);
        else scroller.current?.scrollTo({ top: 0 });
      },
      toEnd() {
        if (mode === 'paged') setSpread(Number.MAX_SAFE_INTEGER);
        else scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
      },
    }),
    [go, mode],
  );

  // ---------------------------------------------------------------- toques
  const down = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef(0);
  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (mode !== 'paged') interacting.current = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (mode !== 'paged') {
      interacting.current = false;
      resumeAt.current = performance.now() + stage.hybridResumeDelay * 1000;
    }
    if (!d) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    const now = performance.now();
    if (moved > TAP_MAX_MOVE || now - d.t > TAP_MAX_MS) return;
    if (now - lastTap.current < DOUBLE_TAP_GUARD_MS) return;
    lastTap.current = now;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    // metades esquerda/direita navegam (SPEC); só a faixa central estreita abre os controles
    let zone: TapZone = rel < 0.4 ? 'left' : rel > 0.6 ? 'right' : 'center';
    if (stage.tapZonesInverted && zone !== 'center') zone = zone === 'left' ? 'right' : 'left';
    onTap(zone);
  };
  const onWheel = () => {
    if (mode !== 'paged') resumeAt.current = performance.now() + stage.hybridResumeDelay * 1000;
  };

  const style = {
    '--song-font-size': `${stage.fontSize}px`,
    '--song-line-height': String(stage.lineHeight),
    '--song-chord-scale': String(stage.chordScale),
    '--song-font': `'${stage.fontFamily}', var(--font-sans)`,
    '--song-chord-font': `'${stage.chordFont}', var(--font-mono)`,
  } as React.CSSProperties;
  const songClass = `song ${opts.uppercase ? 'uppercase' : ''} ${opts.center ? 'song-center' : ''}`;
  const animClass =
    stage.transition === 'none' || !anim
      ? ''
      : stage.transition === 'fade'
        ? 'stage-page-enter-fade'
        : `stage-page-enter-slide-${anim}`;

  return (
    <div ref={area} className="relative h-full w-full overflow-hidden" style={style}>
      {mode === 'paged' ? (
        <>
          {/* camada de medição: mesma largura de coluna, invisível */}
          <div
            aria-hidden
            className={`${songClass} pointer-events-none invisible absolute top-0 left-0`}
            style={{ width: colWidth }}
          >
            {units.map((u, i) => (
              <UnitView
                key={i}
                unit={u}
                opts={opts}
                ref={(el) => {
                  measure.current[i] = el;
                }}
              />
            ))}
          </div>
          <div
            key={current}
            className={`flex h-full ${animClass}`}
            style={{ gap }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            {(spreads[current] ?? [[]]).map((page, pi) => (
              <div
                key={pi}
                className={`${songClass} h-full overflow-hidden`}
                style={{ width: colWidth }}
              >
                {page.map((ui) => units[ui] && <UnitView key={ui} unit={units[ui]} opts={opts} />)}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          ref={scroller}
          className={`${songClass} h-full overflow-y-auto pb-[40vh]`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            interacting.current = false;
          }}
          onWheel={onWheel}
          onScroll={onScroll}
        >
          {units.map((u, i) => (
            <UnitView key={i} unit={u} opts={opts} />
          ))}
        </div>
      )}
      {stage.referenceBand && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[1.6em] -translate-y-1/2"
          style={{ background: 'color-mix(in srgb, var(--song-chord) 12%, transparent)' }}
        />
      )}
    </div>
  );
});
