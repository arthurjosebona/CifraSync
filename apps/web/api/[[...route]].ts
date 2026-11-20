/**
 * Entrada da API na Vercel (Vercel Functions, runtime Node). Toda rota /api/* cai aqui.
 */
import { getApp } from '../server/instance.js';

async function handler(req: Request): Promise<Response> {
  const app = await getApp();
  return app.fetch(req);
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
export const OPTIONS = handler;
