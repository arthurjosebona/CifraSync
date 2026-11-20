/**
 * Acesso à API. Na web a API está na mesma origem e a sessão vai em cookie HttpOnly;
 * nos apps nativos (Tauri/Capacitor) a origem é outra e a sessão vai em token Bearer.
 */
import { AuthError, type Transport } from '@cifrasync/sync';

import { detectPlatform, platform } from '../platform';

const native = detectPlatform() !== 'web';

/** Origem da API: vazia na web (mesma origem); nos apps vem de VITE_API_URL. */
export const API_ORIGIN: string = native
  ? ((import.meta.env.VITE_API_URL as string | undefined) ?? 'https://cifrasync.vercel.app')
  : '';

export const usesBearer = native;

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (usesBearer) {
    const token = await platform().tokenStore.get();
    if (token) headers.set('authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${API_ORIGIN}/api${path}`, {
    ...init,
    headers,
    credentials: usesBearer ? 'omit' : 'include',
  });
  if (res.status === 401) throw new AuthError('Sessão expirada');
  return res;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Erro ${res.status} do servidor`);
  return (await res.json()) as T;
}

export const transport: Transport = {
  async push(body) {
    return json(await apiFetch('/sync/push', { method: 'POST', body: JSON.stringify(body) }));
  },
  async pull(cursors) {
    return json(
      await apiFetch(`/sync/pull?cursors=${encodeURIComponent(JSON.stringify(cursors))}`),
    );
  },
};

export async function searchUsers(q: string) {
  return json<{ users: { id: string; username: string; name: string }[] }>(
    await apiFetch(`/users/search?q=${encodeURIComponent(q)}`),
  );
}
