# Contribuindo

## Fluxo de trabalho (SDD)

Features não triviais seguem o fluxo descrito em [`docs/processo/sdd/SKILL.md`](docs/processo/sdd/SKILL.md):

```
IDEA (prompt) → SPEC.md → PLAN.md → TASKS.md → implementação
```

Cada etapa só começa depois que a anterior é aprovada. Os documentos de cada feature ficam em `docs/specs/NN-nome-da-feature/` e o prompt que originou cada etapa em `docs/prompts/`.

## Commits semânticos

Todo commit segue [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em **português**:

```
<tipo>(<escopo opcional>): <descrição no imperativo, minúscula, sem ponto final>

[corpo opcional: o porquê da mudança]

[rodapé opcional: BREAKING CHANGE, refs, Co-Authored-By]
```

Detalhes (tipos, escopos, efeito na versão, branches e releases) em [`docs/processo/versionamento.md`](docs/processo/versionamento.md).

## Branches

- **MVP (até `v1.0.0`):** trabalho direto na `main`.
- **Depois:** git flow padrão. `feature/*` sai da `develop` e volta para ela; `release/*` e `hotfix/*` vão para a `main` e para a `develop`. Detalhes em [`docs/processo/versionamento.md`](docs/processo/versionamento.md#git-flow-após-o-mvp).
