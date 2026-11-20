# Modo palco (teleprompter e visualização)

Tela cheia que exibe uma música ou percorre um repertório. É a tela mais crítica do app: precisa ser **rápida, previsível e legível de longe**.

## 1. Anatomia da tela

```text
┌───────────────────────────────────────────────────────────────┬──────────┐
│ 3/12 · Quando a Noite Chegar — Artista   Tom: A (+2)  Capo 2  │  Acordes │
│───────────────────────────────────────────────────────────────│  ┌────┐  │
│                                                               │  │ G  │  │
│   G               D/F#                                        │  └────┘  │
│   Quando a noite chegar                                       │  ┌────┐  │
│ ▌ C        G         D        ← refrão 1 (marcador + fundo)   │  │D/F#│  │
│ ▌ Ô ô ô, é o nosso som                                        │  └────┘  │
│   ════════ faixa de referência (opcional) ════════            │   ...    │
│                                                               │          │
│ ◀ toque: voltar          (centro: menu)          avançar: ▶   │          │
└───────────────────────────────────────────────────────────────┴──────────┘
  barra inferior (some após 3 s): ⏮ música  ⏯ rolagem  − vel +  − tom +  ⚙  ⏭
```

- Cabeçalho mínimo: posição no repertório, título, tom efetivo, capo.
- **Coluna de acordes** (RF-47) à direita no paisagem / recolhível no retrato; diagramas do instrumento escolhido, destro/canhoto.
- Controles aparecem com toque no **terço central** e somem sozinhos.

## 2. Motor de layout

1. `parseSong` → `transposeDoc` → `applyCapo` → **AST pronto** (memoizado por música + tom + capo).
2. Renderiza em DOM com fonte monoespaçada nas linhas de cifra (alinhamento) e a fonte escolhida na letra — cada `pair` é desenhado como **acordes posicionados sobre sílabas** (cada acorde num `span` absoluto na coluna do caractere), então trocar a fonte da letra não desalinha.
3. **Ajuste de largura:** se uma linha não cabe, quebra mantendo cifra+letra juntas (a cifra acompanha a parte da letra que desce). Opção "reduzir fonte para caber" por música.
4. **Paginação:** mede a altura de cada *unidade indivisível* (par cifra/letra, bloco de tab, cabeçalho + próxima linha) e distribui em páginas do tamanho do viewport, sem cortar unidade. Recalcula em `resize`/rotação/troca de fonte (com `ResizeObserver`).
5. **Colunas:** `1`, `2` ou `auto` (auto = 2 páginas lado a lado se paisagem e largura ≥ 960 px).

## 3. Modos de navegação

### Paginação por toque (RF-44)
- Toque na **metade direita = próxima página**, **esquerda = anterior** (invertível nas configurações para canhotos).
- Na última página, o próximo toque **vai para a próxima música** do repertório, com aviso "Última página" e "Fim do repertório" (RF-49).
- Transição: nenhuma / deslizar / esmaecer (150–300 ms). Bloqueio de toque duplo (300 ms) para não pular 2 páginas.
- Teclado: `→ ↓ PageDown Espaço` avança; `← ↑ PageUp` volta; `+`/`-` tom; `0` tom original; `[`/`]` velocidade; `P` play/pause; `Esc` sai. **Pedais BT/USB que emulam teclado funcionam automaticamente** (RF-51).

### Rolagem automática (RF-45)
- Página contínua (sem quebra) com `requestAnimationFrame` e acumulador de ponto flutuante (rolagem suave mesmo a 5 px/s).
- **Velocidade** de duas formas:
  - fixa em px/s (ou "linhas por minuto", mais intuitivo), salva por música (`songs.scroll_speed`);
  - **por duração**: `velocidade = (altura do conteúdo − altura da tela) / (duração − atraso inicial)`.
- **Atraso inicial** (ex.: 8 s de intro) antes de começar a rolar.
- Play/pause tocando no centro; `−`/`+` velocidade; inverter direção; **salto** (toque duplo na borda inferior vai ao fim, superior ao início).

### Modo híbrido (RF-46)
- A rolagem automática **continua ligada** enquanto o músico arrasta/rola com o dedo, a roda do mouse ou toca para mudar de página.
- Implementação: ao detectar interação (`pointerdown`, `wheel`, `touchmove`) o loop **pausa a escrita de `scrollTop`**; ao soltar, retoma a partir da nova posição (sem pular de volta). Opção "retomar após N s" (0–5 s).
- Toque nas laterais no modo híbrido = avança/volta **meia tela**, sem parar a rolagem.

## 4. Personalização de tela (RF-47)

Configurações em `user_settings.data` (global) com override por dispositivo:

```json
{
  "theme": "dark",                       // interface: light | dark | system
  "stage": {
    "fontFamily": "Inter", "chordFont": "JetBrains Mono",
    "fontSize": 28, "lineHeight": 1.35, "chordScale": 0.9,
    "colors": { "bg": "#000", "lyric": "#fff", "chord": "#ffcc00",
                "chorus1": "#4fc3f7", "chorus2": "#81c784", "chorus3": "#f48fb1",
                "voice2": "#b39ddb", "tab": "#bdbdbd", "note": "#ff8a65" },
    "chorusStyle": "marker+background",  // marker | background | marker+background
    "columns": "auto",                    // 1 | 2 | auto
    "showChords": true, "showChordColumn": true, "hidePersonalNotes": false,
    "uppercase": false, "center": false, "referenceBand": false,
    "instrument": "violao", "lefty": false, "chordStyle": "br",
    "navigation": "paged",                // paged | autoscroll | hybrid
    "tapZonesInverted": false, "transition": "slide"
  }
}
```

- **Presets prontos**: *Palco escuro* (preto + amarelo), *Ensaio claro*, *Alto contraste*, *Sol forte* (fundo branco, fonte grossa).
- Tamanhos com nome: Pequena, Normal, Ao vivo 1–3, Palco 1–2 + slider livre; **pinça para zoom** no celular ajusta o tamanho da sessão.
- Pré-visualização ao vivo na tela de configurações.

## 5. Recursos de palco por plataforma

| Recurso | Web/PWA | Android (Capacitor) | Desktop (Tauri) |
|---|---|---|---|
| Tela sempre ligada | Screen Wake Lock API | plugin `@capacitor-community/keep-awake` | comando Rust com a crate `keepawake` (Windows e Linux) |
| Tela cheia | Fullscreen API | modo imersivo (`@capacitor/status-bar` + flags de sistema) | `getCurrentWindow().setFullscreen(true)` |
| Orientação | — | travar retrato/paisagem (`@capacitor/screen-orientation`) | — |
| Teclado/pedal | eventos `keydown` | `keydown` (teclado BT/OTG) | `keydown` |
| Segunda tela (monitor de palco) | — | — | P2: janela extra do Tauri espelhando a música atual |

## 6. Repertório em execução

- Lista lateral (gaveta) com as músicas e **momentos**; tocar pula para a música.
- **Adição provisória**: buscar na biblioteca e inserir uma música na sessão sem salvar no repertório.
- Ajuste de tom ao vivo → pergunta "salvar neste repertório?" ao sair da música.
- Pré-carrega (layout pronto) a próxima música para troca instantânea.
- Se o repertório for de grupo e chegar uma alteração pelo sync **durante** o show, mostra um aviso discreto e aplica só ao trocar de música (nunca reorganiza a tela atual no meio de uma execução).
