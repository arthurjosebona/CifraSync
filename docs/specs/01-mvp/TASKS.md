# TASKS: CifraSync — produto inicial (MVP multiplataforma)

**Status:** Rascunho
Baseado no [PLAN.md](PLAN.md) aprovado. Todo o MVP é feito direto na `main` (sem git flow até a `v1.0.0`).

**Legenda**
- **[H]** marca uma tarefa que precisa do autor (conta, credencial, aparelho ou decisão). As demais o Claude executa sozinho.
- **Verificar:** só compilação, build ou testes unitários do próprio pacote, como diz o fluxo SDD.
- **Commits:** cada tarefa vira pelo menos um commit semântico.
- **Release:** ao fim de cada bloco, a tarefa de release gera a tag com `commit-and-tag-version`.

---

## Fase 0 — Fundação → `v0.1.0`

### [ ] T1: Publicar o repositório no GitHub [H]
**Fazer:** o autor cria o repositório público vazio `CifraSync` no GitHub. Depois, o Claude adiciona o remoto `origin` e faz o push da `main`.
**Verificar:** `git ls-remote origin` lista `refs/heads/main`.

### [ ] T2: Esqueleto do monorepo
**Fazer:** `package.json` raiz com `engines`/`packageManager`, `pnpm-workspace.yaml`, `turbo.json` (tarefas build, typecheck, lint, test), `tsconfig.base.json` strict, `.nvmrc`, `.editorconfig`. Pastas vazias com `package.json` para `packages/core`, `packages/shared`, `packages/sync`, `apps/web`.
**Verificar:** `pnpm install && pnpm turbo run typecheck` termina sem erro.
**Depende de:** T1

### [ ] T3: Lint, formatação e testes
**Fazer:** ESLint (flat config, TS + React + hooks), Prettier, Vitest configurado por workspace. Scripts `lint`, `format`, `test` na raiz.
**Verificar:** `pnpm lint && pnpm test` passam (com um teste placeholder no `core`).
**Depende de:** T2

### [ ] T4: Hooks de commit
**Fazer:** Husky + commitlint (`@commitlint/config-conventional`, com os escopos de `versionamento.md`) no `commit-msg`, e lint-staged no `pre-commit`.
**Verificar:** um commit com a mensagem "teste" é rejeitado, e `chore: teste` é aceito (o teste é desfeito em seguida).
**Depende de:** T3

### [ ] T5: Geração de versão
**Fazer:** `commit-and-tag-version` com `.versionrc` (seções do CHANGELOG em português e arquivos de versão extras: por enquanto só os `package.json`). Script `pnpm release`.
**Verificar:** `pnpm release --dry-run` mostra a próxima versão e o CHANGELOG sem alterar arquivos.
**Depende de:** T4

### [ ] T6: Workflow de CI
**Fazer:** `.github/workflows/ci.yml` (Node + pnpm com cache, `lint`, `typecheck`, `test`, `build`), disparado em push de `main`, `develop`, `feature/*`, `release/*`, `hotfix/*` e em PRs. Job de commitlint para o título de PR.
**Verificar:** `actionlint` sem erros; primeira execução verde no GitHub após o push.
**Depende de:** T3

### [ ] T7: ADRs das decisões do PLAN
**Fazer:** ADRs 0001 a 0008 em `docs/adr/`:
- 0001 SPA única para todas as plataformas;
- 0002 Tauri 2 no desktop;
- 0003 Capacitor no Android;
- 0004 Neon Postgres na Vercel com Hono;
- 0005 offline-first com IndexedDB e sync próprio;
- 0006 Better Auth;
- 0007 versionamento (`commit-and-tag-version`; MVP na `main`, git flow depois);
- 0008 decisões dos pontos em aberto da SPEC.

Atualizar `docs/adr/README.md`.
**Verificar:** os links do índice de ADRs abrem os arquivos (checagem com `markdown-link-check` ou revisão manual).

### [ ] T8: Release v0.1.0
**Fazer:** `pnpm release` na `main` → `v0.1.0`; push da tag.
**Verificar:** a tag `v0.1.0` existe no remoto e o `CHANGELOG.md` foi criado.
**Depende de:** T5, T6, T7

## Fase 1 — Motor musical (`packages/core`) → `v0.2.0`

