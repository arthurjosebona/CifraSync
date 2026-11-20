import type { InstrumentId } from '@cifrasync/core';
import type { Song } from '@cifrasync/shared';
import { saveSong, updateSetlistItem } from '@cifrasync/sync';
import {
  ChevronLeft,
  ChevronRight,
  Guitar,
  ListMusic,
  Maximize,
  Minus,
  Pause,
  Play,
  Plus,
  Rows3,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { ChordStrip } from '../components/ChordStrip';
import {
  StageContent,
  type StageContentApi,
  type StageMode,
  type TapZone,
} from '../components/stage/StageContent';
import { db, useSetlist, useSetlistItems, useSettings, useSong, useSongs } from '../lib/data';
import { chordShapes, keyLabel, songDisplay } from '../lib/music';
import { platform } from '../platform';

interface Entry {
  /** Chave única na sessão (o item do repertório ou um id provisório). */
  key: string;
  songId: string;
  itemId: string | null;
  /** Transposição salva para esta entrada (item do repertório ou música). */
  baseSemitones: number;
  provisional?: boolean;
  /** Momento ("Intervalo") que vem antes desta música no repertório. */
  momentBefore?: string;
}

const DEFAULT_SPEED = 30; // px/s
const CONTROLS_HIDE_MS = 4000;

function wrap12(n: number) {
  return ((((n + 6) % 12) + 12) % 12) - 6;
}

export default function Palco() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isSetlist = pathname.startsWith('/palco/repertorio');
  const { settings } = useSettings();
  const stage = settings.stage;

  const single = useSong(isSetlist ? undefined : id);
  const setlist = useSetlist(isSetlist ? id : undefined);
  const items = useSetlistItems(isSetlist ? id : undefined);
  const allSongs = useSongs();
  const songs = useMemo(() => new Map((allSongs ?? []).map((s) => [s.id, s])), [allSongs]);

  // ------------------------------------------------------------ fila da sessão
  const baseEntries = useMemo<Entry[]>(() => {
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

  const [provisional, setProvisional] = useState<{ after: string; entry: Entry }[]>([]);
  const entries = useMemo(() => {
    const out = [...baseEntries];
    for (const p of provisional) {
      const i = out.findIndex((e) => e.key === p.after);
      out.splice(i + 1, 0, p.entry);
    }
    return out;
  }, [baseEntries, provisional]);

  const [index, setIndex] = useState(0);
  const [startAtEnd, setStartAtEnd] = useState(false);
  const entry = entries[Math.min(index, entries.length - 1)];

  // a música em execução fica "congelada": mudanças do sync só entram na próxima música
  const [snapshot, setSnapshot] = useState<{ key: string; song: Song } | null>(null);
  const live = entry ? songs.get(entry.songId) : undefined;
  if (entry && live && snapshot?.key !== entry.key) setSnapshot({ key: entry.key, song: live });
  const song = snapshot?.key === entry?.key ? snapshot?.song : undefined;
  const hasUpdate = !!(song && live && live.updatedAt !== song.updatedAt);

  // ------------------------------------------------------------ tom e exibição
  const [semitones, setSemitones] = useState<Record<string, number>>({});
  const st = entry ? (semitones[entry.key] ?? entry.baseSemitones) : 0;
  const display = useMemo(
    () =>
      song ? songDisplay(song, { semitones: st, spelling: 'auto', capoMode: 'shapes' }) : null,
    [song, st],
  );
  const instrument = stage.instrument as InstrumentId;
  const shapes = useMemo(
    () =>
      display
        ? chordShapes(display.doc, instrument, {
            ...settings.chordPrefs[instrument],
            ...song?.chordPrefs[instrument],
          })
        : [],
    [display, instrument, settings.chordPrefs, song?.chordPrefs],
  );

  // ------------------------------------------------------------ modo e rolagem
  const [mode, setMode] = useState<StageMode>(stage.navigation);
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
    (current: number, total: number) => setPage({ current, total }),
    [],
  );

  // ------------------------------------------------------------ controles
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showControls = useCallback(() => {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), CONTROLS_HIDE_MS);
  }, []);
  useEffect(() => {
    hideTimer.current = setTimeout(() => setControls(false), CONTROLS_HIDE_MS);
    return () => clearTimeout(hideTimer.current);
  }, []);

  const [drawer, setDrawer] = useState(false);
  const [chordsOpen, setChordsOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<{
    itemId: string;
    semitones: number;
    title: string;
  } | null>(null);

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
      if (to < 0 || to >= entries.length || !entry) return;
      if (entry.itemId && st !== entry.baseSemitones) {
        setPendingSave({ itemId: entry.itemId, semitones: st, title: song?.title ?? '' });
        setTimeout(() => setPendingSave(null), 8000);
      }
      setPlaying(false);
      setStartAtEnd(atEnd);
      setIndex(to);
    },
    [entries.length, entry, st, song?.title],
  );

  const onBoundary = useCallback(
    (dir: 'next' | 'prev') => {
      if (dir === 'next') goTo(index + 1);
      else goTo(index - 1, true);
    },
    [goTo, index],
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
  const transpose = (n: number) => {
    if (!entry) return;
    setSemitones((s) => ({ ...s, [entry.key]: n === 0 ? entry.baseSemitones : wrap12(st + n) }));
  };

  const onTap = (zone: TapZone) => {
    if (zone === 'center') {
      if (mode !== 'paged') setPlaying((p) => !p);
      if (controls) setControls(false);
      else showControls();
      return;
    }
    if (zone === 'right') content.current?.next();
    else content.current?.prev();
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
          e.preventDefault();
          content.current?.next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
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
        case 'Escape':
          exit();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ------------------------------------------------------------ busca da adição provisória
  const [search, setSearch] = useState('');
  const found = useSongs({ query: search.trim() || undefined });

  // ------------------------------------------------------------ render
  const loading =
    (isSetlist ? setlist === undefined || items === undefined : single === undefined) ||
    allSongs === undefined;
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
  } as React.CSSProperties;

  const lastEntry = index === entries.length - 1;
  const atLastPage = mode === 'paged' ? page.current >= page.total - 1 : atScrollEnd;
  const showColumn = stage.showChordColumn && shapes.length > 0;
  const btn =
    'flex size-12 items-center justify-center rounded-full bg-white/10 text-current backdrop-blur active:bg-white/25';
  const modeLabel =
    mode === 'paged' ? 'páginas' : mode === 'autoscroll' ? 'rolagem automática' : 'híbrido';

  return (
    <div className="stage fixed inset-0 flex flex-col" style={stageVars}>
      {/* cabeçalho mínimo */}
      <header className="flex shrink-0 items-baseline gap-3 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 text-sm opacity-80">
        {entries.length > 1 && (
          <span className="tabular-nums opacity-70">
            {index + 1}/{entries.length}
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

      <div className="flex min-h-0 flex-1 gap-4 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
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
        {showColumn && (
          <aside className="hidden w-28 shrink-0 overflow-y-auto sm:block" aria-label="Acordes">
            <ChordStrip
              shapes={shapes}
              instrument={instrument}
              lefty={stage.lefty}
              direction="column"
              size={88}
              onCycle={(name, next) =>
                void saveSong(db, {
                  id: song.id,
                  chordPrefs: {
                    ...song.chordPrefs,
                    [instrument]: { ...(song.chordPrefs[instrument] ?? {}), [name]: next },
                  },
                })
              }
            />
          </aside>
        )}
      </div>

      {/* avisos */}
      <div className="pointer-events-none absolute inset-x-0 top-10 flex flex-col items-center gap-2">
        {atLastPage && (
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
            {lastEntry ? 'Fim do repertório' : 'Última página'}
          </span>
        )}
        {hasUpdate && (
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
            Esta música foi atualizada — a nova versão entra ao trocar de música
          </span>
        )}
      </div>
      {pendingSave && (
        <div className="absolute inset-x-4 top-12 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-black/80 p-3 text-sm text-white">
          <span className="flex-1">Salvar o novo tom de “{pendingSave.title}” no repertório?</span>
          <button
            type="button"
            className="rounded-lg bg-white/20 px-3 py-2"
            onClick={() => {
              void updateSetlistItem(db, pendingSave.itemId, { transpose: pendingSave.semitones });
              setPendingSave(null);
            }}
          >
            Salvar
          </button>
          <button
            type="button"
            className="px-2 py-2 opacity-70"
            onClick={() => setPendingSave(null)}
          >
            Não
          </button>
        </div>
      )}

      {/* acordes em tela estreita */}
      {chordsOpen && shapes.length > 0 && (
        <div className="absolute inset-x-0 bottom-24 bg-black/70 px-3 py-2 sm:hidden">
          <ChordStrip shapes={shapes} instrument={instrument} lefty={stage.lefty} size={70} />
        </div>
      )}

      {/* barra de controles */}
      {controls && (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))] text-white"
          onPointerDown={showControls}
        >
          <button type="button" className={btn} aria-label="Sair" onClick={exit}>
            <X className="size-5" />
          </button>
          {entries.length > 1 && (
            <button
              type="button"
              className={btn}
              aria-label="Música anterior"
              onClick={() => goTo(index - 1)}
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div className="flex items-center gap-1 rounded-full bg-white/10 px-1">
            <button
              type="button"
              className={btn}
              aria-label="Meio tom abaixo"
              onClick={() => transpose(-1)}
            >
              <Minus className="size-4" />
            </button>
            <button
              type="button"
              className="min-w-10 font-mono font-bold"
              aria-label="Voltar ao tom salvo"
              onClick={() => transpose(0)}
            >
              {keyLabel(display.soundingKey)}
            </button>
            <button
              type="button"
              className={btn}
              aria-label="Meio tom acima"
              onClick={() => transpose(1)}
            >
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            className={btn}
            aria-label={`Modo: ${modeLabel}`}
            title={`Modo: ${modeLabel} (toque para trocar)`}
            onClick={() => {
              setPlaying(false);
              setMode((m) =>
                m === 'paged' ? 'autoscroll' : m === 'autoscroll' ? 'hybrid' : 'paged',
              );
            }}
          >
            <Rows3 className="size-5" />
          </button>
          {mode !== 'paged' && (
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-1">
              <button
                type="button"
                className={btn}
                aria-label="Mais devagar"
                onClick={() => changeSpeed(1 / 1.15)}
              >
                <Minus className="size-4" />
              </button>
              <button
                type="button"
                className={btn}
                aria-label={playing ? 'Pausar' : 'Rolar'}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <button
                type="button"
                className={btn}
                aria-label="Mais rápido"
                onClick={() => changeSpeed(1.15)}
              >
                <Plus className="size-4" />
              </button>
            </div>
          )}
          {shapes.length > 0 && (
            <button
              type="button"
              className={`${btn} sm:hidden`}
              aria-label="Acordes"
              onClick={() => setChordsOpen((o) => !o)}
            >
              <Guitar className="size-5" />
            </button>
          )}
          {isSetlist && (
            <button
              type="button"
              className={btn}
              aria-label="Repertório"
              onClick={() => setDrawer(true)}
            >
              <ListMusic className="size-5" />
            </button>
          )}
          <button
            type="button"
            className={btn}
            aria-label="Tela cheia"
            onClick={() => void platform().setFullscreen(!platform().isFullscreen())}
          >
            <Maximize className="size-5" />
          </button>
          {entries.length > 1 && (
            <button
              type="button"
              className={btn}
              aria-label="Próxima música"
              onClick={() => goTo(index + 1)}
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>
      )}

      {/* gaveta do repertório */}
      {drawer && (
        <div
          className="absolute inset-0 z-30 flex justify-end bg-black/50"
          onClick={() => setDrawer(false)}
        >
          <aside
            className="flex h-full w-full max-w-sm flex-col bg-neutral-900 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-semibold">{setlist?.name}</h2>
              <button
                type="button"
                aria-label="Fechar"
                className="p-2"
                onClick={() => setDrawer(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <ol className="flex-1 overflow-y-auto">
              {entries.map((e, i) => {
                const s = songs.get(e.songId);
                return (
                  <li key={e.key}>
                    {e.momentBefore && (
                      <div className="px-4 pt-3 text-xs tracking-wide uppercase opacity-60">
                        {e.momentBefore}
                      </div>
                    )}
                    <button
                      type="button"
                      className={`flex min-h-12 w-full items-center gap-3 px-4 text-left ${
                        i === index ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'
                      }`}
                      onClick={() => {
                        goTo(i);
                        setDrawer(false);
                      }}
                    >
                      <span className="w-6 text-right text-sm opacity-60">{i + 1}</span>
                      <span className="flex-1 truncate">{s?.title}</span>
                      {e.provisional && <span className="text-xs opacity-60">provisória</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="border-t border-white/10 p-3">
              <input
                type="search"
                placeholder="Adicionar música provisória…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-11 w-full rounded-lg bg-white/10 px-3 text-sm placeholder:text-white/50"
              />
              {search.trim() && (
                <ul className="mt-2 max-h-48 overflow-y-auto">
                  {(found ?? []).slice(0, 20).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center gap-2 px-2 text-left text-sm hover:bg-white/10"
                        onClick={() => {
                          setProvisional((p) => [
                            ...p,
                            {
                              after: entry.key,
                              entry: {
                                key: `prov-${s.id}-${Date.now()}`,
                                songId: s.id,
                                itemId: null,
                                baseSemitones: s.transpose,
                                provisional: true,
                              },
                            },
                          ]);
                          setSearch('');
                        }}
                      >
                        <Plus className="size-4" />
                        <span className="truncate">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
