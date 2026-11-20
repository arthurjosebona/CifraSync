# 0003 — Capacitor no Android

**Status:** Aceita
**Data:** 2026-11-20
**Origem:** [specs/01-mvp/PLAN.md](../specs/01-mvp/PLAN.md)

## Contexto

O app Android precisa:

- usar a mesma SPA das outras plataformas;
- rodar offline;
- manter a tela ligada;
- controlar a orientação e a tela cheia;
- ser distribuído sem loja paga.

## Decisão

**Capacitor** em `apps/android`, com `androidScheme: https`.

- **Plugins:** keep-awake, screen-orientation, status-bar, preferences e filesystem/share.
- **Assinatura e distribuição:** o APK é assinado com uma keystore própria no GitHub Actions e publicado nas GitHub Releases. Essa forma de distribuição é compatível com o Obtainium.
- **Atualizações:** o app avisa quando há uma release nova.

## Consequências

- Os plugins são maduros e bem documentados.
- A keystore precisa de backup. Se ela for perdida, quem já instalou só recebe versões novas reinstalando o app.
- Para instalar, o usuário precisa permitir fontes externas, porque não há Play Store no MVP.

## Alternativas consideradas

- **Tauri mobile:** o suporte é mais recente e tem menos plugins prontos.