### [ ] T9: Modelo de notas e intervalos
**Fazer:** tipos de nota (12 classes de altura, grafias com ♯/♭), conversões, cálculo de intervalo e tabela de tons que usam bemóis.
**Verificar:** `pnpm --filter @cifrasync/core test`.
**Depende de:** T3

### [ ] T10: Parser de acordes
**Fazer:** `parseChord` com a notação BR e a internacional (qualidades, extensões, alterações com e sem parênteses, baixo com barra) e `formatChord` nos estilos `br`/`intl`. Testes com ≥ 80 grafias.
**Verificar:** `pnpm --filter @cifrasync/core test`.
**Depende de:** T9

### [ ] T11: Transposição de acordes
**Fazer:** `transposeChord` com grafia pelo tom de destino e override manual de ♯/♭; transpõe fundamental e baixo.
**Verificar:** `pnpm --filter @cifrasync/core test`.
**Depende de:** T10

### [ ] T12: AST da música e parser
**Fazer:**
- tipos `SongDoc`, `Block`, `Line`, `ChordAt` e `Segment`;
- `parseSong` (linhas de cifra/letra/par, cabeçalhos, marcações `{refrao:N}`, `{voz2}`, `((…))`, `{tab}`, `{nota}`, `#`);
- `serializeSong`, garantindo ida e volta sem perda.

**Verificar:** `pnpm --filter @cifrasync/core test`.
**Depende de:** T10

### [ ] T13: Formatação automática
**Fazer:** `autoFormat`:
- normalização (tabs, NBSP, CRLF, espaços);
- classificação de linhas por pontuação, incluindo o caso da palavra que parece acorde;
- detecção de tablatura e de cabeçalhos;
- relatório com os tokens não reconhecidos;
- sugestão de refrão.

**Verificar:** `pnpm --filter @cifrasync/core test`.
**Depende de:** T12

### [ ] T14: Cifras de teste
**Fazer:** ≥ 30 cifras autorais ou de domínio público em `packages/core/fixtures/`, com o resultado esperado de classificação de cada uma. Testes de regressão usando essas fixtures.
**Verificar:** `pnpm --filter @cifrasync/core test`.
**Depende de:** T13

### [ ] T15: Transposição do documento
**Fazer:** `transposeDoc` com realinhamento de colunas (empurrar em caso de colisão) e tablaturas intactas.
**Verificar:** `pnpm --filter @cifrasync/core test`.
**Depende de:** T11, T12

### [ ] T16: Capotraste e detecção de tom
**Fazer:** `applyCapo` (modos `shapes`/`sounding`) e `detectKey` (histograma de acordes diatônicos + primeiro e último acorde).
**Verificar:** `pnpm --filter @cifrasync/core test`.
**Depende de:** T15

### [ ] T17: Instrumentos e dataset de acordes
**Fazer:** definição de instrumentos e afinações (violão, cavaco/banjo, ukulele). Script de build que converte o dataset MIT de violão e ukulele num JSON compacto em `packages/core/data/`, com o aviso de licença.
**Verificar:** `pnpm --filter @cifrasync/core build`.
**Depende de:** T10

### [ ] T18: Gerador de posições
**Fazer:** `generateVoicings` (busca em janelas de 4 casas, restrições de notas obrigatórias e de baixo, máx. 4 dedos com pestana, pontuação) e `getVoicings`, que junta o dataset com o gerador e remove duplicadas.
**Verificar:** `pnpm --filter @cifrasync/core test` (≥ 3 posições para os 9 acordes do critério da SPEC nos 3 instrumentos).
**Depende de:** T17

### [ ] T19: Conversão ChordPro
**Fazer:** `toChordPro` e `fromChordPro` mapeando refrão, tab e comentários.
**Verificar:** `pnpm --filter @cifrasync/core test`.
**Depende de:** T12

### [ ] T20: Revisão das posições de cavaco e ukulele [H]
**Fazer:** o Claude gera uma página estática com os diagramas das 15 posições mais comuns de cavaco e ukulele. O autor marca as que não fazem sentido, e o Claude ajusta a pontuação ou cria exceções.
**Verificar:** `pnpm --filter @cifrasync/core test` depois dos ajustes.
**Depende de:** T18, T24

