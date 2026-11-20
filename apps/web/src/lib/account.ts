/**
 * Conta do usuário: cadastro, login e saída (Better Auth no servidor).
 * O app funciona sem conta; entrar liga a sincronização e leva os dados locais para a conta.
 */
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
  if (/USER_ALREADY_EXISTS/i.test(code)) return 'Já existe uma conta com esse e-mail.';
  if (/INVALID_(EMAIL_OR_PASSWORD|USERNAME_OR_PASSWORD)|INVALID_PASSWORD/i.test(code))
    return 'Usuário ou senha incorretos.';
  if (/PASSWORD_TOO_SHORT/i.test(code)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/USERNAME_TOO_SHORT|INVALID_USERNAME/i.test(code))
    return 'Nome de usuário inválido (3 a 30 letras minúsculas, números, ponto, hífen ou _).';
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
  await syncEngine.sync();
}

export async function signUp(input: {
  name: string;
  username: string;
  email: string;
  password: string;
}): Promise<string | null> {
  const r = (await authClient.signUp.email({
    name: input.name.trim(),
    username: input.username.trim().toLowerCase(),
    email: input.email.trim(),
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
