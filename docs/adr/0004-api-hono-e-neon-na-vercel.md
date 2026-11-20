# 0004 — API Hono em Vercel Functions com Neon Postgres

**Status:** Aceita
**Data:** 2026-11-20
**Origem:** [specs/01-mvp/PLAN.md](../specs/01-mvp/PLAN.md)

## Contexto

A SPEC exige hospedagem gratuita na Vercel, com um banco de dados oferecido pela própria Vercel.

## Decisão

- **API:** **Hono** em Vercel Functions (Node), no mesmo projeto da SPA (`apps/web/api`).
- **Banco:** **Neon Postgres**, criado em *Storage/Marketplace* da Vercel. A Vercel injeta a `DATABASE_URL`. O acesso é feito com o **Drizzle ORM** e o driver serverless da Neon.
- **Migrations:** SQL versionado no repositório, aplicado por um workflow na `main`. Nunca rodam em runtime.
- **Região:** funções em `gru1` e banco em São Paulo, se o plano gratuito oferecer. Senão, os dois em `us-east-1`.

## Consequências

- O custo é zero enquanto o uso ficar nas cotas gratuitas: cerca de 0,5 GB de armazenamento e uma cota mensal de compute, com scale-to-zero.
- O plano Hobby da Vercel é só para uso não comercial. Se isso mudar, o Hono é portátil (por exemplo, para Cloudflare Workers).
- O polling de sync precisa ser contido para não esgotar o compute (ver ADR 0005).

## Alternativas consideradas

- **Supabase:** viável, mas adiciona um serviço e um modelo próprio de auth e realtime que não são necessários.