### [ ] T21: Release v0.2.0
**Fazer:** `pnpm release` → `v0.2.0`.
**Verificar:** tag no remoto; CI verde.
**Depende de:** T9–T20

## Fase 2 — SPA local (sem servidor) → `v0.3.0`

### [ ] T22: Base da SPA
**Fazer:** `apps/web` com Vite + React + TS, React Router (rotas vazias: biblioteca, música, editor, repertórios, grupos, palco, dicionário, configurações, login), Tailwind, tema claro/escuro e layout responsivo com navegação inferior no celular e lateral no desktop.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T2

### [ ] T23: Schemas compartilhados
**Fazer:** `packages/shared` com os schemas Zod de todas as entidades, colunas de sync, papéis, limites e configurações de tela com os valores padrão.
**Verificar:** `pnpm --filter @cifrasync/shared build`.
**Depende de:** T2

### [ ] T24: Componente de diagrama de acorde
**Fazer:** `ChordDiagram` em SVG próprio (n cordas, casa inicial, pestana, X/O, modo canhoto espelhado, tamanhos).
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T18, T22

### [ ] T25: Banco local
**Fazer:** `packages/sync` com o schema Dexie (tabelas espelho, fila, meta, índice de busca), repositórios de leitura/escrita que gravam o registro e a mutação na mesma transação, `deviceId` e UUID v7.
**Verificar:** `pnpm --filter @cifrasync/sync test` (fake-indexeddb).
**Depende de:** T23

### [ ] T26: Biblioteca de músicas
**Fazer:** lista com `useLiveQuery`; busca por título, artista, tom, estilo e trecho da letra (sem acento); ordenação; ação "nova música".
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T22, T25

### [ ] T27: Visualização da música
**Fazer:** `SongView`, que renderiza o AST (acordes posicionados sobre a sílaba e cores de cada marcação), com controles de transposição, capo (formas/como soa) e grafia ♯/♭.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T16, T26

### [ ] T28: Editor de cifra
**Fazer:** CodeMirror 6 com destaque próprio, formatação automática ao colar e pelo botão *Formatar*, relatório de detecção, botões Refrão 1/2/3, 2ª voz (linha e trecho), Tab/Solo e Nota, campos de metadados e preview lado a lado (desktop) ou em abas (celular).
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T13, T27

### [ ] T29: Dicionário e preferência de posição
**Fazer:** tela Dicionário (instrumento, fundamental, tipo, todas as posições) e escolha da posição preferida por acorde, global ou por música, salva em `chord_prefs`.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T24, T25

### [ ] T30: Repertórios
**Fazer:**
- lista e CRUD de repertórios;
- adicionar músicas pela busca;
- reordenar arrastando, com índice fracionário;
- tom por item e momentos;
- duplicar repertório e copiar a lista como texto.

**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T26

### [ ] T31: PWA offline
**Fazer:** vite-plugin-pwa (precache da SPA, manifest, ícones provisórios), `navigator.storage.persist()` e aviso de nova versão.
**Verificar:** `pnpm --filter @cifrasync/web build` gera o service worker.
**Depende de:** T22

### [ ] T32: Teste de uso real da SPA local [H]
**Fazer:** o autor usa a SPA local (`pnpm dev`) com músicas reais por alguns dias e lista os atritos. O Claude corrige o que estiver dentro do PLAN e avisa o que estiver fora dele.
**Verificar:** `pnpm --filter @cifrasync/web build` depois das correções.
**Depende de:** T26–T31

### [ ] T33: Release v0.3.0
**Fazer:** `pnpm release` → `v0.3.0`.
**Verificar:** tag no remoto; CI verde.
**Depende de:** T22–T32

## Fase 3 — Modo palco → `v0.4.0`

### [ ] T34: Camada de plataforma (web)
**Fazer:** interface `Platform` e implementação web (Wake Lock, Fullscreen, armazenamento do token, salvar/abrir arquivo, verificar atualização), com detecção da plataforma em tempo de execução.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T22

### [ ] T35: Motor de paginação
**Fazer:** medição de unidades indivisíveis, distribuição em páginas, colunas 1/2/auto, recálculo com `ResizeObserver`, memoização por música/tom/capo/configuração.
**Verificar:** `pnpm --filter @cifrasync/web build` e testes unitários da distribuição.
**Depende de:** T27

