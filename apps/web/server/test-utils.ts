/**
 * Ambiente de teste da API: PGlite em memória + Better Auth reais, chamados via app.fetch.
 */
import { createApp } from './app.js';
import { createAuth } from './auth.js';
import { createDb, migrateDb } from './db/client.js';

export async function createTestApi() {
  const handle = await createDb('pglite:memory');
  await migrateDb(handle);
  const baseURL = 'http://localhost:5173';
  const auth = createAuth(handle.db, {
    secret: 'segredo-de-teste-com-tamanho-suficiente-000',
    baseURL,
  });
  const app = createApp({ db: handle.db, auth, webOrigins: [baseURL] });

  const call = async (
    path: string,
    init: { method?: string; body?: unknown; token?: string } = {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- respostas livres nos testes
  ): Promise<{ status: number; json: any; headers: Headers }> => {
    const res = await app.fetch(
      new Request(`${baseURL}/api${path}`, {
        method: init.method ?? (init.body ? 'POST' : 'GET'),
        headers: {
          'content-type': 'application/json',
          origin: baseURL,
          ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
      }),
    );
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null, headers: res.headers };
  };

  /** Cria uma conta e devolve o token bearer e o id do usuário. */
  const signUp = async (username: string) => {
    const r = await call('/auth/sign-up/email', {
      body: {
        email: `${username}@exemplo.test`,
        password: 'senha-forte-123',
        name: username,
        username,
      },
    });
    if (r.status !== 200) throw new Error(`cadastro falhou: ${JSON.stringify(r.json)}`);
    const token = r.headers.get('set-auth-token') ?? r.json.token;
    return { token: token as string, userId: r.json.user.id as string };
  };

  return { app, call, signUp, db: handle.db, close: () => handle.close() };
}

export type TestApi = Awaited<ReturnType<typeof createTestApi>>;

let n = 0;
export function now() {
  return new Date(Date.UTC(2026, 10, 20, 12, 0, n++)).toISOString();
}
