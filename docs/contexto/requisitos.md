# Requisitos funcionais e não funcionais

Requisitos numerados (`RF-xx`) para serem citados nas tasks e nos commits/PRs. Prioridade: **P0** = MVP, **P1** = versão 1.0, **P2** = depois.

## ✅ Dentro do escopo

### 1. Gestão de músicas e cifras

| ID | Requisito | Prior. |
|---|---|---|
| RF-01 | CRUD de música: título, artista, tom original, capo, estilo, BPM, duração, observações, letra cifrada | P0 |
| RF-02 | **Formatação automática ao colar**: detecta linhas de cifra × letra, tablaturas, cabeçalhos de seção (`[Refrão]`, `Intro:`), normaliza tabs/espaços e mostra o resultado colorido — ver [dominio-musical.md](dominio-musical.md#2-formatação-automática) | P0 |
| RF-03 | Editor com pré-visualização ao vivo (lado a lado no desktop/web; abas no celular) | P0 |
| RF-04 | **Destaque de refrão em 3 variações** (Refrão 1, 2, 3 — cada uma com cor/estilo próprio) aplicado por seleção de linhas + botão | P0 |
| RF-05 | **2ª voz**: marcar linhas inteiras ou trechos de linha | P0 |
| RF-06 | Blocos de **tablatura**, **solo** e **anotação** (anotação pessoal pode ser ocultada no palco) | P0 |
| RF-07 | **Transposição** rápida (± semitom, escolher tom destino, voltar ao original) no editor e no palco; tom salvo por música e sobrescrevível por repertório | P0 |
| RF-08 | **Capotraste** (0–11): exibe "Capo 2ª casa" e opção de mostrar formas com capo ou acordes como soam | P0 |
| RF-09 | Preferência de acidentes (♯/♭) automática pelo tom, com override manual | P1 |
| RF-10 | **Dicionário de acordes** para **violão/guitarra, cavaco/banjo e ukulele**, várias posições por acorde, escolha da posição preferida por música | P0 (violão) / P1 (demais) |
| RF-11 | Diagramas em modo **destro ou canhoto** | P0 |
| RF-12 | Busca/filtro na biblioteca por título, artista, tom, estilo e trecho da letra (local, funciona offline) | P0 |
| RF-13 | Importar/exportar música em `.txt` (cifra) e `.cho` (ChordPro); backup completo em JSON | P1 |

### 2. Repertórios e grupos

| ID | Requisito | Prior. |
|---|---|---|
| RF-20 | CRUD de repertório (nome, data/evento, observações), adicionar/remover/reordenar músicas (arrastar) | P0 |
| RF-21 | Por item do repertório: tom específico (override), observação curta | P0 |
| RF-22 | **Momentos** (separadores: "Intervalo", "Bis") dentro do repertório | P1 |
| RF-23 | Duplicar repertório; copiar lista como texto (WhatsApp) | P1 |
| RF-24 | **Grupos (bandas)**: criar grupo, convidar membro **pelo nome de usuário** (busca por prefixo, mín. 3 caracteres), remover membro, sair do grupo | P0 |
| RF-25 | Compartilhar um repertório inteiro com o grupo → todos os membros recebem repertório **e as músicas dele** sincronizados (sem cópia) | P0 |
| RF-26 | Papéis: `owner` (gerencia membros, remove qualquer repertório), `editor` (edita repertórios do grupo), `member` (só lê). Músicas compartilhadas são lidas por todos e editadas só pelo dono da música | P0 |
| RF-27 | "Copiar para minha biblioteca" uma música recebida do grupo (cópia editável) | P1 |
| RF-28 | Convite pendente (o convidado aceita/recusa) | P1 |

### 3. Palco, offline e sync

| ID | Requisito | Prior. |
|---|---|---|
| RF-40 | **Offline completo**: toda a biblioteca, repertórios próprios e de grupos ficam no dispositivo; criar/editar offline e sincronizar depois | P0 |
| RF-41 | **Sync bidirecional** web ⇄ Android ⇄ desktop, automático (ao abrir, ao voltar a conexão, após editar, a cada 60 s) + botão "Sincronizar agora" + indicador de estado | P0 |
| RF-42 | Resolução de conflitos sem perda de dados (cópia de conflito para letra) | P0 |
| RF-43 | Modo palco: música avulsa ou repertório (próxima/anterior música) | P0 |
| RF-44 | **Paginação por toque** (metade direita avança / esquerda volta) + teclado (setas, PageUp/Down, espaço) | P0 |
| RF-45 | **Rolagem automática** por velocidade ou por duração da música; play/pause, ±velocidade, inverter | P0 |
| RF-46 | **Modo híbrido**: arrastar/rolar manualmente sem desligar a automática | P0 |
| RF-47 | Personalização: fonte (família/tamanho/entrelinha), cores por elemento, **tema escuro**, colunas (1/2/auto), coluna de acordes, letra centralizada, maiúsculas, ocultar cifras | P0 |
| RF-48 | Tela sempre ligada no palco (wake lock) e tela cheia | P0 |
| RF-49 | Faixa de referência, aviso de última página/fim do repertório | P1 |
| RF-50 | Configurações sincronizadas por conta, com override por dispositivo (ex.: fonte maior no celular) | P1 |
| RF-51 | Pedais Bluetooth/USB que se apresentam como **teclado** funcionam de graça pelas teclas do RF-44 (sem suporte dedicado) | P1 |

### 4. Conta e plataforma

| ID | Requisito | Prior. |
|---|---|---|
| RF-60 | Cadastro/login com e-mail + senha e **nome de usuário único** | P0 |
| RF-61 | Login com GitHub/Google (opcional) | P2 |
| RF-62 | Recuperação de senha por e-mail | P2 |
| RF-63 | Excluir conta e todos os dados | P1 |
| RF-64 | Interface em português (i18n preparado para en/es) | P0 / P2 |
| RF-65 | Atualização automática do desktop; aviso de nova versão no Android | P1 |

## ❌ Fora do escopo

- Comunidade: acervo público, busca e cópia de músicas de outros usuários, músicas "públicas".
- QR Codes, Cardápio musical, pedidos do público, gorjetas.
- Pedais com suporte dedicado (só o que já funciona como teclado — RF-51).
- Afinador, playback de áudio, metrônomo.
- Planos pagos/licença, pagamentos.
- iOS/macOS (a arquitetura permite no futuro, mas exige contas pagas da Apple).
- Publicação na Play Store (taxa única de US$ 25 — opcional).

## Requisitos não funcionais

- **RNF-01 Custo zero** em infraestrutura (planos gratuitos).
- **RNF-02 Offline-first**: a UI nunca espera a rede para mostrar ou salvar dados.
- **RNF-03 Desempenho no palco**: troca de página < 100 ms; rolagem a 60 fps em celular intermediário.
- **RNF-04 Segurança**: senhas com hash (scrypt/argon2 via Better Auth), toda autorização feita no servidor, HTTPS.
- **RNF-05 Portabilidade dos dados**: exportação completa em JSON/ChordPro.
- **RNF-06 Acessibilidade**: contraste AA nos temas padrão, alvos de toque ≥ 44 px.
- **RNF-07 Qualidade**: lógica de domínio (parser, transposição, acordes, sync) com testes unitários.
