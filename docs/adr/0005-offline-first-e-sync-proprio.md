# 0005 — Offline-first com IndexedDB e protocolo de sync próprio

**Status:** Aceita
**Data:** 2026-11-20
**Origem:** [specs/01-mvp/PLAN.md](../specs/01-mvp/PLAN.md)

## Contexto

O app precisa abrir, editar e tocar sem internet. Também precisa sincronizar nos dois sentidos entre Web, Android e Desktop, inclusive o conteúdo de grupos, sem perder texto quando houver conflito.

## Decisão

- **Banco local:** **IndexedDB via Dexie** em todas as plataformas. A UI lê e grava só no banco local.
- **Fila de mutações:** cada mutação entra na fila na mesma transação que grava o dado.
- **Envio (push):** `/api/sync/push` aplica as mutações:
  - em transação única;
  - com controle de concorrência por `version`;
  - de forma idempotente, pelo id de cada mutação;
  - resolvendo conflitos campo a campo com LWW (last-write-wins);
  - criando uma **cópia de conflito** quando duas edições da mesma letra colidem.
- **Recebimento (pull):** `/api/sync/pull` usa um **cursor por escopo**: um para os dados do próprio usuário e um para cada grupo. O cursor se baseia numa sequência global `seq`, atribuída por trigger.
- **Exclusões:** propagadas por tombstone.
- **Frequência:** polling a cada 60 s com o app em primeiro plano e a cada 15 s nas telas de grupo. Não há WebSocket.

Detalhes em [contexto/sincronizacao-offline.md](../contexto/sincronizacao-offline.md).

## Consequências

- O app funciona offline por construção, não como um "modo" à parte.
- O protocolo é código nosso e precisa de testes de integração com dois dispositivos.
- Mudanças feitas por outros membros do grupo podem levar até 60 s para aparecer, o que está dentro do critério da SPEC.

## Alternativas consideradas

- **PowerSync / ElectricSQL:** mais um serviço para manter dentro de cotas gratuitas.
- **SQLite nativo:** exigiria três implementações de armazenamento, uma por plataforma.
- **WebSocket:** Vercel Functions não mantêm conexões longas.