### [ ] T36: Tela do palco e paginação por toque
**Fazer:**
- `StageView` em tela cheia, com cabeçalho mínimo;
- zonas de toque (direita/esquerda, invertíveis);
- terço central abre os controles, com bloqueio de toque duplo;
- teclado (setas, PageUp/PageDown, espaço, `+`/`-`, `0`, `[`/`]`, `P`, `Esc`);
- transições;
- tela sempre ligada.

**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T34, T35

### [ ] T37: Execução de repertório
**Fazer:**
- próxima e anterior música, gaveta com a lista e os momentos;
- avisos de última página e de fim do repertório;
- pré-cálculo da próxima música;
- adição provisória de música;
- transposição ao vivo, com a pergunta "salvar no repertório" ao sair da música;
- congelamento da música atual quando o sync alterar dados.

**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T30, T36

### [ ] T38: Rolagem automática
**Fazer:** loop com `requestAnimationFrame` e acumulador; velocidade fixa ou calculada pela duração; atraso inicial; play/pause, ±velocidade, inverter, salto; velocidade salva por música.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T36

### [ ] T39: Modo híbrido
**Fazer:** pausar a escrita da rolagem durante interação manual (pointer, wheel, touch) e retomar da nova posição, com atraso de retomada configurável; toques laterais = meia tela.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T38

### [ ] T40: Coluna de acordes e faixa de referência
**Fazer:** coluna lateral com os acordes usados (transpostos e com capo aplicado), troca de posição ao tocar no diagrama, recolhível no retrato; faixa de referência opcional.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T24, T36

### [ ] T41: Configurações de tela
**Fazer:**
- tela de configurações com pré-visualização ao vivo;
- tipografia, cores por elemento e estilo do refrão;
- colunas, opções de exibição e instrumento/canhoto;
- navegação padrão e presets;
- configuração global × "só neste dispositivo", salva em `user_settings`.

**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T25, T36

### [ ] T42: Testes e2e do palco
**Fazer:** Playwright (Chromium e WebKit) cobrindo:
- paginação por toque;
- a página nunca começar com uma letra separada da sua cifra;
- passagem para a próxima música;
- transposição no palco;
- o modo híbrido não desligar a rolagem.

Incluir no CI.
**Verificar:** `pnpm --filter @cifrasync/web e2e` compila e roda localmente.
**Depende de:** T37–T41

### [ ] T43: Teste do palco em ensaio [H]
**Fazer:** o autor usa o palco pela PWA num celular e num notebook durante um ensaio e relata legibilidade, toques acidentais, velocidade de rolagem e troca de página (< 100 ms). O Claude ajusta.
**Verificar:** `pnpm --filter @cifrasync/web build` depois dos ajustes.
**Depende de:** T42

### [ ] T44: Release v0.4.0
**Fazer:** `pnpm release` → `v0.4.0`.
**Verificar:** tag no remoto; CI verde.
**Depende de:** T34–T43

## Fase 4 — Servidor, contas e sync → `v0.5.0`

### [ ] T45: Infraestrutura na Vercel e no Neon [H]
**Fazer:**
- O autor cria a conta na Vercel e importa o repositório (diretório raiz `apps/web`).
- O autor cria o banco **Neon** em *Storage* (região São Paulo, se houver; senão `us-east-1`) e o branch `dev`.
- O autor cadastra `BETTER_AUTH_SECRET` (o Claude fornece o comando para gerar) e define a região das funções.
- O Claude escreve `vercel.json` e `.env.example`.

**Verificar:** o deploy de produção da SPA abre em `*.vercel.app`.
**Depende de:** T33

### [ ] T46: Schema do servidor e migrations
**Fazer:** schema Drizzle (tabelas do domínio, colunas de sync, sequência global e trigger de `seq`, índices, `applied_mutations`), migrations SQL versionadas, seed de desenvolvimento com usuários e dados de teste.
**Verificar:** `pnpm --filter @cifrasync/web db:generate` gera o SQL sem diferença pendente; `tsc` sem erro.
**Depende de:** T23

### [ ] T47: API base e autenticação
**Fazer:**
- entrada `api/[[...route]].ts` com app Hono;
- Better Auth (e-mail/senha, plugins `username` e `bearer`, sessão de 60 dias);
- CORS restrito às origens do Tauri e do Capacitor;
- rota `health`, tratamento de erros e rate limit simples.

