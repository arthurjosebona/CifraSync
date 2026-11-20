# 0008 — Repositório público, release 0.1.0 e Fase 2

- **Data:** 2026-11-20
- **Etapa SDD:** Implementação
- **Feature:** [01-mvp](../specs/01-mvp/SPEC.md)

## Prompt

> tornei o repositório público e fiz o merge da release 0.1.0, revisei as posições e tudo ok. continue

## Resultado

- **T9:** tag `v0.1.0` criada no commit de merge da `main`; `main` incorporada de volta na `develop`; `release/0.1.0` apagada.
- **T21:** posições de cavaco e ukulele aprovadas pelo autor.
- **CI:** o `pnpm install` falhava pela política de idade mínima de pacotes do pnpm 12 (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`); a regra foi fixada no `pnpm-workspace.yaml` (PR #2).
- **Fase 2 (T23–T32, exceto T33):** base da SPA, schemas compartilhados, diagrama de acorde, banco local, biblioteca, tela da música, editor, dicionário, repertórios e PWA.
- **Pendentes do autor:** T7 (proteção de branches) e T33 (uso real da SPA local).
