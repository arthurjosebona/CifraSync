# 0011 — Primeiro deploy e hotfix 0.3.1

- **Data:** 2026-11-22
- **Etapa SDD:** Implementação (implantação)
- **Feature:** [01-mvp](../specs/01-mvp/SPEC.md)

## Prompts

> detalhe tudo que eu devo fazer

> onde vai pra achar? passo a passo completo 2.2 e 2.5

> não consigo dar o primeiro deploy, precisa dar merge [conflitos do PR da release 0.3.0 com a main]

> a parte da 5 e 6 n precisa fazer se não for atualizar sozinho né? então nem vou fazer, vou lançar alguma versão estável e pronto, além disso, já aprovei o pr, então faça o que precisar, até o passo 4 está feito

> Consegue lançar os baixáveis para o android e para o windows para eu testar?

## Resultado

- Conflitos da `release/0.3.0` com a `main` resolvidos mantendo as versões 0.3.0; release mergeada e tag `v0.3.0`.
- **Hotfix 0.3.1:** fora do Next.js a Vercel só encaminhava um nível de caminho para `api/[[...route]].ts`, e `/api/auth/*` e `/api/sync/*` davam 404. A entrada virou `api/index.ts` com rewrite de `/api/(.*)` no `vercel.json`.
- Variáveis de produção sem `https://` (`VITE_API_URL` no GitHub e `BETTER_AUTH_URL` na Vercel) corrigidas.
- Release `v0.3.1` com instaladores de Windows e Linux e o APK de teste (sem keystore, anexado à mão).
- Partes 5 (updater) e 6 (keystore) adiadas pelo autor.
