import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Empty, Page } from '../components/Page';
import { Button, Input, Select } from '../components/ui';
import { useSongs } from '../lib/data';

type Order = 'title' | 'artist' | 'recent';

export default function Biblioteca() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('');
  const [style, setStyle] = useState('');
  const [order, setOrder] = useState<Order>('title');

  const all = useSongs();
  const filtered = useSongs({
    query: query.trim() || undefined,
    artist: artist || undefined,
    key: key || undefined,
    style: style || undefined,
  });

  const options = useMemo(() => {
    const uniq = (xs: (string | null)[]) =>
      [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return {
      artists: uniq((all ?? []).map((s) => s.artist)),
      keys: uniq((all ?? []).map((s) => s.key)),
      styles: uniq((all ?? []).map((s) => s.style)),
    };
  }, [all]);

  const songs = useMemo(() => {
    const list = [...(filtered ?? [])];
    if (order === 'artist')
      list.sort(
        (a, b) =>
          a.artist.localeCompare(b.artist, 'pt-BR') || a.title.localeCompare(b.title, 'pt-BR'),
      );
    if (order === 'recent') list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [filtered, order]);

  return (
    <Page
      title="Músicas"
      actions={
        <Button variant="primary" onClick={() => navigate('/musicas/nova')}>
          <Plus className="size-4" aria-hidden />
          Nova música
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-2">
        <label className="relative">
          <span className="sr-only">Buscar</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar por título, artista ou trecho da letra"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select value={artist} onChange={(e) => setArtist(e.target.value)} aria-label="Artista">
            <option value="">Todos os artistas</option>
            {options.artists.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
          <Select value={key} onChange={(e) => setKey(e.target.value)} aria-label="Tom">
            <option value="">Todos os tons</option>
            {options.keys.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Select>
          <Select value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Estilo">
            <option value="">Todos os estilos</option>
            {options.styles.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select
            value={order}
            onChange={(e) => setOrder(e.target.value as Order)}
            aria-label="Ordenar"
          >
            <option value="title">Ordem: título</option>
            <option value="artist">Ordem: artista</option>
            <option value="recent">Ordem: recentes</option>
          </Select>
        </div>
      </div>

      {all === undefined ? null : all.length === 0 ? (
        <Empty>
          Nenhuma música ainda.{' '}
          <Link to="/musicas/nova" className="text-accent underline">
            Cadastre a primeira
          </Link>{' '}
          colando a cifra no editor.
        </Empty>
      ) : songs.length === 0 ? (
        <Empty>Nenhuma música encontrada com esses filtros.</Empty>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {songs.map((s) => (
            <li key={s.id}>
              <Link
                to={`/musicas/${s.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.title}</div>
                  <div className="truncate text-sm text-muted">
                    {[s.artist, s.style].filter(Boolean).join(' · ') || 'Sem artista'}
                  </div>
                </div>
                {s.key && (
                  <span className="shrink-0 rounded-md bg-surface-2 px-2 py-1 font-mono text-xs font-semibold text-accent">
                    {s.key}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {songs.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          {songs.length} de {all?.length ?? 0} música{(all?.length ?? 0) === 1 ? '' : 's'}
        </p>
      )}
    </Page>
  );
}
