import type { Song } from '@cifrasync/shared';
import { saveSong, updateSetlistItem } from '@cifrasync/sync';
import { Check, LogOut, Minus, Plus, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { StageContent, type StageContentApi, type TapZone } from '../components/stage/StageContent';
import { db, useSetlist, useSetlistItems, useSettings, useSong, useSongs } from '../lib/data';
import { useMyId } from '../lib/groups';
import { keyLabel, songDisplay } from '../lib/music';
import { platform } from '../platform';

interface Entry {
  /** Chave única na sessão (o item do repertório ou a própria música). */
  key: string;
  songId: string;
  itemId: string | null;
  /** Transposição salva para esta entrada (item do repertório ou música). */
  baseSemitones: number;
  /** Momento ("Intervalo") que vem antes desta música no repertório. */
  momentBefore?: string;
}

const DEFAULT_SPEED = 30; // px/s
/** Quanto tempo segurar o dedo na tela para abrir o menu. */
const HOLD_MS = 3000;
/** A barra de progresso só aparece depois deste tempo (um toque normal não mostra nada). */
const HOLD_HINT_MS = 400;
const HOLD_MAX_MOVE = 12;

function wrap12(n: number) {
  return ((((n + 6) % 12) + 12) % 12) - 6;
}

function semitoneLabel(n: number) {
  if (n === 0) return 'tom original';
  const abs = Math.abs(n);
  return `${n > 0 ? '+' : '−'}${abs} ${abs === 1 ? 'semitom' : 'semitons'}`;
}

export default function Palco() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isSetlist = pathname.startsWith('/palco/repertorio');
  const { settings, loaded: settingsLoaded } = useSettings();
  const stage = settings.stage;
  const myId = useMyId();

  const single = useSong(isSetlist ? undefined : id);
  const setlist = useSetlist(isSetlist ? id : undefined);
  const items = useSetlistItems(isSetlist ? id : undefined);
  const allSongs = useSongs();
  const songs = useMemo(() => new Map((allSongs ?? []).map((s) => [s.id, s])), [allSongs]);

  // ------------------------------------------------------------ fila da sessão
  const entries = useMemo<Entry[]>(() => {
    if (!isSetlist) {
      return single
        ? [{ key: single.id, songId: single.id, itemId: null, baseSemitones: single.transpose }]
        : [];
    }
    const out: Entry[] = [];
    let moment: string | undefined;
    for (const it of items ?? []) {
      if (it.kind === 'moment') {
        moment = it.label ?? undefined;
        continue;
      }
      const song = songs.get(it.songId ?? '');
      if (!song) continue;
      out.push({
        key: it.id,
        songId: song.id,
        itemId: it.id,
        baseSemitones: it.transpose ?? song.transpose,
        ...(moment ? { momentBefore: moment } : {}),
      });
      moment = undefined;
    }
    return out;
  }, [isSetlist, single, items, songs]);

  const [index, setIndex] = useState(0);
  const [startAtEnd, setStartAtEnd] = useState(false);
  // o índice nunca passa do fim da fila (ex.: música removida do repertório pelo sync)
  const current = Math.max(0, Math.min(index, entries.length - 1));
  const entry = entries[current];

  // a música em execução fica "congelada": mudanças do sync só entram na próxima música
  const [snapshot, setSnapshot] = useState<{ key: string; song: Song } | null>(null);
  const live = entry ? songs.get(entry.songId) : undefined;
  if (entry && live && snapshot?.key !== entry.key) setSnapshot({ key: entry.key, song: live });
  const song = snapshot?.key === entry?.key ? snapshot?.song : undefined;
  const hasUpdate = !!(song && live && live.updatedAt !== song.updatedAt);

  // ------------------------------------------------------------ tom
  // Tom "só agora": vale até sair do palco (ou fechar o repertório). Salvar grava na música.
  const [semitones, setSemitones] = useState<Record<string, number>>({});
  const st = entry ? (semitones[entry.key] ?? entry.baseSemitones) : 0;
  const display = useMemo(
    () =>
      song ? songDisplay(song, { semitones: st, spelling: 'auto', capoMode: 'shapes' }) : null,
    [song, st],
  );
  const originalKey = useMemo(
    () => (song ? songDisplay(song, { semitones: 0, spelling: 'auto', capoMode: 'shapes' }) : null),
    [song],
  );

  const transpose = useCallback(
    (n: number) => {
      if (!entry) return;
      setSemitones((s) => {
        const cur = s[entry.key] ?? entry.baseSemitones;
        return { ...s, [entry.key]: n === 0 ? entry.baseSemitones : wrap12(cur + n) };
      });
    },
    [entry],
  );

  // ------------------------------------------------------------ rolagem
  const mode = stage.navigation;
  const [playing, setPlaying] = useState(false);
  const [speeds, setSpeeds] = useState<Record<string, number>>({});
  const [scrollable, setScrollable] = useState(0);
  const durationSpeed =
    song?.durationSec && scrollable > 0
      ? scrollable / Math.max(1, song.durationSec - stage.scrollStartDelay)
      : null;
  const speed = entry
    ? (speeds[entry.key] ?? song?.scrollSpeed ?? durationSpeed ?? DEFAULT_SPEED)
    : DEFAULT_SPEED;

  const [page, setPage] = useState({ current: 0, total: 1 });
  const [atScrollEnd, setAtScrollEnd] = useState(false);
  const onPageChange = useCallback(
    (cur: number, total: number) => setPage({ current: cur, total }),
    [],
  );

  // ------------------------------------------------------------ tela ligada
  useEffect(() => {
    void platform().keepAwake(true);
    return () => {
      void platform().keepAwake(false);
    };
  }, []);

  // ------------------------------------------------------------ navegação entre músicas
  const content = useRef<StageContentApi>(null);
  const goTo = useCallback(
    (to: number, atEnd = false) => {
      if (to < 0 || to >= entries.length) return;
      setPlaying(false);
      setStartAtEnd(atEnd);
      setIndex(to);
    },
    [entries.length],
  );

  const onBoundary = useCallback(
    (dir: 'next' | 'prev') => {
      if (dir === 'next') goTo(current + 1);
      else goTo(current - 1, true);
    },
    [goTo, current],
  );

  const exit = useCallback(() => {
    void platform().setFullscreen(false);
    navigate(-1);
  }, [navigate]);

  const changeSpeed = (factor: number) => {
    if (!entry || !song) return;
    const next = Math.max(2, Math.min(400, speed * factor));
    setSpeeds((s) => ({ ...s, [entry.key]: next }));
    void saveSong(db, { id: song.id, scrollSpeed: Math.round(next * 10) / 10 });
  };

  // ------------------------------------------------------------ menu (segurar 3 s)
  const [menu, setMenu] = useState(false);
  const [saved, setSaved] = useState(false);
  const [holding, setHolding] = useState(false);
  const hold = useRef<{
    x: number;
    y: number;
    hint: ReturnType<typeof setTimeout>;
    open: ReturnType<typeof setTimeout>;
  } | null>(null);

  const cancelHold = useCallback(() => {
    if (!hold.current) return;
    clearTimeout(hold.current.hint);
    clearTimeout(hold.current.open);
    hold.current = null;
    setHolding(false);
  }, []);
  useEffect(() => cancelHold, [cancelHold]);

  const openMenu = useCallback(() => {
    setPlaying(false);
    setSaved(false);
    setMenu(true);
  }, []);

  const onHoldStart = (e: React.PointerEvent) => {
    if (menu || !e.isPrimary) return;
    cancelHold();
    hold.current = {
      x: e.clientX,
      y: e.clientY,
      hint: setTimeout(() => setHolding(true), HOLD_HINT_MS),
      open: setTimeout(() => {
        hold.current = null;
        setHolding(false);
        navigator.vibrate?.(30);
        openMenu();
      }, HOLD_MS),
    };
  };
  const onHoldMove = (e: React.PointerEvent) => {
    const h = hold.current;
    if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > HOLD_MAX_MOVE) cancelHold();
  };

  const onTap = (zone: TapZone) => {
    if (zone === 'center') {
      if (mode !== 'paged') setPlaying((p) => !p);
      return;
    }
    if (zone === 'right') content.current?.next();
    else content.current?.prev();
  };

  const canSaveToSong = !!song && (!myId || song.ownerId === myId);
  const saveKeyToSong = async () => {
    if (!song || !entry) return;
    await saveSong(db, { id: song.id, transpose: st });
    // o item do repertório passa a seguir o tom salvo na música
    if (entry.itemId) await updateSetlistItem(db, entry.itemId, { transpose: null });
    setSaved(true);
  };

  // ------------------------------------------------------------ teclado e pedais
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          if (menu) return;
          e.preventDefault();
          content.current?.next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          if (menu) return;
          e.preventDefault();
          content.current?.prev();
          break;
        case '+':
        case '=':
          transpose(1);
          break;
        case '-':
          transpose(-1);
          break;
        case '0':
          transpose(0);
          break;
        case ']':
          changeSpeed(1.1);
          break;
        case '[':
          changeSpeed(1 / 1.1);
          break;
        case 'p':
        case 'P':
          if (mode !== 'paged') setPlaying((p) => !p);
          break;
        case 'm':
        case 'M':
        case 'Enter':
          if (menu) setMenu(false);
          else openMenu();
          break;
        case 'Escape':
          if (menu) setMenu(false);
          else exit();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ------------------------------------------------------------ render
  const loading =
    (isSetlist ? setlist === undefined || items === undefined : single === undefined) ||
    allSongs === undefined ||
    !settingsLoaded;
  if (loading) return <div className="stage h-full" />;
  if (!entry || !display || !song) {
    return (
      <div className="stage flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
        <p>Nada para tocar aqui.</p>
        <button type="button" className="underline" onClick={exit}>
          Voltar
        </button>
      </div>
    );
  }

  const colors = stage.colors;
  const stageVars = {
    '--stage-bg': colors.bg,
    '--song-lyric': colors.lyric,
    '--song-chord': colors.chord,
    '--song-chorus1': colors.chorus1,
    '--song-chorus2': colors.chorus2,
    '--song-chorus3': colors.chorus3,
    '--song-voice2': colors.voice2,
    '--song-tab': colors.tab,
    '--song-note': colors.note,
    '--stage-transition': stage.transition === 'none' ? '0ms' : '200ms',
    '--stage-hold-ms': `${HOLD_MS - HOLD_HINT_MS}ms`,
  } as React.CSSProperties;

  const lastEntry = current === entries.length - 1;
  const atLastPage = mode === 'paged' ? page.current >= page.total - 1 : atScrollEnd;
  const changed = st !== entry.baseSemitones;
  const bigBtn =
    'flex size-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white active:bg-white/25 disabled:opacity-30';

  return (
    <div
      className="stage fixed inset-0 flex flex-col"
      style={stageVars}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* cabeçalho mínimo */}
      <header className="flex shrink-0 items-baseline gap-3 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 text-sm opacity-80">
        {entries.length > 1 && (
          <span className="tabular-nums opacity-70">
            {current + 1}/{entries.length}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate font-semibold">
          {song.title}
          {song.artist && <span className="font-normal opacity-70"> · {song.artist}</span>}
        </span>
        <span className="font-mono font-bold" style={{ color: colors.chord }}>
          {keyLabel(display.soundingKey)}
          {st !== 0 && ` (${st > 0 ? '+' : ''}${st})`}
        </span>
        {song.capo > 0 && <span>Capo {song.capo}</span>}
        {mode === 'paged' && page.total > 1 && (
          <span className="tabular-nums opacity-70">
            {page.current + 1}/{page.total}
          </span>
        )}
      </header>

      {entry.momentBefore && page.current === 0 && (
        <div className="mx-4 rounded-md bg-white/10 px-3 py-1 text-center text-sm">
          {entry.momentBefore}
        </div>
      )}

      <div
        className="min-h-0 flex-1 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onPointerDownCapture={onHoldStart}
        onPointerMoveCapture={onHoldMove}
        onPointerUpCapture={cancelHold}
        onPointerCancelCapture={cancelHold}
        onPointerLeave={cancelHold}
      >
        <StageContent
          ref={content}
          doc={display.doc}
          stage={stage}
          mode={mode}
          playing={playing}
          speed={speed}
          startDelay={stage.scrollStartDelay}
          startAtEnd={startAtEnd}
          onTap={onTap}
          onBoundary={onBoundary}
          onPageChange={onPageChange}
          onScrollEnd={setAtScrollEnd}
          onScrollableHeight={setScrollable}
        />
      </div>

      {/* avisos */}
      <div className="pointer-events-none absolute inset-x-0 top-10 flex flex-col items-center gap-2">
        {atLastPage && (isSetlist || page.total > 1 || mode !== 'paged') && (
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
            {lastEntry && isSetlist ? 'Fim do repertório' : 'Última página'}
          </span>
        )}
        {hasUpdate && (
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
            Esta música foi atualizada — a nova versão entra ao trocar de música
          </span>
        )}
      </div>

      {/* segurando o dedo: progresso até abrir o menu */}
      {holding && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] flex justify-center">
          <div className="w-64 rounded-2xl bg-neutral-900 px-4 py-3 text-center text-sm text-white shadow-xl">
            Continue segurando para abrir o menu
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="stage-hold-fill h-full rounded-full bg-white" />
            </div>
          </div>
        </div>
      )}

      {/* menu do palco: só o tom */}
      {menu && (
        <div className="absolute inset-0 z-40 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/85"
            onClick={() => setMenu(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="palco-menu-titulo"
            className="relative w-full max-w-md rounded-t-3xl bg-neutral-900 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white shadow-2xl sm:rounded-3xl"
          >
            <p className="truncate text-sm text-white/60">{song.title}</p>
            <h2 id="palco-menu-titulo" className="mb-6 text-xl font-semibold">
              Tom
            </h2>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                className={bigBtn}
                aria-label="Meio tom abaixo"
                onClick={() => {
                  transpose(-1);
                  setSaved(false);
                }}
              >
                <Minus className="size-8" />
              </button>
              <div className="min-w-0 text-center">
                <div className="font-mono text-6xl font-bold" style={{ color: colors.chord }}>
                  {keyLabel(display.soundingKey)}
                </div>
                <div className="mt-1 text-sm text-white/60">
                  {semitoneLabel(st)}
                  {originalKey?.soundingKey && st !== 0 && (
                    <> · original {keyLabel(originalKey.soundingKey)}</>
                  )}
                </div>
              </div>
              <button
                type="button"
                className={bigBtn}
                aria-label="Meio tom acima"
                onClick={() => {
                  transpose(1);
                  setSaved(false);
                }}
              >
                <Plus className="size-8" />
              </button>
            </div>

            {changed && !saved && (
              <div className="mt-6">
                <p className="mb-2 text-sm text-white/60">Usar este tom:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex min-h-16 flex-col items-start justify-center rounded-2xl border-2 border-white bg-white/10 px-4 py-2 text-left"
                    onClick={() => setMenu(false)}
                  >
                    <span className="font-semibold">Só agora</span>
                    <span className="text-xs text-white/60">
                      até fechar o {isSetlist ? 'repertório' : 'palco'}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!canSaveToSong}
                    className="flex min-h-16 flex-col items-start justify-center rounded-2xl border-2 border-white/20 px-4 py-2 text-left active:bg-white/10 disabled:opacity-40"
                    onClick={() => void saveKeyToSong()}
                  >
                    <span className="font-semibold">Salvar na música</span>
                    <span className="text-xs text-white/60">
                      {canSaveToSong ? 'vale nas próximas vezes' : 'a música é de outra pessoa'}
                    </span>
                  </button>
                </div>
              </div>
            )}
            {saved && (
              <p className="mt-6 flex items-center gap-2 text-sm text-white/80" role="status">
                <Check className="size-4" /> Tom salvo na música.
              </p>
            )}
            {changed && (
              <button
                type="button"
                className="mt-4 flex min-h-11 items-center gap-2 text-sm text-white/70"
                onClick={() => transpose(0)}
              >
                <RotateCcw className="size-4" /> Voltar ao tom salvo
              </button>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white/10 active:bg-white/20"
                onClick={exit}
              >
                <LogOut className="size-5" /> Sair do palco
              </button>
              <button
                type="button"
                className="min-h-14 rounded-2xl bg-white font-semibold text-black active:bg-white/80"
                onClick={() => setMenu(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
