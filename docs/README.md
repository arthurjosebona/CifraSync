# Documentação do CifraSync

```
docs/
├─ contexto/        # O que o produto é e como deve se comportar (fonte para as SPECs)
├─ specs/           # Uma pasta por feature: SPEC.md → PLAN.md → TASKS.md
├─ prompts/         # Prompts enviados à IA, versionados em ordem
├─ adr/             # Decisões de arquitetura (Architecture Decision Records)
└─ processo/        # Como trabalhamos: fluxo SDD, templates e versionamento
```

## `contexto/`

| Arquivo | Conteúdo |
|---|---|
| [visao-do-produto.md](contexto/visao-do-produto.md) | Visão, público, conceitos do domínio e princípios |
| [requisitos.md](contexto/requisitos.md) | Requisitos funcionais (`RF-xx`) e não funcionais (`RNF-xx`) com prioridade P0/P1/P2 e o que está fora do escopo |
| [dominio-musical.md](contexto/dominio-musical.md) | Formato da cifra, formatação automática, leitura de acordes, transposição, capotraste, diagramas |
| [sincronizacao-offline.md](contexto/sincronizacao-offline.md) | Dados, protocolo de sync, grupos e permissões |
| [modo-palco.md](contexto/modo-palco.md) | Teleprompter: layout, paginação, rolagem automática/híbrida, personalização |

> [!NOTE]
> Os documentos de contexto descrevem **comportamento**. Onde citam tecnologias (bibliotecas, banco, protocolos), são **notas preliminares**: a escolha só vale depois de aprovada no `PLAN.md` da feature correspondente.

## `specs/`

Uma pasta numerada por feature, seguindo os templates de [`processo/sdd/templates/`](processo/sdd/templates/):

| Pasta | Feature | Etapa |
|---|---|---|
| [01-mvp](specs/01-mvp/SPEC.md) | Produto inicial (MVP multiplataforma) | SPEC aprovada · [PLAN](specs/01-mvp/PLAN.md) em revisão |

## `prompts/`

Ver [prompts/README.md](prompts/README.md).

## `adr/`

Ver [adr/README.md](adr/README.md).

## `processo/`

- [sdd/SKILL.md](processo/sdd/SKILL.md) — o fluxo SDD (IDEA → SPEC → PLAN → TASKS → implementação)
- [sdd/templates/](processo/sdd/templates/) — modelos de SPEC, PLAN, TASKS, TESTS e ROLLBACK
- [versionamento.md](processo/versionamento.md) — Conventional Commits, branches, releases e autoria com IA
