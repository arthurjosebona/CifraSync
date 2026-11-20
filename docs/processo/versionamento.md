# Versionamento

## Conventional Commits

| Tipo | Uso | Efeito na versão (SemVer) |
|---|---|---|
| `feat` | nova funcionalidade | MINOR |
| `fix` | correção de bug | PATCH |
| `feat!` / rodapé `BREAKING CHANGE:` | quebra de compatibilidade (ex.: formato de dados ou de sincronização) | MAJOR |
| `perf` | melhoria de desempenho | PATCH |
| `docs` | documentação, specs, prompts | — |
| `refactor` | mudança interna sem alterar comportamento | — |
| `test` | testes | — |
| `build` | dependências, empacotamento | — |
| `ci` | pipelines | — |
| `chore` | manutenção geral | — |
| `style` | formatação | — |

**Escopos sugeridos:** `core`, `editor`, `acordes`, `repertorios`, `grupos`, `palco`, `sync`, `api`, `db`, `web`, `desktop`, `android`, `ci`, `docs`, `specs`, `prompts`.

**Exemplos**

- `feat(palco): adiciona modo de rolagem híbrida`
- `fix(sync): evita duplicar mutação reenviada após queda de rede`
- `docs(specs): adiciona SPEC da fundação do produto`

## Branches e releases

- `main` é a linha principal; depois que houver CI, só recebe mudanças por Pull Request com CI verde.
- Branches de trabalho: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Merge por **squash**, com título do PR no padrão Conventional Commits.
- Versões e CHANGELOG serão gerados automaticamente a partir dos commits (ferramenta definida no PLAN). Antes da `1.0.0`, mudanças que quebram compatibilidade sobem o MINOR.

## Autoria com IA

O projeto é do autor e feito com auxílio de IA. Commits produzidos com a IA terminam com:

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

Os prompts que originaram cada etapa ficam em [`docs/prompts/`](../prompts/README.md).
