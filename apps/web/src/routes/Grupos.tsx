import { acceptInvite, createGroup, leaveGroup } from '@cifrasync/sync';
import { Check, Plus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Empty, Page } from '../components/Page';
import { Button, Field, IconButton, Input } from '../components/ui';
import { useAccount } from '../lib/account';
import { db } from '../lib/data';
import { useMyGroups } from '../lib/groups';
import { syncEngine } from '../lib/sync';

const ROLE_LABEL = { owner: 'Dono', editor: 'Editor', member: 'Membro' } as const;

export default function Grupos() {
  const account = useAccount();
  const groups = useMyGroups();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  if (account === undefined || groups === undefined) return null;

  if (!account) {
    return (
      <Page title="Grupos">
        <Empty>
          Grupos compartilham repertórios com a sua banda ou equipe.{' '}
          <Link to="/entrar" className="text-accent underline">
            Entre na sua conta
          </Link>{' '}
          para criar ou participar de um grupo.
        </Empty>
      </Page>
    );
  }

  return (
    <Page
      title="Grupos"
      actions={
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          Novo grupo
        </Button>
      }
    >
      {creating && (
        <form
          className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const g = await createGroup(db, name);
            void syncEngine.sync();
            navigate(`/grupos/${g.id}`);
          }}
        >
          <div className="min-w-48 flex-1">
            <Field label="Nome do grupo (banda, equipe, ministério)">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
          </div>
          <Button variant="primary" type="submit">
            Criar
          </Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>
            Cancelar
          </Button>
        </form>
      )}

      {groups.pending.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold text-muted">Convites</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-accent bg-surface">
            {groups.pending.map(({ group, me, owner }) => (
              <li key={me.id} className="flex items-center gap-3 px-4 py-2">
                <Users className="size-5 text-accent" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{group.name}</div>
                  <div className="truncate text-sm text-muted">
                    Convite de {owner ? `@${owner.username}` : 'um usuário'} · como{' '}
                    {ROLE_LABEL[me.role].toLowerCase()}
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={async () => {
                    await acceptInvite(db, me.id);
                    void syncEngine.sync();
                  }}
                >
                  <Check className="size-4" aria-hidden />
                  Aceitar
                </Button>
                <IconButton
                  label="Recusar convite"
                  onClick={async () => {
                    await leaveGroup(db, me.id);
                    void syncEngine.sync();
                  }}
                >
                  <X className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.active.length === 0 ? (
        <Empty>
          Você ainda não está em nenhum grupo. Crie um e convide a banda pelo nome de usuário.
        </Empty>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {groups.active.map(({ group, me }) => (
            <li key={group.id}>
              <Link
                to={`/grupos/${group.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-2"
              >
                <Users className="size-5 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{group.name}</span>
                <span className="rounded-md bg-surface-2 px-2 py-1 text-xs text-muted">
                  {ROLE_LABEL[me.role]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
