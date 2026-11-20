import type { GroupRole } from '@cifrasync/shared';
import { LIMITS } from '@cifrasync/shared';
import {
  inviteMember,
  leaveGroup,
  removeMember,
  renameGroup,
  setMemberRole,
  shareSetlist,
  unshareSetlist,
} from '@cifrasync/sync';
import { ArrowLeft, ListMusic, LogOut, Search, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Empty, Page } from '../components/Page';
import { Button, Field, IconButton, Input, Select } from '../components/ui';
import { searchUsers } from '../lib/api';
import { db, useSetlists } from '../lib/data';
import { useGroup, useMyId } from '../lib/groups';
import { syncEngine, syncFastFor } from '../lib/sync';

const ROLE_LABEL: Record<GroupRole, string> = { owner: 'Dono', editor: 'Editor', member: 'Membro' };

export default function Grupo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useGroup(id);
  const myId = useMyId();
  const mySetlists = useSetlists();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; username: string; name: string }[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<GroupRole>('member');

  // tela de grupo: sincroniza a cada 15 s enquanto aberta
  useEffect(() => {
    syncFastFor(15_000);
    const t = setInterval(() => syncFastFor(15_000), 15_000);
    return () => clearInterval(t);
  }, []);

  // busca de usuários com atraso (só online)
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < LIMITS.usernameSearchMinChars) return;
    const t = setTimeout(async () => {
      try {
        const r = await searchUsers(q);
        setResults(r.users);
        setSearchError(null);
      } catch {
        setSearchError('Busca indisponível sem conexão.');
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (detail === undefined) return null;
  if (detail === null)
    return (
      <Page title="Grupo não encontrado">
        <Empty>
          <Link to="/grupos" className="text-accent underline">
            Voltar para os grupos
          </Link>
        </Empty>
      </Page>
    );

  const { group, me, members, setlists } = detail;
  const isOwner = me?.role === 'owner';
  const canShare = me?.role === 'owner' || me?.role === 'editor';
  const sharedIds = new Set(setlists.map((s) => s.setlistId));
  const shareable = (mySetlists ?? []).filter((s) => s.ownerId === myId && !sharedIds.has(s.id));
  const memberIds = new Set(members.map((m) => m.userId));
  // resultados só valem enquanto a busca tem o mínimo de letras
  const searching = query.trim().length >= LIMITS.usernameSearchMinChars;
  const visibleResults = searching ? results : [];
  const visibleError = searching ? searchError : null;
  const after = () => void syncEngine.sync();

  return (
    <Page
      title={
        <span className="flex items-center gap-1">
          <IconButton label="Voltar" onClick={() => navigate('/grupos')}>
            <ArrowLeft className="size-5" />
          </IconButton>
          {group.name}
        </span>
      }
    >
      {isOwner && (
        <div className="mb-5 max-w-sm">
          <Field label="Nome do grupo">
            <Input
              key={group.id}
              defaultValue={group.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== group.name) {
                  void renameGroup(db, group.id, e.target.value).then(after);
                }
              }}
            />
          </Field>
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-muted">
          Membros ({members.length}/{LIMITS.membersPerGroup})
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {members.map((m) => (
            <li key={m.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {m.profile?.name ?? 'Usuário'}
                  {m.userId === myId && <span className="text-muted"> (você)</span>}
                </div>
                <div className="truncate text-sm text-muted">
                  @{m.profile?.username ?? '…'}
                  {m.status === 'pending' && ' · convite pendente'}
                </div>
              </div>
              {isOwner && m.role !== 'owner' ? (
                <>
                  <Select
                    aria-label={`Papel de ${m.profile?.username ?? 'membro'}`}
                    value={m.role}
                    onChange={(e) =>
                      void setMemberRole(db, m.id, e.target.value as GroupRole).then(after)
                    }
                    className="w-auto"
                  >
                    <option value="member">Membro</option>
                    <option value="editor">Editor</option>
                  </Select>
                  <IconButton
                    label={`Remover ${m.profile?.username ?? 'membro'}`}
                    onClick={() => {
                      if (confirm(`Remover @${m.profile?.username} do grupo?`))
                        void removeMember(db, m.id).then(after);
                    }}
                  >
                    <X className="size-4" />
                  </IconButton>
                </>
              ) : (
                <span className="rounded-md bg-surface-2 px-2 py-1 text-xs text-muted">
                  {ROLE_LABEL[m.role]}
                </span>
              )}
            </li>
          ))}
        </ul>

        {isOwner && members.length < LIMITS.membersPerGroup && (
          <div className="mt-3 rounded-xl border border-border bg-surface p-3">
            <div className="flex flex-wrap gap-2">
              <label className="relative min-w-48 flex-1">
                <span className="sr-only">Convidar pelo nome de usuário</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <Input
                  type="search"
                  placeholder="Convidar pelo nome de usuário (3+ letras)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                  autoCapitalize="off"
                />
              </label>
              <Select
                aria-label="Papel do convidado"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as GroupRole)}
                className="w-auto"
              >
                <option value="member">como membro</option>
                <option value="editor">como editor</option>
              </Select>
            </div>
            {visibleError && <p className="mt-2 text-sm text-danger">{visibleError}</p>}
            {visibleResults.length > 0 && (
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                {visibleResults.map((u) => (
                  <li key={u.id} className="flex items-center gap-2 px-3 py-1">
                    <span className="min-w-0 flex-1 truncate">
                      <strong>@{u.username}</strong> <span className="text-muted">{u.name}</span>
                    </span>
                    {memberIds.has(u.id) ? (
                      <span className="text-sm text-muted">já está no grupo</span>
                    ) : (
                      <Button
                        onClick={async () => {
                          await inviteMember(db, group.id, u, inviteRole);
                          setQuery('');
                          after();
                        }}
                      >
                        <UserPlus className="size-4" aria-hidden />
                        Convidar
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-muted">Repertórios do grupo</h2>
        {setlists.length === 0 ? (
          <Empty>Nenhum repertório compartilhado ainda.</Empty>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {setlists.map((gs) => (
              <li key={gs.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <ListMusic className="size-5 text-muted" aria-hidden />
                <Link
                  to={`/repertorios/${gs.setlistId}`}
                  className="min-w-0 flex-1 hover:underline"
                >
                  <div className="truncate font-medium">{gs.setlist?.name ?? 'Carregando…'}</div>
                  <div className="truncate text-sm text-muted">
                    compartilhado por @{gs.addedByProfile?.username ?? '…'}
                  </div>
                </Link>
                {(gs.addedBy === myId || isOwner) && (
                  <IconButton
                    label="Tirar do grupo"
                    onClick={() => void unshareSetlist(db, gs.id).then(after)}
                  >
                    <X className="size-4" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}
        {canShare && shareable.length > 0 && (
          <div className="mt-3 max-w-sm">
            <Select
              aria-label="Compartilhar um repertório meu"
              value=""
              onChange={(e) =>
                e.target.value && void shareSetlist(db, group.id, e.target.value).then(after)
              }
            >
              <option value="">Compartilhar um repertório meu…</option>
              {shareable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </section>

      {me && !isOwner && (
        <Button
          variant="danger"
          onClick={async () => {
            if (!confirm(`Sair do grupo “${group.name}”? Os repertórios dele saem deste aparelho.`))
              return;
            await leaveGroup(db, me.id);
            after();
            navigate('/grupos');
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Sair do grupo
        </Button>
      )}
    </Page>
  );
}
