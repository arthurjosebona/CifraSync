import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Page } from '../components/Page';
import { Button, Field, Input } from '../components/ui';
import { signIn, signUp } from '../lib/account';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!navigator.onLine) {
      setError('Sem conexão. Você pode continuar usando o app; entre quando estiver online.');
      return;
    }
    setBusy(true);
    try {
      const err =
        mode === 'entrar'
          ? await signIn(login, password)
          : await signUp({ name, username, password });
      if (err) setError(err);
      else navigate('/', { replace: true });
    } catch {
      setError('Não foi possível falar com o servidor. Tente de novo em instantes.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title={mode === 'entrar' ? 'Entrar' : 'Criar conta'}>
      <div className="mx-auto max-w-sm">
        <p className="mb-4 text-sm text-muted">
          O CifraSync funciona sem conta neste aparelho. Com uma conta, suas músicas e repertórios
          sincronizam entre web, celular e computador, e você pode participar de grupos.
        </p>
        <div className="mb-4 inline-flex w-full rounded-lg border border-border p-1" role="tablist">
          {(['entrar', 'criar'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`min-h-10 flex-1 rounded-md text-sm ${mode === m ? 'bg-accent text-accent-contrast' : 'text-muted'}`}
            >
              {m === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {mode === 'entrar' ? (
            <Field label="Nome de usuário">
              <Input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                autoCapitalize="off"
                required
              />
            </Field>
          ) : (
            <>
              <Field label="Seu nome">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </Field>
              <Field label="Nome de usuário (para ser convidado em grupos)">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  autoComplete="username"
                  autoCapitalize="off"
                  pattern="[a-z0-9_.]{3,30}"
                  title="3 a 30 caracteres: letras minúsculas, números, ponto ou _"
                  required
                />
              </Field>
            </>
          )}
          <Field label="Senha">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </Button>
          {mode === 'criar' ? (
            <p className="text-xs text-muted">
              As músicas que você já criou neste aparelho passam para a sua conta.
            </p>
          ) : (
            <p className="text-xs text-muted">
              Esqueceu a senha? Peça a um administrador do app uma senha temporária.
            </p>
          )}
        </form>
      </div>
    </Page>
  );
}