**Verificar:** `pnpm --filter @cifrasync/web build` (inclui as funções).
**Depende de:** T45, T46

### [ ] T48: Telas de cadastro e login
**Fazer:** cadastro (e-mail, senha, nome de usuário único com checagem), login, logout, sessão no cliente (cookie na web, token bearer via `Platform`), fluxo de sessão expirada sem bloquear o uso offline.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T47

### [ ] T49: Endpoint de push
**Fazer:** `sync/push`:
- validação Zod e transação única;
- autorização por tabela;
- insert/update/delete com `version`;
- conflitos (LWW por campo, cópia de conflito para letra);
- idempotência por `mid`.

**Verificar:** `pnpm --filter @cifrasync/web build` e testes de integração contra Postgres local compilam.
**Depende de:** T47

### [ ] T50: Endpoint de pull
**Fazer:** `sync/pull` com escopo próprio (dono + configurações) e paginação por `seq`, retornando o novo cursor (os escopos de grupo vêm na T56).
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T47

### [ ] T51: Motor de sync no cliente
**Fazer:**
- ciclo push → pull com lock entre abas;
- gatilhos: abertura, login, `online`, debounce de 2 s após editar, 60 s em primeiro plano e botão manual;
- backoff e aplicação de conflitos e rejeições no banco local;
- estado para o indicador.

**Verificar:** `pnpm --filter @cifrasync/sync test`.
**Depende de:** T25, T49, T50

### [ ] T52: Indicador de sync e primeiro login
**Fazer:** indicador na barra (sincronizado, sincronizando, pendentes, erro) e download inicial completo ao logar num dispositivo novo, com progresso.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T48, T51

### [ ] T53: Testes de integração do sync
**Fazer:** Postgres de serviço no CI e testes simulando 2 dispositivos (edição offline, conflito de letra gera cópia, exclusão propaga, reenvio idempotente).
**Verificar:** `pnpm test` compila e roda no CI.
**Depende de:** T51

### [ ] T54: Migrations em produção [H]
**Fazer:**
- O Claude escreve `.github/workflows/migrate.yml`, que roda `drizzle-kit migrate` em push na `main` com alteração em migrations.
- O autor cadastra no GitHub o secret com a URL direta (unpooled) do banco.

**Verificar:** a primeira execução do workflow aplica as migrations sem erro.
**Depende de:** T46

### [ ] T55: Release v0.5.0
**Fazer:** `pnpm release` → `v0.5.0`; deploy de produção na Vercel.
**Verificar:** tag no remoto; CI e deploy verdes.
**Depende de:** T45–T54

## Fase 5 — Grupos → `v0.6.0`

### [ ] T56: Escopos de grupo no pull
**Fazer:** cursor por escopo `group:<id>` (grupo, membros, perfis, repertórios compartilhados, itens e músicas referenciadas, incluindo a regra "item mudou → envia música antiga"); `revokedScopes` ao sair ou ser removido; limpeza local no cliente.
**Verificar:** `pnpm --filter @cifrasync/web build` e `pnpm --filter @cifrasync/sync test`.
**Depende de:** T50, T51

### [ ] T57: API de usuários e convites
**Fazer:** `users/search` (prefixo, mín. 3 caracteres, máx. 10 resultados, com rate limit), criar convite (só o dono, limites de 10 grupos e 30 membros), aceitar e recusar.
**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T47

### [ ] T58: Permissões de grupo no push
**Fazer:** regras da tabela da SPEC §4 para `groups`, `group_members`, `group_setlists`, `setlists` e `setlist_items` compartilhados, além do bloqueio de edição de música de outro usuário.
**Verificar:** `pnpm --filter @cifrasync/web build` e testes de permissão compilam.
**Depende de:** T49

### [ ] T59: Telas de grupos
**Fazer:**
- lista de grupos e convites pendentes;
- criar grupo;
- membros: convidar pela busca de nome de usuário, mudar papel, remover, sair;
- compartilhar e remover repertório do grupo;
- selo "do grupo" nos repertórios;
- "copiar para minha biblioteca".

**Verificar:** `pnpm --filter @cifrasync/web build`.
**Depende de:** T56, T57, T58

