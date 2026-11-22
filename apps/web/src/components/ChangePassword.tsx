import { KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { changePassword, refreshAccountStatus, useAccountStatus } from '../lib/account';
import { Button, Field, Input } from './ui';

/** Formulário de troca de senha (Ajustes e troca obrigatória após senha temporária). */
export function ChangePasswordForm({
  currentLabel = 'Senha atual',
  onDone,
  onCancel,
}: {
  currentLabel?: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (next.length < 8) return setError('A nova senha precisa ter pelo menos 8 caracteres.');
    if (next !== confirmNext) return setError('A confirmação não é igual à nova senha.');
    setBusy(true);
    const err = await changePassword(current, next);
    setBusy(false);
    if (err) setError(err);
    else onDone();
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field label={currentLabel}>
        <Input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>
      <Field label="Nova senha">
        <Input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Field label="Repita a nova senha">
        <Input
          type="password"
          value={confirmNext}
          onChange={(e) => setConfirmNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="primary" type="submit" disabled={busy}>
          <KeyRound className="size-4" aria-hidden />
          {busy ? 'Aguarde…' : 'Trocar senha'}
        </Button>
        {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  );
}

/**
 * Depois de uma senha temporária, cobre o app até a pessoa escolher uma senha nova.
 * Offline não bloqueia: o palco precisa funcionar mesmo sem internet.
 */
export function ChangePasswordGate() {
  const status = useAccountStatus();

  useEffect(() => {
    void refreshAccountStatus();
    const onOnline = () => void refreshAccountStatus();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  if (!status?.mustChangePassword || !navigator.onLine) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="troca-senha-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl">
        <h2 id="troca-senha-titulo" className="mb-1 text-lg font-semibold">
          Escolha uma senha nova
        </h2>
        <p className="mb-4 text-sm text-muted">
          Você entrou com uma senha temporária. Para continuar, crie a sua senha.
        </p>
        <ChangePasswordForm currentLabel="Senha temporária" onDone={() => undefined} />
      </div>
    </div>
  );
}
