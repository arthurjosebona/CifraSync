# Ajustes do MVP até a v1.0

Correções e pequenos ajustes pedidos pelo autor depois de testar o app. Até a v1.0 eles entram como adendo do MVP: não ganham SPEC, PLAN e TASKS próprios; aqui fica registrado só o que mudou e por quê.

## 0.5.0 — primeira rodada de testes

### Correções

- **Botões de Ajustes e de Acordes "não clicáveis".** A configuração era salva, mas a tela não atualizava. A consulta reativa (`getSettingsRows`) fazia várias leituras encadeadas com `await`, e depois delas o Dexie deixava de observar a tabela. Agora todas as leituras começam juntas (`Promise.all`), e `peekCurrentUserId` faz uma leitura só. Teste de regressão em `packages/sync/src/repo.test.ts`.
- **Duas alterações seguidas se sobrescreviam.** `updateSettings` mesclava com uma cópia da tela. Agora leitura, mesclagem e gravação acontecem na mesma transação (`saveSettings` aceita uma função).
- **Erro "Cannot read properties of undefined (reading 'kind')" no palco do repertório.** Ao trocar de música, a divisão de páginas da música anterior era aplicada às linhas da nova. Agora a divisão fica presa às linhas para as quais foi calculada.
- **Tom detectado errado em trechos com a dominante** (ex.: E e B7 viravam "B"). Acorde de sétima dominante passa a reforçar o tom uma quarta acima e não conta como tônica.
- **Tom em F# com acordes escritos em bemol** (Gb, Db7). A grafia agora segue o nome do tom.
- **Formatação da cifra colada:**
  - a linha "Tom: E" é removida e preenche o campo Tom;
  - "[Intro] E B7 E" é aceito sem aviso de acorde desconhecido;
  - a caixinha curta de tablatura ("E|---|" com "(4x)") é agrupada inteira em `{tab}`.
- **Nome de usuário com hífen.** O cadastro aceitava, mas o servidor recusava. Agora a tela também não aceita.

### Ajustes de uso

- **Palco:**
  - o menu abre só ao **segurar o dedo 3 segundos** na tela, com uma barra de progresso enquanto segura;
  - o menu tem fundo opaco e botões grandes, e traz só o tom (−/+);
  - depois de mudar o tom, dá para escolher **"Só agora"** (vale até fechar o palco ou o repertório) ou **"Salvar na música"**;
  - saíram a barra de controles, a troca de modo, a tela cheia, a gaveta do repertório e os diagramas de acordes. O modo de navegação vem dos Ajustes; velocidade e tom continuam no teclado/pedal.
- **Listas:** tocar numa música ou num repertório abre direto no palco. O botão **⋮** ao lado abre os detalhes (editar, setlist, exportar etc.).
- **Acordes:** os diagramas ficam só na aba Acordes, como dicionário (a estrela marca a posição favorita). Saíram da tela da música, do palco e dos Ajustes ("Coluna de acordes", instrumento e mão).
- **Editor:** botão **Introdução**, que insere o título `[Introdução]` acima da linha do cursor.

## 0.6.0 — palco, letra e grupos

- **Tamanho da letra:** vai até o "Ao vivo 3" (34 px), nos botões e no tamanho livre. Os botões "Palco 1" e "Palco 2" saíram. Quem tinha salvo um tamanho maior passa a usar 34 px.
- **Preset "Palco escuro":** o refrão fica em ciano (`#00ffff`, o mesmo do "Alto contraste"). O padrão do app também.
- **Repertórios:** a lista principal mostra só os repertórios da própria pessoa. A nova seção **Grupos** mostra, por grupo, os repertórios compartilhados, incluindo os seus (marcados "seu").
- **Palco:**
  - saíram os avisos "Última página" e "Fim do repertório";
  - abre sempre em tela cheia e sai dela ao fechar. No Android, um plugin nativo (`ImmersivePlugin`) esconde também a barra de navegação. No navegador, se a tela cheia for recusada ao abrir, ela é pedida de novo no primeiro toque;
  - margem em cima e embaixo da cifra, para nada encostar na borda nem cortar.
- **Grupos (correção):** as consultas de grupos tinham as mesmas leituras encadeadas que travavam os Ajustes (a tela podia não atualizar). Agora leem tudo de uma vez.
