# SPEC: CifraSync — produto inicial (MVP multiplataforma)

**Status:** Rascunho
**Data:** 2026-11-20
**Origem:** prompts [0001](../../prompts/0001-levantamento-e-contexto.md) e [0002](../../prompts/0002-repositorio-e-spec-inicial.md)

## Objetivo

Entregar a primeira versão utilizável do CifraSync. Com ela, o músico cadastra e formata cifras, monta repertórios, compartilha esses repertórios com a banda e toca no palco como teleprompter, **em Web, Android e Desktop (Windows e Linux)**. Tudo funciona **offline** e sincroniza nos dois sentidos entre os dispositivos, **sem custo de infraestrutura**.

## Contexto técnico

- **Repositório:** `D:\GithubProjects\CifraSync`, que será publicado no GitHub do autor. Hoje só tem documentação, sem código.
- **Plataformas obrigatórias:** site (navegador), app **Android** instalável, software **Desktop** instalável para **Windows** e **Linux**.
- **Hospedagem:** **Vercel** em plano gratuito, usando um **banco de dados oferecido pela própria Vercel** (integração de Storage/Marketplace).
- **Distribuição dos executáveis:** gratuita. Não depende de loja paga.
- **Referências de comportamento:** [`docs/contexto/`](../../contexto/), com visão, requisitos `RF/RNF`, domínio musical, sincronização e modo palco. As tecnologias citadas nesses documentos são preliminares; a stack será definida no PLAN.md desta feature.

## Comportamento esperado

### 1. Conta

- Quando o usuário se cadastra com e-mail, senha e **nome de usuário único**, o sistema cria a conta. Ela passa a valer em todas as plataformas.
- Quando o usuário faz login num dispositivo novo, o sistema baixa todo o conteúdo dele: músicas, repertórios, grupos e configurações.
- Se a sessão expirar enquanto o dispositivo estiver offline, o app continua funcionando com os dados locais e só pede login novo para sincronizar.

### 2. Músicas e cifras

- Quando o usuário **cola uma cifra** no formato "cifra em cima, letra embaixo", o sistema reconhece as linhas de cifra, de letra, de tablatura e os cabeçalhos de seção. Em seguida, mostra o resultado formatado e colorido e destaca os acordes que não conseguiu interpretar.
- Palavras comuns que parecem acordes ("A casa", "E agora") **não** são tratadas como cifra quando a linha é predominantemente letra.
- Quando o usuário seleciona linhas e escolhe **Refrão 1, 2 ou 3**, **2ª voz**, **Tablatura/Solo** ou **Anotação**, o trecho recebe o destaque correspondente. A 2ª voz também pode ser marcada num trecho dentro de uma linha.
- Anotações pessoais podem ser ocultadas no palco.
- Quando o usuário **transpõe** (± semitom ou escolhendo o tom de destino):
  - todos os acordes mudam, inclusive o baixo de acordes com barra;
  - os acordes continuam alinhados às mesmas sílabas;
  - a grafia (♯ ou ♭) segue o tom de destino;
  - **tablaturas não são transpostas**.
- Quando a música tem **capotraste**, a tela mostra a casa do capo e permite alternar entre "formas com capo" e "como soa".
- O sistema reconhece a notação brasileira (`7M`, `m7(b5)`, `°`, `4` = sus4, `(9)`) e a internacional (`maj7`, `m7b5`, `dim`, `sus4`, `add9`).
- O **dicionário de acordes** mostra várias posições de cada acorde para **violão/guitarra (E A D G B E)**, **cavaco/banjo (D G B D)** e **ukulele (G C E A)**, em modo **destro ou canhoto**. O usuário pode fixar a posição preferida de um acorde.
- A biblioteca permite buscar por título, artista, tom, estilo e trecho da letra, inclusive offline.

### 3. Repertórios

- O usuário cria um repertório com nome, data/evento e observação. Pode adicionar, remover e reordenar músicas por arrastar.
- Cada item do repertório pode ter um **tom próprio**, diferente do tom salvo na música.
- O repertório aceita separadores ("momentos": Intervalo, Bis...).
- Apagar um repertório **não** apaga as músicas.

### 4. Grupos (bandas)

- O usuário cria um grupo e se torna **dono** dele.
- O dono convida membros **pesquisando pelo nome de usuário**: a busca é por prefixo, a partir de 3 caracteres, e mostra só o nome de usuário e o nome de exibição.
- Quando um repertório é compartilhado com o grupo, **todos os membros recebem o repertório e as músicas dele**, sincronizados e sem cópia. A partir daí, esse conteúdo também fica disponível offline para cada membro.
- Permissões:

  | Ação | Quem pode |
  |---|---|
  | Gerenciar membros e papéis | Só o **dono** do grupo |
  | Editar o repertório (itens, ordem, tons) | O criador do repertório e os membros com papel de **editor** |
  | Editar uma música | Só o **dono da música**. Os demais membros podem copiá-la para a própria biblioteca e editar a cópia |
  | Remover um repertório do grupo | Quem o adicionou ou o dono do grupo |

