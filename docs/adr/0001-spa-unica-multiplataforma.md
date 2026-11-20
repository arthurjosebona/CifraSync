# 0001 — Uma SPA React para todas as plataformas

**Status:** Aceita
**Data:** 2026-11-20
**Origem:** [specs/01-mvp/PLAN.md](../specs/01-mvp/PLAN.md)

## Contexto

O produto precisa rodar na Web, no Android e no Desktop (Windows/Linux), com **paridade de edição** (SPEC, Restrições). Manter uma interface por plataforma multiplicaria o trabalho e faria o comportamento divergir, principalmente no modo palco.

## Decisão

- **Uma única aplicação React + Vite** (SPA estática) em `apps/web`, escrita em TypeScript strict. A mesma SPA é servida como site/PWA e embutida como build estático no Tauri (desktop) e no Capacitor (Android).
- **Diferenças de plataforma** ficam atrás de uma interface `Platform`: tela ligada, tela cheia, orientação, token, arquivos e atualização.
- **A lógica musical** fica em `packages/core`, sem dependência de UI.

## Consequências

- Uma correção ou funcionalidade vale para as três plataformas de uma vez.
- A UI precisa ser responsiva, de celulares com 360 px de largura a desktops largos, e funcionar com toque, mouse e teclado.
- A SPA não tem SSR, o que não faz falta num app offline-first com login.
- O TypeScript fica fixo na 6.0 até o `typescript-eslint` suportar a 7.

## Alternativas consideradas

- **Next.js:** traz SSR sem benefício para este app e é mais difícil de embutir como build estático.
- **React Native / Flutter:** exigiriam outra base de UI para web/desktop ou abririam mão da paridade fácil.
