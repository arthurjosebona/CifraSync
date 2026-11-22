/**
 * Entrada da API na Vercel (Vercel Functions, runtime Node). Toda rota /api/* cai aqui pelo rewrite do
 * vercel.json (um arquivo `[[...route]]` só casa um nível de caminho fora do Next.js).
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
