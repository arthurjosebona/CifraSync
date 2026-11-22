import { saveSetlist } from '@cifrasync/sync';
import { CalendarDays, MoreVertical, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Empty, Page } from '../components/Page';
import { Button, Field, Input } from '../components/ui';
import { db, useSetlists } from '../lib/data';
import { useMyId } from '../lib/groups';
import { formatDate } from '../lib/setlist';

export default function Repertorios() {
  const navigate = useNavigate();
  const setlists = useSetlists();
  const myId = useMyId();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const create = async () => {
    const s = await saveSetlist(db, {
      name: name.trim() || 'Novo repertório',
      eventDate: date || null,
    });
    navigate(`/repertorios/${s.id}`);
  };

  return (
    <Page
      title="Repertórios"
      actions={
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          Novo
        </Button>
      }
    >
      {creating && (
        <form
          className="mb-4 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <Field label="Nome (show, ensaio, evento)">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="flex items-end gap-2">
            <Button variant="primary" type="submit">
              Criar
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {setlists === undefined ? null : setlists.length === 0 ? (
        <Empty>Nenhum repertório ainda. Monte um para o próximo show ou ensaio.</Empty>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {setlists.map((s) => (
            <li key={s.id} className="flex items-stretch">
              <Link
                to={`/palco/repertorio/${s.id}`}
                title="Tocar o repertório"
                className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2 hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                {myId && s.ownerId !== myId && (
                  <span className="shrink-0 rounded-md bg-surface-2 px-2 py-1 text-xs text-muted">
                    do grupo
                  </span>
                )}
                {s.eventDate && (
                  <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
                    <CalendarDays className="size-4" aria-hidden />
                    {formatDate(s.eventDate)}
                  </span>
                )}
              </Link>
              <Link
                to={`/repertorios/${s.id}`}
                aria-label={`Opções de ${s.name}`}
                title="Detalhes, editar e mais opções"
                className="flex size-14 shrink-0 items-center justify-center text-muted hover:bg-surface-2 hover:text-text"
              >
                <MoreVertical className="size-5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
