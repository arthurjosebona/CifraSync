---
name: sdd
description: >
  Spec-Driven Development (SDD) leve, orientado a agentes de IA. Use quando o usuário quiser
  iniciar uma feature, módulo ou entrega de software não-trivial com uma spec curta antes do
  código. Gatilhos: "quero criar", "preciso implementar", "nova funcionalidade", "/sdd", ou
  pedido para criar SPEC.md / PLAN.md / TASKS.md, ou quando o usuário descrever uma ideia em
  texto livre pedindo para virar spec. Fluxo enxuto: IDEA (texto livre do usuário) → SPEC → PLAN
  → TASKS → implementação, com aprovação humana entre cada etapa. TESTS.md e ROLLBACK.md são
  opcionais e só gerados quando pedidos explicitamente.
---

# SDD — Spec-Driven Development (versão enxuta)

```
IDEA (texto livre)  →  SPEC.md  →  PLAN.md  →  TASKS.md  →  Implementação
        ↑                 ↑           ↑            ↑
    (você escreve)     (gate)      (gate)       (compila)

                    TESTS.md / ROLLBACK.md → opcionais, só sob pedido
```

Para mudanças triviais — que não mudam contrato entre camadas (PLC ↔ service ↔ DB ↔ frontend)
e não introduzem novo estado compartilhado (locks, filas, threads) — pule o fluxo e implemente
direto.

## Como usar

1. **Detecte a fase:** usuário manda um texto descrevendo uma ideia (sem SPEC ainda) → gere SPEC.md. Com SPEC aprovada → gere PLAN.md. Com PLAN aprovado → gere TASKS.md. Com TASKS aprovado → implemente. TESTS.md e ROLLBACK.md só quando pedidos explicitamente (a qualquer momento do fluxo).
2. **A IDEA é só um parágrafo do usuário.** Não existe template para a IDEA — o usuário escreve como se fosse um prompt normal, em texto corrido, sem precisar seguir tópicos. Cabe à IA extrair objetivo, contexto técnico, comportamento esperado e restrições desse texto.
3. **Se faltar algo essencial para gerar a SPEC**, pergunte no máximo 3 coisas — só o que realmente travar o entendimento. Não peça o que já pode ser inferido do projeto/conversa.
4. **Nunca escreva código na SPEC, PLAN ou TASKS.** São documentos.
5. **Mantenha curto.** Se uma seção do template não se aplica, apague-a — não deixe "N/A".
6. **Economize tokens por padrão:** não gere TESTS.md nem ROLLBACK.md a menos que o usuário peça. Se pedir só um dos dois, gere só esse.

## Etapa 1 — IDEA (texto livre)

O usuário descreve a feature em texto corrido, do jeito que quiser — não há template nem tópicos obrigatórios. Exemplo do tipo de mensagem que conta como IDEA:

> "preciso de um alarme quando o PLC da expedição ficar mais de 30s sem responder, isso já existe meio que meio pronto no EstoqueComm, mas não pode travar a thread principal de leitura"

A partir desse texto (e do que mais já foi dito na conversa), a IA gera a SPEC.md diretamente — sem devolver formulário para o usuário preencher.

## Etapa 2 — Gerar SPEC.md

Leia `templates/SPEC.md`. Preencha com base no texto da IDEA + contexto da conversa/projeto. Critérios de aceitação devem ser testáveis, não "deve funcionar bem". Se a feature toca multi-threading (locks, filas, PLC polling), descreva explicitamente o que não pode bloquear/quebrar. Termine sempre pedindo aprovação (já incluso no template).

## Etapa 3 — Gerar PLAN.md

Gatilho: usuário aprova a SPEC. Releia a SPEC. Siga `templates/PLAN.md`. Este é o meio-termo entre "o quê" (SPEC) e "passo a passo" (TASKS): define abordagem técnica, componentes/camadas afetados, mudanças de dados/API e riscos — ainda sem quebrar em tasks. Termine pedindo aprovação.

## Etapa 4 — Gerar TASKS.md

Gatilho: usuário aprova o PLAN. Releia o PLAN. Siga `templates/TASKS.md`. Cada task = 1–3h de trabalho, com "Fazer" + "Verificar" objetivos — o "Verificar" aqui é só compilação/build (ex: `mvn compile`, `npm run build`), não teste funcional. Não crie fases/numeração elaborada — só T1, T2, T3... em ordem, marcando dependência quando houver. Termine pedindo aprovação.

## Etapa 5 — Implementação

Gatilho: usuário aprova o TASKS. Uma task por vez: mostre o código, rode/confirme a compilação, marque `[x]` e siga para a próxima só após confirmação. Não rode nem proponha testes funcionais nesta etapa. Se aparecer algo fora do PLAN, pare e avise antes de continuar.

## TESTS.md e ROLLBACK.md (opcionais)

Não gere por padrão — só quando o usuário pedir explicitamente, em qualquer momento do fluxo (mesmo depois de implementar).

- **TESTS.md** (`templates/TESTS.md`): como a IA verifica que a implementação funciona de verdade — testes manuais, automatizados (se aplicável), casos de borda e como detectar regressão.
- **ROLLBACK.md** (`templates/ROLLBACK.md`): como reverter a mudança — passos de reversão, dados/estado que precisam de atenção, e como confirmar que a reversão funcionou.

Se o usuário pedir só um dos dois, gere apenas esse.

## Estrutura de arquivos sugerida

```
docs/specs/NN-nome-da-feature/
├── SPEC.md
├── PLAN.md
├── TASKS.md
├── TESTS.md       (opcional, só se pedido)
└── ROLLBACK.md    (opcional, só se pedido)
```

Sugira essa estrutura só se o usuário quiser persistir os documentos; senão pode ficar só no chat.
