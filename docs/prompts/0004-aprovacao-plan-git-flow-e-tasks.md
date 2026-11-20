# 0004 — Aprovação do PLAN, git flow e geração do TASKS

- **Data:** 2026-11-20
- **Etapa SDD:** TASKS
- **Feature:** [01-mvp](../specs/01-mvp/SPEC.md)

## Prompt

> aprovado, há apenas uma adição no fluxo de versionamento, que é a inclusão de git flow para as features, o primeiro mvp pode ser feito na main, porém após isso tudo deve passar pelo processo padrão do git flow

## Resultado

- [`PLAN.md`](../specs/01-mvp/PLAN.md) marcado como **Aprovado**, com a seção de versionamento ajustada: MVP direto na `main`; a partir da `v1.0.0`, git flow (`develop`, `feature/*`, `release/*`, `hotfix/*`). A geração de versão passou de release-please para `commit-and-tag-version`, que funciona nos dois modelos.
- [`processo/versionamento.md`](../processo/versionamento.md) atualizado com o git flow.
- [`TASKS.md`](../specs/01-mvp/TASKS.md) gerado com status **Rascunho**, aguardando aprovação.
