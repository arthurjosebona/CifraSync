# ROLLBACK: [Nome da feature]

Como reverter esta mudança caso algo dê errado.

## Passos para reverter
1. [ex: `git revert <commit>` ou `git checkout <branch> -- arquivo`]
2. [ex: reverter migração de banco: script/comando de down]
3. [ex: reiniciar serviço/container afetado]

## Dados/estado que precisam de atenção
- [ex: coluna nova no banco — apagar ou manter? tem dado já gravado?]
- [ex: fila/estado em memória que precisa ser resetado]

## Como confirmar que a reversão funcionou
- [passo/observação rápida — ex: endpoint volta a responder como antes, log sem erro novo]

## Impacto de não reverter a tempo (se relevante)
- [ex: pedidos ficam presos na fila, PLC para de responder]
