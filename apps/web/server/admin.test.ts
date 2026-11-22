import { internalEmail } from '@cifrasync/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { temporaryPassword } from './admin.js';
import { createTestApi, type TestApi } from './test-utils.js';

let api: TestApi;
beforeAll(async () => {
  api = await createTestApi({ adminUsernames: ['chefe'] });
}, 60_000);
afterAll(async () => {
  await api?.close();
});

const SENHA = 'senha-forte-123';

/** Cadastro como o app faz: sem e-mail real. */
async function cadastrar(username: string) {
  const r = await api.call('/auth/sign-up/email', {
    body: { email: internalEmail(username), password: SENHA, name: username, username },
  });
  expect(r.status).toBe(200);
  return {
    token: (r.headers.get('set-auth-token') ?? r.json.token) as string,
    userId: r.json.user.id as string,
  };
}

async function entrar(username: string, password: string) {
  const r = await api.call('/auth/sign-in/username', { body: { username, password } });
  return { status: r.status, token: (r.headers.get('set-auth-token') ?? r.json?.token) as string };
}

describe('contas sem e-mail', () => {
  it('cadastra com o e-mail interno e entra pelo nome de usuário', async () => {
    await cadastrar('sem_email');
    const r = await entrar('sem_email', SENHA);
    expect(r.status).toBe(200);
    const me = await api.call('/account/me', { token: r.token });
    expect(me.json).toEqual({ isAdmin: false, mustChangePassword: false });
  });

  it('não aceita role nem flags vindos do cadastro', async () => {
    const r = await api.call('/auth/sign-up/email', {
      body: {
        email: internalEmail('esperto'),
        password: SENHA,
        name: 'esperto',
        username: 'esperto',
        role: 'admin',
      },
    });
    const token = (r.headers.get('set-auth-token') ?? r.json?.token) as string | undefined;
    if (r.status === 200) {
      expect((await api.call('/account/me', { token })).json.isAdmin).toBe(false);
    } else {
      expect(r.status).toBe(400);
    }
  });

  it('troca a própria senha conferindo a atual', async () => {
    const { token } = await cadastrar('troca');
    const errada = await api.call('/account/password', {
      token,
      body: { currentPassword: 'outra-coisa', newPassword: 'nova-senha-456' },
    });
    expect(errada.status).toBe(400);
    const curta = await api.call('/account/password', {
      token,
      body: { currentPassword: SENHA, newPassword: '123' },
    });
    expect(curta.status).toBe(400);
    const ok = await api.call('/account/password', {
      token,
      body: { currentPassword: SENHA, newPassword: 'nova-senha-456' },
    });
    expect(ok.status).toBe(200);
    expect((await entrar('troca', SENHA)).status).not.toBe(200);
    expect((await entrar('troca', 'nova-senha-456')).status).toBe(200);
  });
});

describe('administração', () => {
  it('usuário comum não acessa as rotas de admin', async () => {
    const { token, userId } = await cadastrar('comum');
    expect((await api.call('/admin/users', { token })).status).toBe(403);
    expect(
      (await api.call(`/admin/users/${userId}/temp-password`, { token, method: 'POST' })).status,
    ).toBe(403);
  });

  it('senha temporária: derruba as sessões e obriga a trocar', async () => {
    const chefe = await cadastrar('chefe');
    const maria = await cadastrar('maria_temp');
    expect((await api.call('/account/me', { token: chefe.token })).json.isAdmin).toBe(true);

    const lista = await api.call('/admin/users?q=maria', { token: chefe.token });
    expect(lista.json.users.map((u: { username: string }) => u.username)).toEqual(['maria_temp']);

    const r = await api.call(`/admin/users/${maria.userId}/temp-password`, {
      token: chefe.token,
      method: 'POST',
    });
    expect(r.status).toBe(200);
    expect(r.json.password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);

    expect((await api.call('/sync/pull', { token: maria.token })).status).toBe(401);
    expect((await entrar('maria_temp', SENHA)).status).not.toBe(200);
    const login = await entrar('maria_temp', r.json.password);
    expect(login.status).toBe(200);
    expect((await api.call('/account/me', { token: login.token })).json.mustChangePassword).toBe(
      true,
    );

    await api.call('/account/password', {
      token: login.token,
      body: { currentPassword: r.json.password, newPassword: 'minha-nova-senha' },
    });
    expect((await api.call('/account/me', { token: login.token })).json.mustChangePassword).toBe(
      false,
    );
  });

  it('promove e remove administradores, protegendo os da variável', async () => {
    const chefe = await entrar('chefe', SENHA);
    const me = await api.call('/admin/users?q=chefe', { token: chefe.token });
    const chefeId = me.json.users[0].id as string;
    expect(me.json.users[0].fixedAdmin).toBe(true);

    const ana = await cadastrar('ana_admin');
    await api.call(`/admin/users/${ana.userId}/role`, {
      token: chefe.token,
      body: { admin: true },
    });
    expect((await api.call('/admin/users', { token: ana.token })).status).toBe(200);

    // ana não tira o chefe (da variável) nem a si mesma
    const tirarChefe = await api.call(`/admin/users/${chefeId}/role`, {
      token: ana.token,
      body: { admin: false },
    });
    expect(tirarChefe.status).toBe(400);
    const tirarSi = await api.call(`/admin/users/${ana.userId}/role`, {
      token: ana.token,
      body: { admin: false },
    });
    expect(tirarSi.status).toBe(400);

    // o chefe tira a ana
    await api.call(`/admin/users/${ana.userId}/role`, {
      token: chefe.token,
      body: { admin: false },
    });
    expect((await api.call('/admin/users', { token: ana.token })).status).toBe(403);
  });

  it('desativa e reativa contas', async () => {
    const chefe = await entrar('chefe', SENHA);
    const ze = await cadastrar('ze_desativado');
    const busca = await cadastrar('buscador');

    const r = await api.call(`/admin/users/${ze.userId}/disabled`, {
      token: chefe.token,
      body: { disabled: true },
    });
    expect(r.status).toBe(200);
    expect((await api.call('/sync/pull', { token: ze.token })).status).toBe(401);
    expect((await entrar('ze_desativado', SENHA)).status).not.toBe(200);
    const achados = await api.call('/users/search?q=ze_d', { token: busca.token });
    expect(achados.json.users).toEqual([]);

    await api.call(`/admin/users/${ze.userId}/disabled`, {
      token: chefe.token,
      body: { disabled: false },
    });
    expect((await entrar('ze_desativado', SENHA)).status).toBe(200);
  });

  it('não desativa a si mesmo nem um administrador', async () => {
    const chefe = await entrar('chefe', SENHA);
    const me = await api.call('/admin/users?q=chefe', { token: chefe.token });
    const proprio = await api.call(`/admin/users/${me.json.users[0].id}/disabled`, {
      token: chefe.token,
      body: { disabled: true },
    });
    expect(proprio.status).toBe(400);
  });
});

describe('senha temporária', () => {
  it('tem 12 caracteres sem ambíguos e varia', () => {
    const a = temporaryPassword();
    expect(a).toMatch(/^[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}$/);
    expect(new Set(Array.from({ length: 20 }, temporaryPassword)).size).toBe(20);
  });
});
