# 0008 — Decisões dos pontos em aberto da SPEC do MVP

**Status:** Aceita
**Data:** 2026-11-20
**Origem:** [specs/01-mvp/PLAN.md](../specs/01-mvp/PLAN.md)

## Contexto

A [SPEC](../specs/01-mvp/SPEC.md) deixou três pontos em aberto.

## Decisão

1. **Convite de grupo com aceite.** O convidado fica `pending` até aceitar ou recusar. Ninguém entra num grupo sem consentimento.
2. **Região.** Funções e banco em São Paulo, se o plano gratuito oferecer. Senão, os dois em `us-east-1`.
3. **Banco de dados por ambiente:**

   | Ambiente | Banco |
   |---|---|
   | Desenvolvimento local | Branch `dev` do Neon (não precisa instalar nada) |
   | CI | Postgres em contêiner de serviço do Actions |
   | Previews da Vercel | Branch `dev` do Neon |

## Consequências

- O fluxo de convites exige mais uma tela e mais um estado (convites pendentes), com custo baixo.
- A latência até a região dos EUA não afeta o uso, porque o app é offline-first.
