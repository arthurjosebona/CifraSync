import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetlistItem, Song } from '@cifrasync/shared';
import {
  addSetlistItem,
  deleteSetlist,
  duplicateSetlist,
  moveSetlistItem,
  removeSetlistItem,
  saveSetlist,
  updateSetlistItem,
} from '@cifrasync/sync';
import {
  ArrowLeft,
  ClipboardCopy,
  Copy,
  GripVertical,
  Minus,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Empty, Page } from '../components/Page';
import { Button, Field, IconButton, Input, Textarea } from '../components/ui';
import { db, useSetlist, useSetlistItems, useSongs } from '../lib/data';
import { useCanEditSetlist, useMyId } from '../lib/groups';
import { itemKey, itemSemitones, setlistAsText } from '../lib/setlist';
import { syncFastFor } from '../lib/sync';

function SortableRow({
  item,
  number,
  song,
  readOnly,
}: {
  item: SetlistItem;
  number: number | null;
  song: Song | undefined;
  readOnly: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: readOnly,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const shift = (n: number) => {
    const next = ((((itemSemitones(item, song) + n + 6) % 12) + 12) % 12) - 6;
    void updateSetlistItem(db, item.id, { transpose: next });
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 bg-surface px-1 py-1 ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
      {readOnly ? (
        <span className="w-2 shrink-0" />
      ) : (
        <button
          type="button"
          className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted"
          aria-label="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" />
        </button>
      )}
      {item.kind === 'moment' ? (
        <Input
          aria-label="Nome do momento"
          defaultValue={item.label ?? ''}
          readOnly={readOnly}
          onBlur={(e) => void updateSetlistItem(db, item.id, { label: e.target.value })}
          className="flex-1 border-dashed font-medium italic"
        />
      ) : (
        <>
          <span className="w-6 shrink-0 text-right text-sm text-muted">{number}.</span>
          <div className="min-w-0 flex-1 px-2">
            {song ? (
              <Link
                to={`/musicas/${song.id}`}
                className="block truncate font-medium hover:underline"
              >
                {song.title}
              </Link>
            ) : (
              <span className="text-muted italic">Música removida</span>
            )}
            {song?.artist && (
              <span className="block truncate text-xs text-muted">{song.artist}</span>
            )}
          </div>
          <IconButton label="Meio tom abaixo" onClick={() => shift(-1)} disabled={readOnly}>
            <Minus className="size-4" />
          </IconButton>
          <span className="w-10 text-center font-mono text-sm font-semibold text-accent">
            {itemKey(item, song) ?? '—'}
          </span>
          <IconButton label="Meio tom acima" onClick={() => shift(1)} disabled={readOnly}>
            <Plus className="size-4" />
          </IconButton>
        </>
      )}
      {!readOnly && (
        <IconButton
          label="Remover do repertório"
          onClick={() => void removeSetlistItem(db, item.id)}
        >
          <X className="size-4" />
        </IconButton>
      )}
    </li>
  );
}

export default function Repertorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setlist = useSetlist(id);
  const canEdit = useCanEditSetlist(setlist);
  const myId = useMyId();
  const readOnly = canEdit === false;
  const isMine = !!setlist && setlist.ownerId === myId;
  // repertório de grupo aberto: sincroniza a cada 15 s
  useEffect(() => {
    if (!setlist || isMine) return;
    syncFastFor(15_000);
    const t = setInterval(() => syncFastFor(15_000), 15_000);
    return () => clearInterval(t);
  }, [setlist?.id, isMine]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = useSetlistItems(id);
  const allSongs = useSongs();
  const [search, setSearch] = useState('');
  const matches = useSongs({ query: search.trim() || undefined });
  const [copied, setCopied] = useState(false);

  const songs = useMemo(() => new Map((allSongs ?? []).map((s) => [s.id, s])), [allSongs]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (setlist === undefined || items === undefined) return null;
  if (setlist === null)
    return (
      <Page title="Repertório não encontrado">
        <Empty>
          <Link to="/repertorios" className="text-accent underline">
            Voltar
          </Link>
        </Empty>
      </Page>
    );

  let n = 0;
  const numbers = items.map((it) => (it.kind === 'song' ? ++n : null));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const to = items.findIndex((i) => i.id === e.over!.id);
    void moveSetlistItem(db, String(e.active.id), to);
  };

  return (
    <Page
      title={
        <span className="flex items-center gap-1">
          <IconButton label="Voltar" onClick={() => navigate('/repertorios')}>
            <ArrowLeft className="size-5" />
          </IconButton>
          {setlist.name}
        </span>
      }
      actions={
        <Button
          variant="primary"
          disabled={!items.some((i) => i.kind === 'song')}
          onClick={() => navigate(`/palco/repertorio/${setlist.id}`)}
        >
          <Play className="size-4" aria-hidden />
          Tocar
        </Button>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Nome">
          <Input
            defaultValue={setlist.name}
            readOnly={readOnly}
            key={`n${setlist.id}`}
            onBlur={(e) =>
              e.target.value.trim() &&
              void saveSetlist(db, { id: setlist.id, name: e.target.value.trim() })
            }
          />
        </Field>
        <Field label="Data">
          <Input
            type="date"
            readOnly={readOnly}
            defaultValue={setlist.eventDate ?? ''}
            key={`d${setlist.id}`}
            onChange={(e) =>
              void saveSetlist(db, { id: setlist.id, eventDate: e.target.value || null })
            }
          />
        </Field>
      </div>

      {items.length === 0 ? (
        <Empty>Repertório vazio. Busque músicas abaixo para adicionar.</Empty>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {items.map((it, i) => (
                <SortableRow
                  key={it.id}
                  item={it}
                  number={numbers[i]!}
                  readOnly={readOnly}
                  song={it.songId ? songs.get(it.songId) : undefined}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {readOnly && (
        <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          Repertório de um grupo: só o dono e os editores podem alterar. Você pode tocar ou
          duplicar.
        </p>
      )}

      {!readOnly && (
        <section className="mt-5 rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-muted">Adicionar</h2>
          <div className="flex gap-2">
            <Input
              type="search"
              placeholder="Buscar música na biblioteca"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              onClick={() =>
                void addSetlistItem(db, setlist.id, { kind: 'moment', label: 'Intervalo' })
              }
            >
              + Momento
            </Button>
          </div>
          {search.trim() && (
            <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {(matches ?? []).slice(0, 30).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-surface-2"
                    onClick={() =>
                      void addSetlistItem(db, setlist.id, { kind: 'song', songId: s.id })
                    }
                  >
                    <Plus className="size-4 text-accent" aria-hidden />
                    <span className="truncate">{s.title}</span>
                    <span className="truncate text-sm text-muted">{s.artist}</span>
                  </button>
                </li>
              ))}
              {matches?.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">Nada encontrado.</li>
              )}
            </ul>
          )}
        </section>
      )}

      <div className="mt-4">
        <Field label="Observações">
          <Textarea
            rows={2}
            defaultValue={setlist.notes}
            readOnly={readOnly}
            key={`o${setlist.id}`}
            onBlur={(e) => void saveSetlist(db, { id: setlist.id, notes: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(setlistAsText(setlist, items, songs));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <ClipboardCopy className="size-4" aria-hidden />
          {copied ? 'Copiado!' : 'Copiar como texto'}
        </Button>
        <Button
          onClick={async () => {
            const copy = await duplicateSetlist(db, setlist.id);
            if (copy) navigate(`/repertorios/${copy.id}`);
          }}
        >
          <Copy className="size-4" aria-hidden />
          Duplicar
        </Button>
        <div className="flex-1" />
        {isMine && (
          <Button
            variant="danger"
            onClick={async () => {
              if (
                !confirm(
                  `Excluir o repertório “${setlist.name}”? As músicas continuam na biblioteca.`,
                )
              )
                return;
              await deleteSetlist(db, setlist.id);
              navigate('/repertorios');
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Excluir
          </Button>
        )}
      </div>
    </Page>
  );
}
