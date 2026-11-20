/**
 * API local para desenvolvimento: `pnpm --filter @cifrasync/web dev:api` (porta 8787).
 * Sem DATABASE_URL, usa PGlite em apps/web/.data (nada para instalar).
 */
import { serve } from '@hono/node-server';

import { getApp } from './instance.js';

process.env.DATABASE_URL ??= 'pglite:.data/pglite';
const app = await getApp();
serve({ fetch: app.fetch, port: 8787 }, (info) => {
  console.log(`API em http://localhost:${info.port}/api (banco: ${process.env.DATABASE_URL})`);
});
