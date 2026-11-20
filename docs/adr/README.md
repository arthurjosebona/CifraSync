# Decisões de arquitetura (ADR)

Cada decisão técnica relevante vira um arquivo `NNNN-titulo-curto.md`, criado quando o `PLAN.md` que a introduz é aprovado.

Modelo:

```markdown
# NNNN — Título

**Status:** Proposta | Aceita | Substituída por NNNN
**Data:** AAAA-MM-DD
**Origem:** docs/specs/NN-feature/PLAN.md

## Contexto
## Decisão
## Consequências
## Alternativas consideradas
```

## Índice

| ADR | Decisão | Status |
|---|---|---|
| [0001](0001-spa-unica-multiplataforma.md) | Uma SPA React para todas as plataformas | Aceita |
| [0002](0002-tauri-no-desktop.md) | Tauri 2 no desktop (Windows e Linux) | Aceita |
| [0003](0003-capacitor-no-android.md) | Capacitor no Android | Aceita |
| [0004](0004-api-hono-e-neon-na-vercel.md) | API Hono em Vercel Functions com Neon Postgres | Aceita |
| [0005](0005-offline-first-e-sync-proprio.md) | Offline-first com IndexedDB e sync próprio | Aceita |
| [0006](0006-autenticacao-better-auth.md) | Autenticação com Better Auth | Aceita |
| [0007](0007-versionamento-git-flow.md) | Git flow desde o início e commit-and-tag-version | Aceita |
| [0008](0008-decisoes-em-aberto-da-spec.md) | Decisões dos pontos em aberto da SPEC do MVP | Aceita |
