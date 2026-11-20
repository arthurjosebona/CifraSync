/**
 * Conexão com o banco, escolhida pela DATABASE_URL:
 *   - ausente ou "pglite:<pasta|memory>" → PGlite (desenvolvimento local e testes, sem instalar nada)
 *   - host *.neon.tech → driver serverless da Neon (produção na Vercel)
 *   - outro Postgres → node-postgres
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

import * as schema from './schema.js';

export type Schema = typeof schema;
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

export interface DbHandle {
  db: Db;
  kind: 'pglite' | 'neon' | 'pg';
  close(): Promise<void>;
}

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../drizzle', import.meta.url));

export async function createDb(url = process.env.DATABASE_URL): Promise<DbHandle> {
  if (!url || url.startsWith('pglite:')) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const target = !url || url === 'pglite:memory' ? undefined : url.slice('pglite:'.length);
    if (target) mkdirSync(dirname(target), { recursive: true });
    const client = new PGlite(target);
    const db = drizzle(client, { schema }) as unknown as Db;
    return { db, kind: 'pglite', close: () => client.close() };
  }
  if (/\.neon\.tech/.test(url)) {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const ws = (await import('ws')).default;
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: url });
    const db = drizzle(pool, { schema }) as unknown as Db;
    return { db, kind: 'neon', close: () => pool.end() };
  }
  const pg = (await import('pg')).default;
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema }) as unknown as Db;
  return { db, kind: 'pg', close: () => pool.end() };
}

/** Aplica as migrations (desenvolvimento e testes; em produção o workflow migrate faz isso). */
export async function migrateDb(handle: DbHandle): Promise<void> {
  if (handle.kind === 'pglite') {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    await migrate(handle.db as never, { migrationsFolder: MIGRATIONS_DIR });
  } else if (handle.kind === 'neon') {
    const { migrate } = await import('drizzle-orm/neon-serverless/migrator');
    await migrate(handle.db as never, { migrationsFolder: MIGRATIONS_DIR });
  } else {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    await migrate(handle.db as never, { migrationsFolder: MIGRATIONS_DIR });
  }
}
