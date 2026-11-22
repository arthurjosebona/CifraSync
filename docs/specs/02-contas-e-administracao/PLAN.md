# PLAN — Contas sem e-mail e administração

Implementa a [SPEC](SPEC.md).

## Banco

Três colunas novas na tabela `user` (migration `0002`):

| Coluna | Tipo | Padrão | Uso |
|---|---|---|---|
| `role` | `text` | `'user'` | `'admin'` para quem foi promovido pela tela |
| `must_change_password` | `boolean` | `false` | ligado ao gerar senha temporária |
| `disabled` | `boolean` | `false` | conta desativada |

As colunas **não** são declaradas como `additionalFields` do Better Auth, então o cadastro não aceita esses campos vindos do cliente.

## E-mail interno

O cliente cadastra com `<usuario>@usuarios.cifrasync.invalid` (`internalEmail()` em `@cifrasync/shared`). O TLD `.invalid` é reservado (RFC 2606) e nunca recebe mensagem. Como o nome de usuário é único, o e-mail também é. A tela de conta esconde e-mails desse domínio.

## Servidor

- `ADMIN_USERNAMES` é lida em `server/instance.ts` e passada para `createApp` (`adminUsernames`).
- `databaseHooks.session.create.before` no Better Auth recusa criar sessão para conta desativada (`ACCOUNT_DISABLED`).
- Rotas novas, todas atrás da sessão:
  - `GET /api/account/me` → `{ isAdmin, mustChangePassword }`;
  - `POST /api/account/password` `{ currentPassword, newPassword }` → usa `auth.api.changePassword` e desliga `must_change_password`;
  - `GET /api/admin/users?q=`;
  - `POST /api/admin/users/:id/temp-password` → gera 12 caracteres sem letras ambíguas (formato `xxxx-xxxx-xxxx`), grava o hash com o `password.hash` do próprio Better Auth, liga `must_change_password` e apaga as sessões;
  - `POST /api/admin/users/:id/role` `{ admin }`;
  - `POST /api/admin/users/:id/disabled` `{ disabled }` → ao desativar, apaga as sessões.
- `/api/users/search` deixa de listar contas desativadas.

## Cliente

- `Login`: sai o campo de e-mail; o campo de login vira "Nome de usuário".
- `lib/account.ts`: `signUp` monta o e-mail interno; `useAccountStatus()` consulta `/account/me` (guardado em `meta.accountStatus` para funcionar offline) ao abrir o app, ao entrar e ao voltar a ficar online; `changePassword()`.
- `AccountSection`: botão **Trocar senha** (formulário em linha) e link **Administração** para administradores.
- `ChangePasswordGate` (no `AppShell`): enquanto `mustChangePassword` estiver ligado, cobre o app com o formulário de troca.
- Rota `/admin` (`routes/Admin.tsx`): busca, lista e ações; a senha temporária aparece num quadro com botão de copiar.

## Testes

`server/admin.test.ts` cobre os critérios de aceite da SPEC contra PGlite; os testes de API existentes continuam passando.

## Implantação

1. Migration aplicada pelo workflow `migrate.yml` no merge da `main`.
2. O autor cria `ADMIN_USERNAMES` na Vercel (Production) e faz o redeploy.
