/**
 * Conta do usuário: cadastro, login e saída (Better Auth no servidor).
 * O app funciona sem conta; entrar liga a sincronização e leva os dados locais para a conta.
 */
import { internalEmail } from '@cifrasync/shared';
import { adoptLocalData, clearAccountData } from '@cifrasync/sync';
import { createAuthClient } from 'better-auth/client';
import { usernameClient } from 'better-auth/client/plugins';
import { useLiveQuery } from 'dexie-react-hooks';

import { platform } from '../platform';
import { API_ORIGIN, apiFetch, usesBearer } from './api';
import { db } from './data';
import { syncEngine } from './sync';

export const authClient = createAuthClient({
  baseURL: `${API_ORIGIN || window.location.origin}/api/auth`,
  plugins: [usernameClient()],
  fetchOptions: usesBearer
    ? {
        credentials: 'omit',
        auth: { type: 'Bearer', token: async () => (await platform().tokenStore.get()) ?? '' },
        onSuccess: async (ctx) => {
          const token = ctx.response.headers.get('set-auth-token');
          if (token) await platform().tokenStore.set(token);
        },
      }
    : { credentials: 'include' },
});

export interface AccountInfo {
  id: string;
  username: string;
  name: string;
  email: string;
}

/** Conta salva neste aparelho (para funcionar offline mesmo com a sessão expirada). */
export function useAccount(): AccountInfo | null | undefined {
  return useLiveQuery(
    async () => ((await db.meta.get('account'))?.value as AccountInfo | undefined) ?? null,
    [],
  );
}

type AuthResult = { data: unknown; error: { message?: string; code?: string } | null };

function message(r: AuthResult, fallback: string): string {
  const code = r.error?.code ?? '';
  if (/USERNAME_IS_ALREADY_TAKEN|USERNAME_ALREADY/i.test(code))
    return 'Esse nome de usuário já está em uso.';
  if (/USER_ALREADY_EXISTS/i.test(code)) return 'Esse nome de usuário já está em uso.';
  if (/ACCOUNT_DISABLED/i.test(code))
    return 'Esta conta foi desativada. Fale com um administrador do app.';
  if (/INVALID_(EMAIL_OR_PASSWORD|USERNAME_OR_PASSWORD)|INVALID_PASSWORD/i.test(code))
    return 'Usuário ou senha incorretos.';
  if (/PASSWORD_TOO_SHORT/i.test(code)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/USERNAME_TOO_SHORT|INVALID_USERNAME/i.test(code))
    return 'Nome de usuário inválido (3 a 30 letras minúsculas, números, ponto ou _).';
  return r.error?.message || fallback;
}

async function afterLogin(user: {
  id: string;
  email: string;
  name: string;
  username?: string | null;
}) {
  await adoptLocalData(db, user.id);
  await db.meta.put({
    key: 'account',
    value: { id: user.id, email: user.email, name: user.name, username: user.username ?? '' },
  });
  await refreshAccountStatus();
  await syncEngine.sync();
}

/** Cadastro só com nome, usuário e senha: o e-mail é interno (docs/specs/02-contas-e-administracao). */
export async function signUp(input: {
  name: string;
  username: string;
  password: string;
}): Promise<string | null> {
  const username = input.username.trim().toLowerCase();
  const r = (await authClient.signUp.email({
    name: input.name.trim(),
    username,
    email: internalEmail(username),
    password: input.password,
  })) as AuthResult;
  if (r.error) return message(r, 'Não foi possível criar a conta.');
  await afterLogin((r.data as { user: AccountInfo }).user);
  return null;
}

export async function signIn(login: string, password: string): Promise<string | null> {
  const isEmail = login.includes('@');
  const r = (
    isEmail
      ? await authClient.signIn.email({ email: login.trim(), password })
      : await authClient.signIn.username({ username: login.trim().toLowerCase(), password })
  ) as AuthResult;
  if (r.error) return message(r, 'Não foi possível entrar.');
  await afterLogin((r.data as { user: AccountInfo }).user);
  return null;
}

/** Sai da conta e apaga os dados deste aparelho (eles continuam no servidor). */
export async function signOut(): Promise<void> {
  try {
    await authClient.signOut();
  } catch {
    // offline: a sessão expira sozinha no servidor
  }
  await platform().tokenStore.set(null);
  await clearAccountData(db);
}

/** Exclui a conta no servidor e limpa este aparelho. */
export async function deleteAccount(): Promise<void> {
  const res = await apiFetch('/account', { method: 'DELETE' });
  if (!res.ok) throw new Error('Não foi possível excluir a conta.');
  await platform().tokenStore.set(null);
  await clearAccountData(db);
}

export interface AccountStatus {
  isAdmin: boolean;
  mustChangePassword: boolean;
}

/** Papel e pendências da conta, guardados no aparelho para funcionar offline. */
export function useAccountStatus(): AccountStatus | null | undefined {
  return useLiveQuery(
    async () => ((await db.meta.get('accountStatus'))?.value as AccountStatus | undefined) ?? null,
    [],
  );
}

/** Atualiza o papel e as pendências da conta (silencioso se offline ou sem conta). */
export async function refreshAccountStatus(): Promise<void> {
  if (!(await db.meta.get('account'))) return;
  try {
    const res = await apiFetch('/account/me');
    if (!res.ok) return;
    await db.meta.put({ key: 'accountStatus', value: (await res.json()) as AccountStatus });
  } catch {
    // offline ou sessão expirada: mantém o que já estava salvo
  }
}

/** Troca a senha da conta. Devolve a mensagem de erro, ou null se deu certo. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<string | null> {
  let res: Response;
  try {
    res = await apiFetch('/account/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  } catch {
    return 'Não foi possível falar com o servidor. Verifique a conexão.';
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? 'Não foi possível trocar a senha.';
  }
  await refreshAccountStatus();
  return null;
}
