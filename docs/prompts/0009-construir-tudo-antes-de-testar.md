# 0009 — Construir a aplicação completa antes dos testes

- **Data:** 2026-11-20
- **Etapa SDD:** Implementação
- **Feature:** [01-mvp](../specs/01-mvp/SPEC.md)

## Prompt

> Pode construir a aplicação completa primeiro, depois do deploy irei testar tudo. Já fiz o que foi pedido

## Resultado

- Release 0.2.0 mergeada pelo autor; tag `v0.2.0` criada e back-merge para a `develop` por PR (rulesets ativos).
- **Mudança de ordem combinada com o autor:** as tarefas de teste em uso real — T33 (SPA local), T44 (palco em ensaio), T62 (grupo com outra pessoa), T68 (Windows/Linux), T73 (Android) — e as releases intermediárias (T34, T45, T56, T63, T69, T74) ficam para depois do deploy. O código segue fase a fase até a T81.
- As tarefas que exigem contas e credenciais do autor (T46 Vercel/Neon, T55 secret do banco, T66 chave do updater, T71 keystore) têm a parte de código feita pelo Claude e o passo humano listado no fim.
