# 0005 — Git flow desde o início

- **Data:** 2026-11-20
- **Etapa SDD:** TASKS (ajuste)
- **Feature:** [01-mvp](../specs/01-mvp/SPEC.md)

## Prompt

> Pode aplicar git flow desde o início na verdade, faça essa mudança depois aprovarei

## Resultado

- [`processo/versionamento.md`](../processo/versionamento.md): git flow vale desde a Fase 0. A `develop` é criada logo após o push inicial, e cada fase sai em `release/0.x.0`.
- [`PLAN.md`](../specs/01-mvp/PLAN.md) e [`CONTRIBUTING.md`](../../CONTRIBUTING.md) ajustados.
- [`TASKS.md`](../specs/01-mvp/TASKS.md): a T1 cria a `develop`, a nova T7 protege as branches, cada fase indica as suas `feature/*` e cada release segue o fluxo `release/*`. A antiga T81 (início do git flow na v1.0.0) saiu.
