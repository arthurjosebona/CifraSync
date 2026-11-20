/**
 * Limite de requisições simples, em memória, por IP.
 * Em funções serverless cada instância tem a própria contagem — é uma proteção básica contra
 * abuso (busca de usuários, tentativas de login), não um limite exato.
 */
import type { MiddlewareHandler } from 'hono';

export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): MiddlewareHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  return async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'local';
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || h.reset < now) hits.set(ip, { count: 1, reset: now + windowMs });
    else if (++h.count > max) {
      c.header('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return c.json({ error: 'Muitas requisições, tente de novo em instantes' }, 429);
    }
    if (hits.size > 10_000) hits.clear();
    await next();
  };
}
