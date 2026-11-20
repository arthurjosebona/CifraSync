# CifraSync

Organizador de **cifras e repertórios** com **teleprompter de palco**, para músicos e bandas. Funciona na **Web**, no **Android** e no **Desktop (Windows e Linux)**, **offline**, com sincronização entre todos os dispositivos e compartilhamento de repertórios entre membros de uma banda.

> 🚧 Em planejamento. Nenhum código ainda — o projeto segue o fluxo **SDD** (Spec-Driven Development): `SPEC → PLAN → TASKS → implementação`, com aprovação humana entre as etapas.

## Funcionalidades previstas

- **Músicas e cifras:** cadastro com formatação automática (cifra × letra), destaque de refrão (3 variações) e 2ª voz, tablaturas, solos e anotações, transposição rápida, capotraste e diagramas de acordes para violão/guitarra, cavaco/banjo e ukulele (destro ou canhoto).
- **Repertórios e grupos:** setlists para shows e ensaios; grupos (bandas) que compartilham repertórios sincronizados, com convite pelo nome de usuário.
- **Palco:** modo offline completo, sincronização Web ⇄ Android ⇄ Desktop, personalização de tela (fonte, cores, tema escuro, layout), paginação por toque, rolagem automática e modo híbrido.

## Documentação

Tudo em [`docs/`](docs/README.md): contexto do produto, especificações por feature, processo SDD, prompts usados e decisões de arquitetura.

## Feito com auxílio de IA

Este projeto é planejado e desenvolvido por [@arthurjosebona](https://github.com/arthurjosebona) com auxílio de IA (Claude, da Anthropic). A IA escreve documentos e código sob direção e revisão do autor; cada etapa do fluxo SDD é aprovada por ele antes da próxima. Os prompts usados ficam versionados em [`docs/prompts/`](docs/prompts/), e commits gerados com a IA levam o trailer `Co-Authored-By`.

## Contribuindo

Commits seguem **Conventional Commits** — veja [CONTRIBUTING.md](CONTRIBUTING.md).
