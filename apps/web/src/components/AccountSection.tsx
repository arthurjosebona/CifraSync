import { isInternalEmail } from '@cifrasync/shared';
import { KeyRound, LogOut, RefreshCw, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { deleteAccount, signOut, useAccount, useAccountStatus } from '../lib/account';
import { ChangePasswordForm } from './ChangePassword';
import { syncEngine, useSyncState } from '../lib/sync';
import { SyncIndicator } from './SyncIndicator';
import { Button } from './ui';

export function AccountSection() {
  const account = useAccount();
  const sync = useSyncState();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const status = useAccountStatus();
  const [changing, setChanging] = useState(false);
  const [changed, setChanged] = useState(false);

  if (account === undefined) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted">Conta e sincronização</h2>
      {!account ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-muted">
            Você está usando o CifraSync só neste aparelho.
          </p>
          <Link
            to="/entrar"
            className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-contrast"
          >
            Entrar ou criar conta
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <UserRound className="size-8 text-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{account.name}</div>
              <div className="truncate text-sm text-muted">
                @{account.username}
                {!isInternalEmail(account.email) && ` · ${account.email}`}
              </div>
            </div>
            <SyncIndicator />
          </div>
          {sync.status === 'signed-out' && (
            <p className="text-sm text-danger">
              Sua sessão expirou.{' '}
              <Link to="/entrar" className="underline">
                Entre de novo
              </Link>{' '}
              para voltar a sincronizar — nada do que está neste aparelho se perde.
            </p>
          )}
          {changing && (
            <div className="rounded-lg border border-border p-3">
              <ChangePasswordForm
                onDone={() => {
                  setChanging(false);
                  setChanged(true);
                }}
                onCancel={() => setChanging(false)}
              />
            </div>
          )}
          {changed && !changing && (
            <p role="status" className="text-sm text-muted">
              Senha trocada.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void syncEngine.sync()}>
              <RefreshCw className="size-4" aria-hidden />
              Sincronizar agora
            </Button>
            {!changing && (
              <Button
                onClick={() => {
                  setChanging(true);
                  setChanged(false);
                }}
              >
                <KeyRound className="size-4" aria-hidden />
                Trocar senha
              </Button>
            )}
            {status?.isAdmin && (
              <Link
                to="/admin"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2"
              >
                <ShieldCheck className="size-4" aria-hidden />
                Administração
              </Link>
            )}
            <Button
              onClick={async () => {
                const pending = syncEngine.getState().pending;
                const warn = pending
                  ? `\n\nAtenção: ${pending} alteração(ões) ainda não foram enviadas e serão perdidas.`
                  : '';
                if (
                  !confirm(
                    `Sair da conta? Os dados deste aparelho serão apagados (continuam na conta).${warn}`,
                  )
                )
                  return;
                await signOut();
                navigate('/');
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </Button>
            <div className="flex-1" />
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (
                  !confirm(
                    'Excluir sua conta? Todas as músicas, repertórios e grupos dos quais você é dono serão apagados para sempre, em todos os aparelhos.',
                  )
                )
                  return;
                setBusy(true);
                try {
                  await deleteAccount();
                  navigate('/');
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Não foi possível excluir a conta.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Excluir conta
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