### [ ] T60: Polling de grupo
**Fazer:** intervalo de 15 s com a tela de um repertório de grupo aberta e sync ao entrar no palco de um repertório de grupo.
**Verificar:** `pnpm --filter @cifrasync/sync test`.
**Depende de:** T56

### [ ] T61: Teste de grupo com outra pessoa [H]
**Fazer:** o autor e uma segunda pessoa (com conta própria) testam convite, compartilhamento, recebimento offline, as permissões e a remoção de membro. O Claude corrige.
**Verificar:** `pnpm build` depois das correções.
**Depende de:** T59, T60

### [ ] T62: Release v0.6.0
**Fazer:** `pnpm release` → `v0.6.0`.
**Verificar:** tag no remoto; CI e deploy verdes.
**Depende de:** T56–T61

## Fase 6 — Desktop (Tauri) → `v0.7.0`

### [ ] T63: Projeto Tauri
**Fazer:** `apps/desktop` com Tauri 2 carregando `apps/web/dist`; identificador e ícones; janela com tamanho mínimo; plugins de store (token), fullscreen, diálogo e arquivos; implementação `Platform` desktop.
**Verificar:** `pnpm --filter @cifrasync/desktop tauri build --debug` no CI (Windows e Linux).
**Depende de:** T34, T55

### [ ] T64: Tela sempre ligada no desktop
**Fazer:** comando Rust com a crate `keepawake` (Windows e Linux), chamado pela camada `Platform` ao entrar e sair do palco.
**Verificar:** `cargo check` em `apps/desktop/src-tauri`.
**Depende de:** T63

### [ ] T65: Chave do updater [H]
**Fazer:** o Claude roda `tauri signer generate` e configura a chave pública no `tauri.conf.json`. O autor guarda a chave privada e a senha em 2 locais e cadastra os secrets `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` no GitHub.
**Verificar:** os secrets aparecem na lista do repositório (`gh secret list`).
**Depende de:** T63

### [ ] T66: Updater e build de release do desktop
**Fazer:**
- plugin updater apontando para o `latest.json` da última release;
- verificação de atualização na abertura;
- workflow `release-build.yml` com gatilho em tag `v*`, que cria a Release com as notas do CHANGELOG e anexa os artefatos da matriz Windows (`.exe`/`.msi`) + Linux (`.AppImage`/`.deb`) via `tauri-action`;
- sincronização da versão do `tauri.conf.json` no `.versionrc`.

**Verificar:** `actionlint` sem erros; build de release roda numa tag de teste `v0.7.0-rc.1`.
**Depende de:** T64, T65

### [ ] T67: Validação no Windows e no Linux [H]
**Fazer:** o autor instala no Windows e num Linux (máquina, VM ou live USB) e valida login, sync, palco, tela ligada e atualização de `rc.1` para `rc.2`. O Claude corrige.
**Verificar:** build de release verde depois das correções.
**Depende de:** T66

### [ ] T68: Release v0.7.0
**Fazer:** `pnpm release` → `v0.7.0`, com os instaladores anexados.
**Verificar:** a Release `v0.7.0` contém `.exe`, `.msi`, `.AppImage`, `.deb` e `latest.json`.
**Depende de:** T63–T67

## Fase 7 — Android (Capacitor) → `v0.8.0`

### [ ] T69: Projeto Capacitor
**Fazer:**
- `apps/android` com Capacitor (`androidScheme: https`, `minSdk` do Android 7);
- plugins de tela ligada, orientação, barra de status/imersivo, preferências (token), filesystem/share;
- implementação `Platform` Android;
- ícones e splash provisórios.

**Verificar:** `./gradlew assembleDebug` no CI.
**Depende de:** T34, T55

