import { addSetlistItem, copySongToLibrary, deleteSong, saveSong } from '@cifrasync/sync';
import { Copy, Download, Minus, Pencil, Play, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Empty, Page } from '../components/Page';
import { SongView } from '../components/SongView';
import { Button, IconButton, Select } from '../components/ui';
import { db, useSetlists, useSong } from '../lib/data';
import { useMyId } from '../lib/groups';
import { exportSongChordPro, exportSongText } from '../lib/transfer';
import {
  keyLabel,
  keyOptions,
  songDisplay,
  type CapoMode,
  type SpellingChoice,
} from '../lib/music';

export default function Musica() {
  const { id } = useParams();
  const navigate = useNavigate();
  const song = useSong(id);
  const setlists = useSetlists();

  const myId = useMyId();

  const [semitones, setSemitones] = useState(0);
  const [spelling, setSpelling] = useState<SpellingChoice>('auto');
  const [capoMode, setCapoMode] = useState<CapoMode>('shapes');
  const [added, setAdded] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // ao abrir (ou trocar de) música, parte da transposição salva
  if (song && song.id !== loadedId) {
    setLoadedId(song.id);
    setSemitones(song.transpose);
  }

  const display = useMemo(
    () => (song ? songDisplay(song, { semitones, spelling, capoMode }) : null),
    [song, semitones, spelling, capoMode],
  );

  if (song === undefined) return null;
  if (song === null)
    return (
      <Page title="Música não encontrada">
        <Empty>
          <Link to="/" className="text-accent underline">
            Voltar para as músicas
          </Link>
        </Empty>
      </Page>
    );

  const isMine = !myId || song.ownerId === myId;
  const shift = (n: number) => setSemitones((s) => ((((s + n + 6) % 12) + 12) % 12) - 6);
  const dirty = semitones !== song.transpose;

  return (
    <Page
      title={
        <span>
          {song.title}
          {song.artist && (
            <span className="ml-2 text-base font-normal text-muted">{song.artist}</span>
          )}
        </span>
      }
      actions={
        <>
          {isMine ? (
            <IconButton label="Editar" onClick={() => navigate(`/musicas/${song.id}/editar`)}>
              <Pencil className="size-5" />
            </IconButton>
          ) : (
            <Button
              title="Música de outro membro do grupo: copie para editar a sua versão"
              onClick={async () => {
                const copy = await copySongToLibrary(db, song.id);
                if (copy) navigate(`/musicas/${copy.id}`);
              }}
            >
              <Copy className="size-4" aria-hidden />
              Copiar para minha biblioteca
            </Button>
          )}
          <Button variant="primary" onClick={() => navigate(`/palco/musica/${song.id}`)}>
            <Play className="size-4" aria-hidden />
            Tocar
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-2">
        <span className="px-2 text-sm text-muted">
          Tom <strong className="font-mono text-accent">{keyLabel(display!.soundingKey)}</strong>
          {display!.keyWasDetected && <span title="Tom estimado pelos acordes"> (estimado)</span>}
          {semitones !== 0 && (
            <span className="ml-1">
              ({semitones > 0 ? '+' : ''}
              {semitones})
            </span>
          )}
        </span>
        <IconButton label="Meio tom abaixo" onClick={() => shift(-1)}>
          <Minus className="size-4" />
        </IconButton>
        <IconButton label="Meio tom acima" onClick={() => shift(1)}>
          <Plus className="size-4" />
        </IconButton>
        {display!.writtenKey && (
          <Select
            aria-label="Tom de destino"
            value={semitones}
            onChange={(e) => setSemitones(Number(e.target.value))}
            className="w-auto"
          >
            {keyOptions(display!.writtenKey).map((o) => (
              <option key={o.semitones} value={o.semitones}>
                {o.label}
                {o.semitones === 0 ? ' (original)' : ''}
              </option>
            ))}
          </Select>
        )}
        <Select
          aria-label="Grafia dos acidentes"
          value={spelling}
          onChange={(e) => setSpelling(e.target.value as SpellingChoice)}
          className="w-auto"
        >
          <option value="auto">♯/♭ pelo tom</option>
          <option value="sharps">Sustenidos (♯)</option>
          <option value="flats">Bemóis (♭)</option>
        </Select>
        <IconButton label="Voltar ao tom original" onClick={() => setSemitones(0)}>
          <RotateCcw className="size-4" />
        </IconButton>
        {dirty && isMine && (
          <Button onClick={() => void saveSong(db, { id: song.id, transpose: semitones })}>
            <Save className="size-4" aria-hidden />
            Salvar tom
          </Button>
        )}
      </div>

      {song.capo > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span>
            Capo na <strong>{song.capo}ª casa</strong>
            {display!.shapesKey && <> · formas de {keyLabel(display!.shapesKey)}</>}
          </span>
          <div className="inline-flex rounded-lg border border-border p-1" role="radiogroup">
            {(['shapes', 'sounding'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={capoMode === m}
                onClick={() => setCapoMode(m)}
                className={`min-h-9 rounded-md px-3 ${capoMode === m ? 'bg-accent text-accent-contrast' : 'text-muted'}`}
              >
                {m === 'shapes' ? 'Formas com capo' : 'Como soa'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-4 md:p-6">
        {song.content.trim() ? (
          <SongView doc={display!.doc} />
        ) : (
          <p className="text-muted">Sem conteúdo ainda.</p>
        )}
      </div>

      {song.notes && <p className="mt-4 text-sm whitespace-pre-wrap text-muted">{song.notes}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Adicionar a um repertório"
          value=""
          onChange={async (e) => {
            const setlistId = e.target.value;
            if (!setlistId) return;
            await addSetlistItem(db, setlistId, {
              kind: 'song',
              songId: song.id,
              transpose: semitones !== song.transpose ? semitones : null,
            });
            setAdded(setlists?.find((s) => s.id === setlistId)?.name ?? null);
          }}
          className="w-auto"
        >
          <option value="">Adicionar a um repertório…</option>
          {setlists?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {added && <span className="text-sm text-muted">Adicionada a “{added}”.</span>}
        <Button onClick={() => void exportSongText(song)} title="Baixar a cifra em texto">
          <Download className="size-4" aria-hidden />
          .txt
        </Button>
        <Button onClick={() => void exportSongChordPro(song)} title="Baixar em ChordPro">
          <Download className="size-4" aria-hidden />
          .cho
        </Button>
        <div className="flex-1" />
        {isMine && (
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm(`Excluir “${song.title}”? Ela sai também dos repertórios.`)) return;
              await deleteSong(db, song.id);
              navigate('/');
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
