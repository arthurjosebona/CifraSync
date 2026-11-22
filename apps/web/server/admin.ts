/**
 * Conta do próprio usuário (troca de senha) e administração do app
 * (docs/specs/02-contas-e-administracao).
 */
import { and, asc, eq, ilike, or } from 'drizzle-orm';
import type { Hono } from 'hono';
import { z } from 'zod';

import type { Auth } from './auth.js';
import type { Db } from './db/client.js';
import { account, session, user } from './db/schema.js';

type Env = { Variables: { userId: string } };

export interface AccountRoutesDeps {
  db: Db;
  auth: Auth;
  /** Administradores definidos na variável ADMIN_USERNAMES (não podem perder o papel pela tela). */
  adminUsernames: string[];
}

/** Sem letras e números ambíguos (0/o, 1/l/i), fácil de ditar ou digitar no celular. */
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function temporaryPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => TEMP_ALPHABET[b % TEMP_ALPHABET.length]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join('')).join('-');
}

const PasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export function registerAccountRoutes(
  app: Hono<Env>,
  { db, auth, adminUsernames }: AccountRoutesDeps,
) {
  const fixedAdmins = new Set(adminUsernames);

  async function loadUser(id: string) {
    const [u] = await db
      .select({
        id: user.id,
        username: user.username,
        role: user.role,
        disabled: user.disabled,
        mustChangePassword: user.mustChangePassword,
      })
      .from(user)
      .where(eq(user.id, id));
    return u;
  }

  const isFixedAdmin = (u: { username: string | null }) =>
    !!u.username && fixedAdmins.has(u.username.toLowerCase());
  const isAdmin = (u: { username: string | null; role: string }) =>
    u.role === 'admin' || isFixedAdmin(u);

  // ---------------------------------------------------------------------------
  // Conta do próprio usuário
  // ---------------------------------------------------------------------------

  app.get('/account/me', async (c) => {
    const u = await loadUser(c.get('userId'));
    if (!u) return c.json({ error: 'Não autenticado' }, 401);
    return c.json({ isAdmin: isAdmin(u), mustChangePassword: u.mustChangePassword });
  });

  app.post('/account/password', async (c) => {
    const body = PasswordBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success)
      return c.json({ error: 'A nova senha precisa ter pelo menos 8 caracteres.' }, 400);
    try {
      await auth.api.changePassword({
        body: { ...body.data, revokeOtherSessions: false },
        headers: c.req.raw.headers,
      });
    } catch {
      return c.json({ error: 'Senha atual incorreta.' }, 400);
    }
    await db
      .update(user)
      .set({ mustChangePassword: false, updatedAt: new Date() })
      .where(eq(user.id, c.get('userId')));
    return c.json({ ok: true });
  });

  // ---------------------------------------------------------------------------
  // Administração
  // ---------------------------------------------------------------------------

  app.use('/admin/*', async (c, next) => {
    const me = await loadUser(c.get('userId'));
    if (!me || !isAdmin(me)) return c.json({ error: 'Apenas administradores' }, 403);
    await next();
  });

  app.get('/admin/users', async (c) => {
    const q = (c.req.query('q') ?? '').trim();
    const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        disabled: user.disabled,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(
        q ? or(ilike(user.username, `%${escaped}%`), ilike(user.name, `%${escaped}%`)) : undefined,
      )
      .orderBy(asc(user.username))
      .limit(200);
    return c.json({
      users: rows.map((u) => ({
        ...u,
        username: u.username ?? '',
        isAdmin: isAdmin(u),
        fixedAdmin: isFixedAdmin(u),
      })),
    });
  });

  app.post('/admin/users/:id/temp-password', async (c) => {
    const target = await loadUser(c.req.param('id'));
    if (!target) return c.json({ error: 'Usuário não encontrado' }, 404);
    const password = temporaryPassword();
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(password);
    const updated = await db
      .update(account)
      .set({ password: hash, updatedAt: new Date() })
      .where(and(eq(account.userId, target.id), eq(account.providerId, 'credential')))
      .returning({ id: account.id });
    if (!updated.length) return c.json({ error: 'Essa conta não usa senha' }, 400);
    await db
      .update(user)
      .set({ mustChangePassword: true, updatedAt: new Date() })
      .where(eq(user.id, target.id));
    await db.delete(session).where(eq(session.userId, target.id));
    return c.json({ password });
  });

  app.post('/admin/users/:id/role', async (c) => {
    const body = z.object({ admin: z.boolean() }).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'Formato inválido' }, 400);
    const target = await loadUser(c.req.param('id'));
    if (!target) return c.json({ error: 'Usuário não encontrado' }, 404);
    if (!body.data.admin) {
      if (isFixedAdmin(target))
        return c.json(
          { error: 'Esse administrador é definido na variável ADMIN_USERNAMES da Vercel.' },
          400,
        );
      if (target.id === c.get('userId'))
        return c.json(
          { error: 'Você não pode remover o seu próprio papel de administrador.' },
          400,
        );
    }
    if (body.data.admin && target.disabled)
      return c.json({ error: 'Reative a conta antes de torná-la administradora.' }, 400);
    await db
      .update(user)
      .set({ role: body.data.admin ? 'admin' : 'user', updatedAt: new Date() })
      .where(eq(user.id, target.id));
    return c.json({ ok: true });
  });

  app.post('/admin/users/:id/disabled', async (c) => {
    const body = z
      .object({ disabled: z.boolean() })
      .safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'Formato inválido' }, 400);
    const target = await loadUser(c.req.param('id'));
    if (!target) return c.json({ error: 'Usuário não encontrado' }, 404);
    if (body.data.disabled) {
      if (target.id === c.get('userId'))
        return c.json({ error: 'Você não pode desativar a sua própria conta.' }, 400);
      if (isAdmin(target))
        return c.json({ error: 'Remova o papel de administrador antes de desativar.' }, 400);
    }
    await db
      .update(user)
      .set({ disabled: body.data.disabled, updatedAt: new Date() })
      .where(eq(user.id, target.id));
    if (body.data.disabled) await db.delete(session).where(eq(session.userId, target.id));
    return c.json({ ok: true });
  });
}
