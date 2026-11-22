# TASKS — Contas sem e-mail e administração

Implementa o [PLAN](PLAN.md). Branch: `feature/contas-sem-email`.

- [x] **A1** — SPEC, PLAN e TASKS; prompts 0011 e 0012.
- [x] **A2** — Colunas `role`, `must_change_password` e `disabled` e migration `0002`.
- [x] **A3** — Bloqueio de login para conta desativada (hook de sessão) e busca sem contas desativadas.
- [x] **A4** — Rotas `/account/me` e `/account/password`.
- [x] **A5** — Rotas `/admin/*` com `ADMIN_USERNAMES` e as proteções da SPEC.
- [x] **A6** — Testes de API (`admin.test.ts`).
- [x] **A7** — Cadastro sem e-mail e login por nome de usuário no cliente.
- [x] **A8** — Trocar senha em Ajustes e troca obrigatória após senha temporária.
- [x] **A9** — Tela Administração.
- [ ] **A10** 👤 — Criar `ADMIN_USERNAMES` na Vercel (Production) e fazer o redeploy.
- [ ] **A11** 👤 — Testar nas três plataformas: cadastro sem e-mail, senha temporária e desativação.
