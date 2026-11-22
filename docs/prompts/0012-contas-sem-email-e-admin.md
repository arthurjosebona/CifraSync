# 0012 — Contas sem e-mail e administração

- **Data:** 2026-11-22
- **Etapa SDD:** SPEC, PLAN, TASKS e implementação
- **Feature:** [02-contas-e-administracao](../specs/02-contas-e-administracao/SPEC.md)

## Prompts

> Precisa de email para funcionar realmente? daria para deixar apenas usuário e senha se quisesse, pq a ideia desse app é para apenas o pessoal da igreja utilizar, e daí se perder senha como será feito?

Proposta: cadastro só com nome, usuário e senha; troca de senha em Ajustes; senha temporária gerada por um administrador.

> como definir como adm?

Proposta: administradores iniciais na variável `ADMIN_USERNAMES` da Vercel; os demais promovidos pela tela de Administração (opção recomendada).

> ta bom, pode implementar e depois adiciono na vercel esse campo

## Resultado

- [SPEC](../specs/02-contas-e-administracao/SPEC.md), [PLAN](../specs/02-contas-e-administracao/PLAN.md) e [TASKS](../specs/02-contas-e-administracao/TASKS.md) da feature.
- Implementação das tarefas A2–A9 na branch `feature/contas-sem-email`.