- Quando um membro sai ou é removido do grupo, o conteúdo recebido só por meio do grupo desaparece dos dispositivos dele na próxima sincronização.
- Todas as permissões são verificadas **no servidor**. Um cliente modificado não consegue ler nem alterar o que não deve.

### 5. Offline e sincronização

- Toda leitura e gravação acontece primeiro no dispositivo. Criar, editar e excluir funcionam **sem internet**.
- A sincronização é **bidirecional** entre Web, Android e Desktop. Ela acontece sozinha:
  - ao abrir o app;
  - ao recuperar a conexão;
  - logo após uma edição;
  - periodicamente com o app aberto.
- Também há o botão "Sincronizar agora".
- Um indicador mostra o estado da sincronização: sincronizado, sincronizando, N alterações pendentes ou erro.
- Quando a mesma música é editada em dois dispositivos offline, **nenhuma versão se perde**. Uma prevalece e a outra vira uma **cópia de conflito** identificada.
- Exclusões se propagam para todos os dispositivos.
- Alterações de um repertório de grupo chegam aos outros membros em **até 60 s** quando eles estão online com o app aberto.

### 6. Modo palco

- O usuário abre uma música ou um repertório inteiro em **tela cheia**. A tela fica **sempre ligada** enquanto o modo palco estiver aberto.
- **Paginação por toque:**
  - metade direita da tela = próxima página; metade esquerda = página anterior;
  - os lados podem ser invertidos nas configurações;
  - na última página, o próximo toque vai para a próxima música do repertório;
  - o teclado também funciona: setas, PageUp/PageDown e espaço. Pedais que se apresentam como teclado funcionam pelas mesmas teclas.
- A paginação **nunca separa** uma linha de cifra da sua linha de letra, nem corta um bloco de tablatura.
- **Rolagem automática** por velocidade (ajustável) ou **calculada pela duração** da música, com atraso inicial opcional. Pode ser pausada, acelerada, desacelerada e invertida.
- **Modo híbrido:** com a rolagem automática ligada, o usuário pode arrastar ou rolar manualmente. A rolagem automática continua a partir da nova posição, sem voltar para onde estava.
- **Transposição ao vivo** no palco. Ao sair da música, o app pergunta se o novo tom deve ser salvo no repertório.
- **Coluna de acordes** opcional, com os diagramas dos acordes usados na música, já transpostos e com o capo aplicado, no instrumento e na orientação escolhidos.
- **Layout:** 1 coluna, 2 colunas ou automático (2 páginas lado a lado em paisagem quando houver largura suficiente).
- Se uma alteração de grupo chegar durante a execução, a música atual não muda. A alteração só é aplicada ao trocar de música.

### 7. Personalização de tela

- **Tipografia:** família da fonte, tamanho (com tamanhos nomeados para palco) e entrelinha.
- **Cores separadas** para fundo, letra, cifra, refrão 1/2/3, 2ª voz, tablatura e anotação.
- **Destaque do refrão:** marcador, fundo ou ambos.
- **Tema escuro e tema claro** da interface.
- **Opções de exibição:**
  - letra centralizada;
  - tudo em maiúsculas;
  - ocultar cifras;
  - mostrar ou ocultar a coluna de acordes.
- **Presets prontos**, como "Palco escuro" e "Alto contraste".
- As configurações acompanham a conta, e cada dispositivo pode sobrescrever as suas (por exemplo, fonte maior no celular).

### 8. Executáveis e publicação

- Cada versão publicada gera:
  - o **site** atualizado na Vercel;
  - um **instalador Windows**;
  - pacotes **Linux** (pelo menos um formato que rode em várias distribuições e um `.deb`);
  - um **APK Android** assinado.
- Os instaladores e o APK ficam disponíveis **gratuitamente** nas Releases do GitHub.
- O desktop se **atualiza sozinho** para a versão seguinte. O app Android avisa quando há versão nova.

## Critérios de aceitação (testáveis)

