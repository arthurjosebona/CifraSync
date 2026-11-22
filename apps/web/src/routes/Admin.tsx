import { Copy, KeyRound, Search, ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';

import { Empty, Page } from '../components/Page';
import { Button, Input } from '../components/ui';
import { useAccount, useAccountStatus } from '../lib/account';
import { listUsers, resetPassword, setAdmin, setDisabled, type AdminUser } from '../lib/admin';

export default function Admin() {
  const account = useAccount();
  const status = useAccountStatus();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [temp, setTemp] = useState<{ user: AdminUser; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (query: string) => {
    try {
      setUsers(await listUsers(query));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os usuários.');
    }
  }, []);

  useEffect(() => {
    if (!status?.isAdmin) return;
    const t = setTimeout(() => void load(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q, load, status?.isAdmin]);

  if (account === undefined || status === undefined) return null;

  if (!account || !status?.isAdmin) {
    return (
      <Page title="Administração">
        <Empty>
          Esta área é só para administradores do app.{' '}
          <Link to="/configuracoes" className="text-accent underline">
            Voltar aos ajustes
          </Link>
        </Empty>
      </Page>
    );
  }

  const act = async (u: AdminUser, fn: () => Promise<void>) => {
    setBusyId(u.id);
    try {
      await fn();
      await load(q.trim());
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setBusyId(null);
    }
  };

  const gerarSenha = (u: AdminUser) =>
    act(u, async () => {
      if (
        !confirm(
          `Gerar uma senha temporária para @${u.username}? A pessoa será desconectada de todos os aparelhos e terá de criar uma senha nova ao entrar.`,
        )
      )
        return;
      setCopied(false);
      setTemp({ user: u, password: await resetPassword(u.id) });
    });

  return (
    <Page title="Administração">
      <p className="mb-4 text-sm text-muted">
        Gere senhas temporárias para quem esqueceu a senha, defina administradores e desative
        contas. Você não vê as senhas nem as músicas de ninguém.
      </p>

      {temp && (
        <div role="status" className="mb-4 rounded-xl border border-accent bg-surface p-4 text-sm">
          <p className="mb-2">
            Senha temporária de <strong>@{temp.user.username}</strong>. Ela só aparece agora: envie
            para a pessoa, que vai criar uma senha nova ao entrar.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-surface-2 px-3 py-2 font-mono text-lg tracking-wider">
              {temp.password}
            </code>
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(temp.password);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              <Copy className="size-4" aria-hidden />
              {copied ? 'Copiada' : 'Copiar'}
            </Button>
            <Button variant="ghost" onClick={() => setTemp(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}

      <label className="relative mb-4 block">
        <span className="sr-only">Buscar usuário</span>
        <Search
          className="pointer-events-none absolute top-3 left-3 size-5 text-muted"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou usuário"
          className="pl-10"
          autoCapitalize="off"
        />
      </label>

      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      )}

      {users === null ? (
        !error && <p className="text-muted">Carregando…</p>
      ) : users.length === 0 ? (
        <Empty>Nenhum usuário encontrado.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => {
            const isMe = u.id === account.id;
            const busy = busyId === u.id;
            return (
              <li
                key={u.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 ${u.disabled ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {u.name} {isMe && <span className="text-muted">(você)</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span>@{u.username}</span>
                    {u.isAdmin && (
                      <span className="rounded-full bg-surface-2 px-2 text-xs text-accent">
                        {u.fixedAdmin ? 'admin (Vercel)' : 'admin'}
                      </span>
                    )}
                    {u.disabled && (
                      <span className="rounded-full bg-surface-2 px-2 text-xs text-danger">
                        desativada
                      </span>
                    )}
                    {u.mustChangePassword && (
                      <span className="rounded-full bg-surface-2 px-2 text-xs">
                        senha temporária
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy} onClick={() => void gerarSenha(u)}>
                    <KeyRound className="size-4" aria-hidden />
                    Senha temporária
                  </Button>
                  {!u.disabled &&
                    (u.isAdmin ? (
                      <Button
                        disabled={busy || isMe || u.fixedAdmin}
                        title={
                          u.fixedAdmin
                            ? 'Definido na variável ADMIN_USERNAMES da Vercel'
                            : isMe
                              ? 'Você não pode remover o seu próprio papel'
                              : undefined
                        }
                        onClick={() => void act(u, () => setAdmin(u.id, false))}
                      >
                        <ShieldOff className="size-4" aria-hidden />
                        Remover admin
                      </Button>
                    ) : (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`Tornar @${u.username} administrador do app?`))
                            void act(u, () => setAdmin(u.id, true));
                        }}
                      >
                        <ShieldCheck className="size-4" aria-hidden />
                        Tornar admin
                      </Button>
                    ))}
                  {u.disabled ? (
                    <Button
                      disabled={busy}
                      onClick={() => void act(u, () => setDisabled(u.id, false))}
                    >
                      <UserCheck className="size-4" aria-hidden />
                      Reativar
                    </Button>
                  ) : (
                    !u.isAdmin && (
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              `Desativar a conta de @${u.username}? A pessoa é desconectada e não consegue mais entrar. Os dados dela continuam guardados e a conta pode ser reativada.`,
                            )
                          )
                            void act(u, () => setDisabled(u.id, true));
                        }}
                      >
                        <UserX className="size-4" aria-hidden />
                        Desativar
                      </Button>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
