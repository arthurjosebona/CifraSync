/**
 * API do CifraSync (Hono). Toda escrita de dados passa por /sync/push; as rotas de grupo
 * existem só para o que envolve outro usuário (busca por nome de usuário).
 */
import { LIMITS } from '@cifrasync/shared';
import { and, eq, inArray, like, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';

import { NATIVE_ORIGINS, type Auth } from './auth.js';
import type { Db } from './db/client.js';
import { groupSetlists, setlistItems, setlists, songs, user, userSettings } from './db/schema.js';
import { rateLimit } from './rate-limit.js';
import { pull } from './sync/pull.js';
import { push, PushBody } from './sync/push.js';

export interface AppDeps {
  db: Db;
  auth: Auth;
  /** Origens web extras permitidas no CORS (ex.: previews da Vercel). */
  webOrigins?: string[];
}

type Env = { Variables: { userId: string } };

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function createApp({ db, auth, webOrigins = [] }: AppDeps) {
  const app = new Hono<Env>().basePath('/api');
  const origins = [...NATIVE_ORIGINS, ...webOrigins];

  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: (origin) => (origins.includes(origin) ? origin : null),
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['set-auth-token'],
      maxAge: 600,
    }),
  );

  app.get('/health', (c) => c.json({ ok: true }));

  app.use('/auth/*', rateLimit({ windowMs: 60_000, max: 30 }));
  app.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw));

  // a partir daqui, só com sessão (cookie na web, Bearer nos apps)
  app.use('*', async (c, next) => {
    const s = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!s) return c.json({ error: 'Não autenticado' }, 401);
    c.set('userId', s.user.id);
    await next();
  });

  // lote de até 200 mutações: 4 MB cobre letras longas com folga
  app.post('/sync/push', bodyLimit({ maxSize: 4 * 1024 * 1024 }), async (c) => {
    const body = PushBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'Formato inválido' }, 400);
    const results = await push(db, c.get('userId'), body.data);
    return c.json({ results });
  });

  app.get('/sync/pull', async (c) => {
    const parsed = z
      .record(z.string(), z.number().int().nonnegative())
      .safeParse(safeJson(c.req.query('cursors') ?? '{}'));
    if (!parsed.success) return c.json({ error: 'Cursores inválidos' }, 400);
    return c.json(await pull(db, c.get('userId'), parsed.data));
  });

  app.get('/users/search', rateLimit({ windowMs: 60_000, max: 60 }), async (c) => {
    const q = (c.req.query('q') ?? '').trim().toLowerCase();
    if (q.length < LIMITS.usernameSearchMinChars) return c.json({ users: [] });
    const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    const users = await db
      .select({ id: user.id, username: user.username, name: user.name })
      .from(user)
      .where(and(like(user.username, `${escaped}%`), ne(user.id, c.get('userId'))))
      .limit(LIMITS.usernameSearchMaxResults);
    return c.json({ users: users.map((u) => ({ ...u, username: u.username ?? '' })) });
  });

  app.get('/export', async (c) => {
    const userId = c.get('userId');
    const mySetlists = await db.select().from(setlists).where(eq(setlists.ownerId, userId));
    const ids = mySetlists.map((s) => s.id);
    return c.json({
      format: 'cifrasync-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      songs: await db.select().from(songs).where(eq(songs.ownerId, userId)),
      setlists: mySetlists,
      setlistItems: ids.length
        ? await db.select().from(setlistItems).where(inArray(setlistItems.setlistId, ids))
        : [],
      settings: await db.select().from(userSettings).where(eq(userSettings.userId, userId)),
    });
  });

  app.delete('/account', async (c) => {
    const userId = c.get('userId');
    // repertórios compartilhados deixam de existir nos grupos; o resto cai em cascata
    const mine = await db
      .select({ id: setlists.id })
      .from(setlists)
      .where(eq(setlists.ownerId, userId));
    if (mine.length)
      await db.delete(groupSetlists).where(
        inArray(
          groupSetlists.setlistId,
          mine.map((s) => s.id),
        ),
      );
    await db.delete(user).where(eq(user.id, userId));
    return c.json({ ok: true });
  });

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Erro interno' }, 500);
  });

  return app;
}
