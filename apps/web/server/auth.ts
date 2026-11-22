/**
 * Autenticação com Better Auth (ADR 0006): nome de usuário + senha (o e-mail é interno, ver
 * docs/specs/02-contas-e-administracao) e token bearer para os apps nativos. Tabelas no próprio Postgres.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
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
    databaseHooks: {
      session: {
        create: {
          // conta desativada por um administrador não consegue entrar
          before: async (s) => {
            const [u] = await db
              .select({ disabled: user.disabled })
              .from(user)
              .where(eq(user.id, s.userId));
            if (u?.disabled)
              throw new APIError('FORBIDDEN', {
                code: 'ACCOUNT_DISABLED',
                message: 'Conta desativada',
              });
          },
        },
      },
    },
    plugins: [username({ minUsernameLength: 3, maxUsernameLength: 30 }), bearer()],
    trustedOrigins: [...NATIVE_ORIGINS, ...(opts.extraOrigins ?? [])],
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
