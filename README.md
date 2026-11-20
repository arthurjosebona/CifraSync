# CifraSync

Organizador de **cifras e repertórios** com **teleprompter de palco**, para músicos e bandas. Funciona na **Web**, no **Android** e no **Desktop (Windows e Linux)**, **offline**, com sincronização entre todos os aparelhos e compartilhamento de repertórios entre membros de uma banda.

> 🧪 MVP implementado, em fase de testes em uso real. Desenvolvido pelo fluxo **SDD** (Spec-Driven Development): `SPEC → PLAN → TASKS → implementação` — ver [`docs/specs/01-mvp`](docs/specs/01-mvp/SPEC.md).

## Funcionalidades

- **Músicas e cifras:** cole a cifra (acordes em cima, letra embaixo) e ela é formatada sozinha; destaque de refrão em 3 variações e 2ª voz; tablaturas, solos e anotações; transposição rápida com ♯/♭ pelo tom; capotraste; diagramas para violão/guitarra, cavaco/banjo e ukulele, destro ou canhoto; importação/exportação em `.txt` e ChordPro.
- **Repertórios e grupos:** setlists com tom por música e momentos ("Intervalo"); grupos que compartilham repertórios sincronizados, com convite pelo nome de usuário e papéis (dono, editor, membro).
- **Palco:** tela cheia que não apaga; paginação por toque, teclado ou pedal; rolagem automática por velocidade ou pela duração; modo híbrido (rolar à mão sem desligar a automática); coluna de acordes; fonte, cores, tema escuro e layout personalizáveis por conta ou por aparelho.
- **Offline e sincronização:** tudo fica no aparelho; a sincronização Web ⇄ Android ⇄ Desktop acontece sozinha quando há conexão, sem perder texto em conflitos.

## Instalação

| Plataforma | Como instalar |
|---|---|
| **Web** | Abra o site e, se quiser, *Instalar app* no navegador (funciona offline depois do primeiro acesso). |
| **Windows 10/11** | Baixe o `.exe` (ou `.msi`) da [última release](https://github.com/arthurjosebona/CifraSync/releases/latest). O Windows pode mostrar o aviso do SmartScreen porque o instalador não tem certificado pago: *Mais informações → Executar assim mesmo*. O app se atualiza sozinho. |
| **Linux** | Baixe o `.AppImage` (qualquer distribuição: `chmod +x` e execute) ou o `.deb` (Ubuntu, Mint, Debian) da [última release](https://github.com/arthurjosebona/CifraSync/releases/latest). |
| **Android 7+** | Baixe o `.apk` da [última release](https://github.com/arthurjosebona/CifraSync/releases/latest) e permita *instalar de fontes desconhecidas*. Para atualizar sozinho, use o [Obtainium](https://github.com/ImranR98/Obtainium) apontando para este repositório. |

## Desenvolvimento local

Requisitos: Node 24+ e pnpm. Nada mais para a web e a API — o banco local de desenvolvimento é o [PGlite](https://pglite.dev) (Postgres em arquivo).

```bash
pnpm install
pnpm --filter @cifrasync/web dev:api   # API em http://localhost:8787 (banco em apps/web/.data)
pnpm --filter @cifrasync/web dev       # app em http://localhost:5173 (proxy de /api)
```

| Comando | O que faz |
|---|---|
| `pnpm test` | Testes de todos os pacotes (inclui API e sync contra PGlite) |
| `pnpm lint` · `pnpm typecheck` · `pnpm build` | Qualidade e build |
| `pnpm --filter @cifrasync/web e2e` | Testes e2e do palco (Playwright) |
| `pnpm --filter @cifrasync/desktop dev` | App desktop (precisa de [Rust](https://rustup.rs) e das dependências do Tauri) |
| `pnpm --filter @cifrasync/android sync` | Atualiza o projeto Android (abra `apps/android/android` no Android Studio) |

## Arquitetura

```
apps/web        SPA React (a interface única) + API Hono em Vercel Functions (api/, server/)
apps/desktop    Tauri 2 — empacota a SPA para Windows e Linux
apps/android    Capacitor — empacota a SPA em APK
packages/core   cifra, acordes, transposição, capo, posições (TypeScript puro)
packages/sync   banco local (IndexedDB/Dexie), fila de mutações e motor de sincronização
packages/shared schemas Zod compartilhados entre app e API
```

- **Hospedagem gratuita:** site e API na Vercel (Hobby), Postgres na Neon (via Vercel), instaladores nas GitHub Releases.
- **Offline-first:** a interface só lê e grava no banco local; a sincronização usa push/pull com cursor por escopo e cópia de conflito para letras.
- Decisões detalhadas nos [ADRs](docs/adr/README.md).

## Documentação

Tudo em [`docs/`](docs/README.md): contexto do produto, especificações por feature, processo SDD, prompts usados e decisões de arquitetura.

## Feito com auxílio de IA

Este projeto é planejado e desenvolvido por [@arthurjosebona](https://github.com/arthurjosebona) com auxílio de IA (Claude, da Anthropic). A IA escreve documentos e código sob direção e revisão do autor; cada etapa do fluxo SDD é aprovada por ele antes da próxima. Os prompts usados ficam versionados em [`docs/prompts/`](docs/prompts/), e commits gerados com a IA levam o trailer `Co-Authored-By`.

## Contribuindo

Commits seguem **Conventional Commits** e o fluxo de branches é o **git flow** — veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE). Dados de posições de acordes derivados do [chords-db](https://github.com/tombatossals/chords-db) — ver [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