- [ ] Uma conta criada na Web faz login no Android e no Desktop e vê as mesmas músicas, repertórios e grupos.
- [ ] Ao colar uma cifra de 3 seções com uma tablatura, o editor classifica corretamente 100% das linhas de cifra, letra e tablatura de um conjunto de pelo menos 30 cifras de teste.
- [ ] A linha "E agora, A casa caiu" é classificada como letra, e a linha "E  A  Bm  F#m" como cifra.
- [ ] Transpor `G  D/F#  Em7  C7M(9)` em +2 semitons resulta em `A  E/G#  F#m7  D7M(9)`, com cada acorde na mesma coluna da sílaba original.
- [ ] Transpor para Fá maior usa bemóis (`Bb`, e não `A#`). Uma tablatura na mesma música permanece idêntica.
- [ ] Com capo na 2ª casa e tom A, a opção "formas com capo" mostra os acordes no tom de G.
- [ ] O dicionário mostra ao menos 3 posições de C, G, D, Am, Em, F, Bm, A7 e G7 em violão, cavaco e ukulele, e o modo canhoto exibe o espelho exato do destro.
- [ ] Linhas marcadas como Refrão 1, Refrão 2, Refrão 3, 2ª voz, Tablatura e Anotação aparecem no palco cada uma com a sua cor configurada.
- [ ] Com o dispositivo em **modo avião**, o usuário cria uma música, edita outra, monta um repertório e toca o repertório inteiro no palco. Ao reconectar, tudo aparece no outro dispositivo em até 60 s.
- [ ] A mesma música editada offline em dois dispositivos gera, após sincronizar ambos, uma versão vencedora e uma "cópia de conflito", sem perda de texto.
- [ ] O dono de um grupo encontra outro usuário digitando os 3 primeiros caracteres do nome de usuário e o adiciona. Um repertório compartilhado aparece para o novo membro com todas as músicas, inclusive offline.
- [ ] Um membro sem papel de editor não consegue alterar o repertório do grupo nem a música de outro usuário. Isso vale mesmo chamando a API diretamente, que responde com erro de permissão.
- [ ] Um membro removido do grupo deixa de ver o repertório do grupo após a próxima sincronização.
- [ ] No palco, um toque na metade direita avança uma página, um toque na metade esquerda volta uma página, e um toque na última página abre a próxima música do repertório.
- [ ] Nenhuma página do palco começa com uma linha de letra separada da sua linha de cifra.
- [ ] A rolagem automática por duração percorre a música inteira no tempo configurado (±5%). No modo híbrido, arrastar manualmente não desliga a rolagem automática.
- [ ] A tela não apaga durante 10 minutos de modo palco em Android, Windows e Linux.
- [ ] Trocar de página no palco leva menos de 100 ms num celular Android intermediário.
- [ ] Mudar o tamanho da fonte, as cores e o tema no celular afeta só aquele dispositivo quando a opção "só neste dispositivo" está marcada. Sem ela, a mudança aparece nos demais dispositivos.
- [ ] Uma versão publicada disponibiliza nas Releases do GitHub o instalador Windows, os pacotes Linux e o APK assinado. O Desktop instalado se atualiza para a versão seguinte sem reinstalação manual.
- [ ] A infraestrutura (Vercel, banco e GitHub) roda sem nenhuma cobrança em planos gratuitos.

## Restrições

- **Deve:**
  - ter custo zero de infraestrutura: Vercel em plano gratuito, banco de dados oferecido pela Vercel e GitHub;
  - ser offline-first;
  - ter **paridade de edição** entre Web, Android e Desktop;
  - versionar o repositório com **Conventional Commits** em português ([versionamento](../../processo/versionamento.md));
  - registrar os prompts em `docs/prompts/`;
  - declarar no README que o projeto foi feito com auxílio de IA;
  - verificar toda autorização no servidor;
  - armazenar senhas apenas com hash;
  - permitir exportar todos os dados do usuário.
- **Não deve:**
  - depender de serviço pago, loja paga ou certificado pago para funcionar ou ser distribuído;
  - exigir internet para abrir, editar ou tocar o conteúdo já presente no dispositivo;
  - reorganizar a tela do palco no meio de uma música por causa de uma sincronização;
  - perder texto de música em conflitos de edição.
- **Fora do escopo:**
  - comunidade: acervo público, busca e cópia de músicas de outros usuários fora dos grupos;
  - QR Codes, cardápio de pedidos e gorjetas;
  - suporte dedicado a pedais (além dos que funcionam como teclado);
  - afinador, playback de áudio e metrônomo;
  - planos pagos e pagamentos;
  - iOS e macOS nativos;
  - publicação em lojas;
  - login social;
  - recuperação de senha por e-mail;
  - idiomas além do português.

## Em aberto (para decidir no PLAN)

1. Convite de grupo com aceite (pendente → ativo) já no MVP ou entrada direta.
2. Região do banco de dados (Brasil, se o plano gratuito permitir, ou EUA).
3. Ambiente de desenvolvimento local do banco (instância de desenvolvimento na nuvem ou banco local em contêiner).

---
Responda **"aprovado"** para gerar o PLAN.md, ou peça ajustes.
