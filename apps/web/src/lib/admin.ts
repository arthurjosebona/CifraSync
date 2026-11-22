/**
 * Chamadas da tela Administração (docs/specs/02-contas-e-administracao). Só funcionam online.
 */
import { apiFetch } from './api';

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  isAdmin: boolean;
  /** Definido na variável ADMIN_USERNAMES: não perde o papel pela tela. */
  fixedAdmin: boolean;
  disabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(
    path,
    body === undefined ? {} : { method: 'POST', body: JSON.stringify(body ?? {}) },
  );
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status} do servidor`);
  return data as T;
}

export async function listUsers(q: string): Promise<AdminUser[]> {
  return (await call<{ users: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(q)}`)).users;
}

export async function resetPassword(id: string): Promise<string> {
  return (await call<{ password: string }>(`/admin/users/${id}/temp-password`, null)).password;
}

export async function setAdmin(id: string, admin: boolean): Promise<void> {
  await call(`/admin/users/${id}/role`, { admin });
}

export async function setDisabled(id: string, disabled: boolean): Promise<void> {
  await call(`/admin/users/${id}/disabled`, { disabled });
}
