/**
 * Autenticação com Better Auth (ADR 0006): e-mail + senha, nome de usuário único e token
 * bearer para os apps nativos. Tabelas no próprio Postgres.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins/bearer';
import { username } from 'better-auth/plugins/username';

import type { Db } from './db/client.js';
import { account, session, user, verification } from './db/schema.js';

/** Origens dos apps nativos e do desenvolvimento local. */
export const NATIVE_ORIGINS = [
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
];

export interface AuthOptions {
  secret: string;
  baseURL: string;
  extraOrigins?: string[];
}

export function createAuth(db: Db, opts: AuthOptions) {
  return betterAuth({
    secret: opts.secret,
    baseURL: opts.baseURL,
    basePath: '/api/auth',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    session: {
      // sessão longa: o músico não pode ser deslogado no dia do show sem internet
      expiresIn: 60 * 60 * 24 * 60,
      updateAge: 60 * 60 * 24,
    },
    plugins: [username({ minUsernameLength: 3, maxUsernameLength: 30 }), bearer()],
    trustedOrigins: [...NATIVE_ORIGINS, ...(opts.extraOrigins ?? [])],
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
