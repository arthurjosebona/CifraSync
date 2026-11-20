/**
 * Instância única da API por processo (reaproveitada entre invocações na Vercel).
 */
import { createApp } from './app.js';
import { createAuth } from './auth.js';
import { createDb, migrateDb } from './db/client.js';

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

let app: Promise<ReturnType<typeof createApp>> | null = null;

export function getApp() {
  app ??= (async () => {
    const handle = await createDb();
    // PGlite (desenvolvimento) migra sozinho; em produção as migrations rodam no CI
    if (handle.kind === 'pglite') await migrateDb(handle);
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
    const baseURL = env(
      'BETTER_AUTH_URL',
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : (vercelUrl ?? 'http://localhost:5173'),
    );
    const webOrigins = [
      baseURL,
      vercelUrl,
      'http://localhost:5173',
      'http://localhost:4173',
    ].filter((x): x is string => !!x);
    const auth = createAuth(handle.db, {
      secret: env(
        'BETTER_AUTH_SECRET',
        process.env.VERCEL ? undefined : 'dev-secret-nao-use-em-producao-0000',
      ),
      baseURL,
      extraOrigins: webOrigins,
    });
    return createApp({ db: handle.db, auth, webOrigins });
  })();
  return app;
}
