# 0007 — Git flow desde o início e versão com commit-and-tag-version

**Status:** Aceita
**Data:** 2026-11-20
**Origem:** [specs/01-mvp/PLAN.md](../specs/01-mvp/PLAN.md)

## Contexto

O projeto fica no GitHub do autor, é feito com auxílio de IA e deve ser versionado com Conventional Commits. O autor pediu **git flow desde o início** (prompt [0005](../prompts/0005-git-flow-desde-o-inicio.md)).

## Decisão

- **Branches:**
  - `main`: só versões publicadas, cada uma com tag.
  - `develop`: integração.
  - `feature/*`: entram na `develop` por squash.
  - `release/X.Y.Z` e `hotfix/X.Y.Z`: entram na `main` por merge commit e depois voltam para a `develop`.
- **Commits:** Conventional Commits em português, validados pelo commitlint no hook local e no título do PR.
- **Versão:** o **commit-and-tag-version** roda na branch de release e gera a versão, o CHANGELOG e o commit `chore(release)`. A tag `vX.Y.Z` é criada no commit de merge da `main`, e o push dessa tag dispara o build de release.

O procedimento completo está em [processo/versionamento.md](../processo/versionamento.md).

## Consequências

- O histórico da `main` é o histórico de versões.
- A primeira release usa `--release-as 0.1.0`, porque ainda não há commits `feat:` desde a 0.0.0.
- No plano gratuito do GitHub, a proteção de branches só funciona em **repositório público**.

## Alternativas consideradas

- **release-please:** assume uma única branch de release, o que conflita com o git flow.