### [ ] T70: Keystore Android [H]
**Fazer:** o Claude fornece o comando `keytool`. O autor gera a keystore, guarda em 2 locais e cadastra os secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD` no GitHub.
**Verificar:** `gh secret list` mostra os 4 secrets.
**Depende de:** T69

### [ ] T71: APK assinado na release e aviso de versão
**Fazer:**
- job Android no `release-build.yml` (`assembleRelease` assinado, nome `cifrasync-X.Y.Z.apk`);
- `versionName`/`versionCode` derivados da tag;
- verificação de nova release no app, com link de download.

**Verificar:** build de release gera o APK numa tag `v0.8.0-rc.1`.
**Depende de:** T66, T70

### [ ] T72: Validação em aparelhos Android [H]
**Fazer:** o autor instala o APK em pelo menos um celular e um tablet e valida:
- retrato e paisagem;
- toque e rolagem;
- tela ligada por 10 minutos;
- modo avião tocando um repertório inteiro;
- sync com a web e o desktop.

O Claude corrige.
**Verificar:** build de release verde depois das correções.
**Depende de:** T71

### [ ] T73: Release v0.8.0
**Fazer:** `pnpm release` → `v0.8.0`, com o APK anexado.
**Verificar:** a Release contém o APK assinado e os instaladores do desktop.
**Depende de:** T69–T72

## Fase 8 — Polimento → `v1.0.0`

### [ ] T74: Importação e exportação
**Fazer:** importar `.txt` (com formatação automática) e `.cho`; exportar uma música (`.txt`/`.cho`); backup completo JSON (`/api/export` e local); restauração do backup.
**Verificar:** `pnpm build`.
**Depende de:** T19, T52

### [ ] T75: Conta e "Sobre"
**Fazer:** excluir conta (API + limpeza local), tela "Sobre" com versão e plataforma, link para o repositório e aviso de que o projeto foi feito com auxílio de IA.
**Verificar:** `pnpm build`.
**Depende de:** T48

### [ ] T76: Acessibilidade e mensagens
**Fazer:** contraste AA nos temas e presets, foco visível, alvos ≥ 44 px, rótulos ARIA, mensagens de erro em português.
**Verificar:** `pnpm build` e `pnpm lint` (regras jsx-a11y).
**Depende de:** T41, T59

### [ ] T77: Revisão de segurança e desempenho
**Fazer:**
- autorização em todas as rotas;
- rate limits;
- headers de segurança;
- CORS;
- tamanho de payloads;
- índices;
- bundle da SPA (code splitting do editor e do dicionário);
- medição da troca de página.

Corrigir o que for encontrado.
**Verificar:** `pnpm build`.
**Depende de:** T74–T76

### [ ] T78: Verificação dos critérios da SPEC [H]
**Fazer:** o Claude monta um checklist com os 21 critérios de aceitação da SPEC, indicando como verificar cada um. O autor executa os critérios que dependem de aparelho real, e o Claude corrige as falhas.
**Verificar:** todos os critérios marcados no checklist; `pnpm build` verde.
**Depende de:** T77

### [ ] T79: Documentação final
**Fazer:** README com instalação por plataforma (avisos do SmartScreen e de fontes externas, Obtainium), como rodar localmente, arquitetura resumida e links para os ADRs. `docs/README.md` e as etapas da `specs/01-mvp` atualizados.
**Verificar:** links verificados.
**Depende de:** T78

### [ ] T80: Nome, ícone e release v1.0.0 [H]
**Fazer:** o autor confirma o nome e o ícone definitivos (o Claude aplica em todas as plataformas). `pnpm release --release-as 1.0.0`.
**Verificar:** a Release `v1.0.0` tem site, instaladores e APK; o CHANGELOG está completo.
**Depende de:** T79

### [ ] T81: Início do git flow [H]
**Fazer:**
- O Claude cria a `develop` a partir da `v1.0.0` e faz o push.
- O Claude ajusta a Vercel para usar a `develop` como preview de homologação.
- O autor ativa a proteção de branch em `main` e `develop` no GitHub: PR obrigatório, CI obrigatório e sem push direto. O Claude fornece os comandos `gh` ou o passo a passo.
- `docs/processo/versionamento.md` é marcado como em vigor.

**Verificar:** `git ls-remote origin` lista `develop`; `gh api repos/{owner}/{repo}/branches/main/protection` retorna a proteção ativa.
**Depende de:** T80

---
Implementação: uma task por vez. Marco `[x]` depois de verificar (compilação, build ou testes do pacote). Se aparecer algo fora do PLAN, paro e aviso antes de continuar.

Testes funcionais e rollback não fazem parte deste fluxo — peça **TESTS.md** ou **ROLLBACK.md** se precisar.

Responda **"aprovado"** para começar a implementação pela T1, ou peça ajustes.
