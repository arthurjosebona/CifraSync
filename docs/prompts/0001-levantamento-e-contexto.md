# 0001 — Levantamento e contexto

- **Data:** 2026-11-20
- **Etapa SDD:** IDEA (texto livre) + documentos de contexto
- **Feature:** [01-mvp](../specs/01-mvp/SPEC.md)

## Prompt

> Analise como o app [app de referência] funciona e crie alguns markdowns de contexto e um PLAN.md, citando com detalhes o funcionamento, como implementar isso versão mobile, web e desktop trabalhando em conjunto e com hospedamento de graça na vercel, utilizando um banco de lá. A ideia é fazer o planejamento de implementação de um clone. Algumas features muito especificas não precisam ser implementadas, como as de comunidade e de qr codes, pedais e etc. As features que devem ser implementadas são:
>
> ### 1. Gestão de Músicas e Cifras
>
> * **Cadastro e Edição com Formatação Automática:** Permite inserir novas letras e cifras com reconhecimento e formatação automática.
> * **Destaque Visual:** Possibilidade de diferenciar cores e estilos para a letra principal, cifras, refrão (com até 3 variações de destaque) e frases de 2ª voz.
> * **Ferramentas Musicais:**
> * Alteração rápida de tom (transposição).
> * Configuração de capotraste.
> * Inclusão de tablaturas, solos e anotações personalizadas na música.
> * Dicionário/visualização de diagramas de acordes para **violão/guitarra, cavaco/banjo e ukulele**, com opção de visualização para **destros ou canhotos**.
>
> ### 2. Organização de Repertórios (Setlists) e Comunidade
>
> * **Criação de Repertórios:** Montagem de listas de músicas personalizadas para shows, ensaios ou eventos específicos.
> * **Recurso "Grupos" (Bandas):** Compartilhamento sincronizado de repertórios inteiros entre os membros de uma mesma banda ou equipe, que pode ser feito através do nome de usuário de outra pessoa que utiliza o site.
>
> ### 3. Recurso de Palco (Teleprompter e Visualização)
>
> * **Modo Offline Completo:** Baixa as músicas, cifras e repertórios para o dispositivo local, permitindo tocar em locais sem internet.
> * **Sincronização Multiplataforma:** O músico organiza e edita no site (Web) e sincroniza os dados com o aplicativo (Android) e o software desktop (Windows e Linux). E vice-versa, deve ser possível criar pelo celular e pelo desktop também para facilitar.
> * **Personalização de Tela:** Ajuste de tamanho de fonte, cores de fundo, tema escuro (dark mode) e layout do painel de exibição.
> * **Controle de Rolagem e Paginação:**
> * Paginação por toque na tela.
> * Rolagem automática de texto e modo híbrido (rolagem manual + automática juntas).
>
> Faça o arquivo de planejamento com arquitetura, como será implementado para possuir custo zero, qual será o executável para android e desktop, banco de dados utilizado na vercel, o que será feito automaticamente pelo claude e o que precisa de ajuda humana para integrar, e também inclua nesse arquivo que o projeto será um repositório no github e deve ser versionado seguindo commits semanticos pois será um projeto do meu github que foi feito com auxílio da IA.

## Resultado

Documentos de contexto que viraram [`docs/contexto/`](../contexto/) (requisitos, domínio musical, sincronização/offline, modo palco). O PLAN.md gerado nessa etapa foi **descartado** no repositório porque veio antes da SPEC; o fluxo foi reiniciado pela SPEC (prompt [0002](0002-repositorio-e-spec-inicial.md)).
