# 0006 — Autenticação com Better Auth

**Status:** Aceita
**Data:** 2026-11-20
**Origem:** [specs/01-mvp/PLAN.md](../specs/01-mvp/PLAN.md)

## Contexto

O app precisa de:

- contas com nome de usuário único, usado nos convites de grupo;
- sessão longa, para o uso offline no palco;
- login a partir de origens diferentes (navegador, Tauri e Capacitor);
- nenhum serviço pago.

## Decisão

**Better Auth** dentro da API Hono, com as tabelas no próprio Postgres.

| Item | Configuração |
|---|---|
| Login | E-mail e senha, com hash forte |
| Plugins | `username` e `bearer` |
| Sessão | 60 dias, renovada a cada uso |
| Web | Cookie HttpOnly |
| Desktop e Android | Token bearer guardado pela camada `Platform` |
| CORS | Libera apenas as origens do Tauri e do Capacitor |

## Consequências

- Não há provedor externo nem custo.
- Login social e recuperação de senha por e-mail ficam fora do MVP. O primeiro exige criar apps OAuth; o segundo, um serviço de e-mail.

## Alternativas consideradas

- **Auth.js:** menos adequado a clientes nativos que usam token bearer.
- **Clerk / Auth0:** serviços externos, com limites e dependência de terceiros.
