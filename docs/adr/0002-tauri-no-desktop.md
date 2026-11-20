# 0002 — Tauri 2 no desktop (Windows e Linux)

**Status:** Aceita
**Data:** 2026-11-20
**Origem:** [specs/01-mvp/PLAN.md](../specs/01-mvp/PLAN.md)

## Contexto

É preciso um executável instalável para Windows 10/11 e Linux (Ubuntu, Mint, Debian), distribuído de graça e com atualização automática.

## Decisão

**Tauri 2** em `apps/desktop`, carregando o build da SPA:

| Aspecto | Como funciona |
|---|---|
| Motor de renderização | WebView2 no Windows e WebKitGTK no Linux |
| Pacotes gerados | `.exe` (NSIS) e `.msi` no Windows; `.AppImage` e `.deb` no Linux. O build roda no GitHub Actions com o `tauri-action` |
| Atualização automática | Plugin `updater`, que lê o `latest.json` das GitHub Releases. As atualizações são assinadas com uma chave própria, gerada de graça |
| Tela sempre ligada | Comando Rust que usa a crate `keepawake` |

## Consequências

- Os instaladores ficam pequenos, por volta de 10 MB.
- O WebKitGTK difere do Chromium em detalhes. Por isso os testes e2e rodam também em WebKit.
- A chave privada do updater precisa de backup. Se ela for perdida, as instalações existentes param de receber atualizações.
- Sem certificado pago, o Windows mostra o aviso do SmartScreen na instalação.

## Alternativas consideradas

- **Electron:** instaladores de 80 a 150 MB e maior consumo de memória.
