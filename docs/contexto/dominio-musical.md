# Domínio musical — formato da cifra, transposição e acordes

Tudo aqui mora no pacote **`packages/core`**: TypeScript puro, sem React e sem rede, 100% coberto por testes (Vitest). É o coração do app e é o mesmo código em web, Android e desktop.

## 1. Formato de armazenamento

**Decisão:** o conteúdo da música é salvo como **texto** (`songs.content`), no formato que o músico já conhece — **cifra em cima, letra embaixo** — acrescido de **marcações leves de bloco**. Motivos: o usuário cola direto do Cifra Club/WhatsApp, o diff/merge de texto é simples, e o texto continua legível em qualquer lugar.

```text
Intro: G  D/F#  Em  C

[Primeira parte]
G               D/F#
Quando a noite chegar
Em              C
Eu vou cantar pra você

{refrao:1}
C        G         D
Ô ô ô, é o nosso som
{/refrao}

{voz2}
(é o nosso som)
{/voz2}
Tem ((uma frase)) com 2ª voz no meio da linha

{tab:Solo}
e|-----0---3---|
B|---1---------|
G|-0-----------|
{/tab}

# lembrar: segurar o último acorde
{nota}Baixo entra só na 2ª volta{/nota}
```

| Marcação | Significado | Cor/estilo (configurável) |
|---|---|---|
| `{refrao:1}` … `{/refrao}` | Refrão variação 1 (também `:2` e `:3`) | marcador lateral e/ou fundo destacado |
| `{voz2}` … `{/voz2}` | Bloco de 2ª voz | cor de 2ª voz, itálico |
| `((texto))` | Trecho de 2ª voz dentro de uma linha | idem, inline |
| `{tab}` / `{tab:Solo}` … `{/tab}` | Tablatura/solo (monoespaçado, nunca quebra linha nem é transposto) | cor de tablatura |
| `{nota}` … `{/nota}` | Anotação visível | cor de anotação |
| `# texto` | Anotação pessoal (pode ser ocultada no palco) | cor de anotação, opcional |
| `[Nome]` ou `Nome:` sozinho na linha | Cabeçalho de seção | negrito |

O usuário **não precisa digitar as marcações**: no editor ele seleciona linhas e clica em *Refrão 1/2/3*, *2ª voz*, *Tab*, *Nota*; o editor insere as marcações. Import/export **ChordPro** (`{soc}`, `[C]palavra`) é feito por conversão.

### Modelo em memória (AST)

`parseSong(text) → SongDoc`:

```ts
type SongDoc = { blocks: Block[]; chordsUsed: string[] }
type Block =
  | { kind: 'section'; title: string }
  | { kind: 'lines'; style: 'normal'|'chorus1'|'chorus2'|'chorus3'|'voice2'|'note'; lines: Line[] }
  | { kind: 'tab'; title?: string; raw: string[] }
  | { kind: 'comment'; text: string; personal: boolean }
type Line =
  | { kind: 'pair'; chords: ChordAt[]; lyric: Segment[] }   // cifra + letra
  | { kind: 'chords'; chords: ChordAt[] }                   // só cifras (intro, passagem)
  | { kind: 'lyric'; lyric: Segment[] }                     // só letra
  | { kind: 'blank' }
type ChordAt = { col: number; chord: Chord | null; raw: string }  // raw preserva o que não foi reconhecido
type Segment = { text: string; voice2?: boolean }
```

A renderização (palco e preview) **só lê o AST** — nunca o texto cru.

## 2. Formatação automática

Executada ao colar e ao clicar em *Formatar* (`autoFormat(text) → { text, report }`):

1. **Normalização:** `\r\n`→`\n`, tabs → espaços (tab = 8 colunas, ajustável), remove espaços à direita, NBSP → espaço, colapsa mais de 2 linhas vazias.
2. **Classificação de cada linha** com pontuação:
   - **Linha de cifra**: ≥ 70% dos tokens (separados por espaço) são acordes válidos (ver §3) ou símbolos de passagem (`|`, `%`, `-`, `x2`, `(`, `)`); tolera "Intro:" no começo.
   - **Tablatura**: casa `^[eBGDAEbgda]\s*[|:]` e tem ≥ 6 de `-|0-9hpb/~`. Linhas consecutivas viram um bloco `{tab}`.
   - **Cabeçalho**: `^\[.+\]$` ou palavra conhecida + `:` (Intro, Refrão, Ponte, Solo, Final, Pré-refrão, Verso, Interlúdio).
   - **Letra**: o resto.
3. **Pareamento:** linha de cifra seguida de linha de letra vira `pair`; a coluna de cada acorde é preservada (`col`).
4. **Heurística de refrão** (sugestão, não aplicação): seção chamada "Refrão" ou blocos de letra que se repetem idênticos ≥ 2 vezes ganham um aviso "Marcar como Refrão 1?".
5. **Sugestões de tom:** se o tom não foi informado, estima pelo primeiro/último acorde e pelo histograma de acordes (diatônicos de cada tom).
6. **Relatório:** quantas linhas de cifra/letra/tab foram detectadas e tokens não reconhecidos (sublinhados em vermelho no editor).

Casos de teste obrigatórios: cifras do Cifra Club coladas, cifra com acordes entre parênteses `(A7)`, linhas "letra + cifra na mesma linha" (`[G]palavra` estilo ChordPro), palavras que parecem acordes ("A casa", "E agora") — regra: linha com palavras comuns da língua e < 70% de acordes é letra.

## 3. Parser de acordes (notação brasileira + internacional)

`parseChord("F#m7(b5)/E") → { root: 'F#', quality: 'm', ext: ['7'], alt: ['b5'], bass: 'E' }`

- Fundamental: `A–G` + `#`/`b` (também `♯`/`♭`).
- Qualidade: `m`, `min`, `-`, `dim`, `°`/`º`, `aug`, `+`, `sus2`, `sus4`, **`4` (=sus4 na escrita BR)**.
- Extensões: `5`, `6`, `7`, **`7M`**, `maj7`, `7+`, `9`, `11`, `13`, `add9`, `(9)`, `6/9`.
- Alterações: `(b5)`, `(#5)`, `(b9)`, `(#11)`, `(b13)` — com ou sem parênteses, separadas por `,` ou `/` dentro dos parênteses.
- Baixo: `/E` (inversão).
- Saída normalizada configurável: **estilo BR** (`7M`, `m7(b5)`, `°`) ou **internacional** (`maj7`, `m7b5`, `dim`).

## 4. Transposição

- `transposeChord(chord, semitones, preferFlats)` — transpõe fundamental **e baixo**; qualidade/extensões intactas.
- **Ortografia:** a escolha de `#`/`b` segue o **tom de destino** (tons com bemóis: F, Bb, Eb, Ab, Db, Gb e relativos menores) com override manual (RF-09).
- **Realinhamento de colunas:** quando um acorde muda de tamanho (`G` → `G#`), a linha de cifra é reconstruída para que cada acorde mantenha a coluna original; se colidir com o próximo, empurra com 1 espaço mínimo.
- **Onde o tom vive:**
  - `songs.key` = tom original da cifra (como foi escrita).
  - `songs.transpose` = deslocamento preferido do usuário (salvo).
  - `setlist_items.transpose` = override do repertório (a banda toca em Ré naquele show).
  - No palco: `transposição efetiva = item ?? música`, mais ajuste ao vivo temporário (± que não salva, com botão "salvar no repertório").
- Tablaturas **nunca** são transpostas (aviso visual quando o tom foi alterado).

## 5. Capotraste

- `songs.capo` (0–11).
- Exibição no topo: **"Capo na 2ª casa · Tom: A (formas de G)"**.
- Alternância no palco: **"Formas com capo"** (mostra os acordes como se toca: tom − capo) × **"Como soa"** (sem capo). Implementado como transposição de `-capo` semitons apenas na renderização.
- Ao transpor com capo, sugere capo alternativo que mantenha formas abertas (ex.: tom B → capo 4 + formas de G) — P1.

## 6. Dicionário de diagramas de acordes

### Instrumentos

| Instrumento | Cordas | Afinação (grave → aguda) |
|---|---|---|
| Violão / guitarra | 6 | E A D G B E |
| Cavaco / banjo (afinação de cavaco) | 4 | D G B D |
| Ukulele (soprano/concerto/tenor) | 4 | G C E A (G reentrante) |

Afinações são dados (`instruments.ts`), então adicionar outra (cavaco em Ré-Sol-Si-Mi, ukulele barítono) é só uma linha.

### De onde vêm as posições

1. **Base curada:** para violão e ukulele, importar o dataset **`chords-db`** (licença MIT; tem guitarra e ukulele com várias posições por acorde) num JSON gerado em build (`packages/core/data/`).
2. **Gerador algorítmico** (`generateVoicings(chord, tuning)`), usado para o **cavaco/banjo** (não há dataset livre bom) e para acordes ausentes no dataset:
   - Notas obrigatórias: fundamental, 3ª (ou 2ª/4ª em sus), 7ª e extensões; **5ª opcional**.
   - Busca exaustiva em janelas de 4 casas (posições 0–12), cada corda = abafada, solta ou casa na janela tocando nota do acorde.
   - Restrições: todas as notas obrigatórias presentes; baixo = fundamental (ou o baixo do acorde com barra) em instrumentos de 6 cordas; máx. 4 dedos (pestana conta 1); cordas abafadas só nas pontas no cavaco/ukulele.
   - Pontuação: menos dedos, posição mais baixa, cordas soltas, pestana reconhecível, menor abertura → ordena e devolve as 6 melhores.
3. **Preferência do usuário:** `songs.chord_prefs = { "violao": { "F": 1, "Bm": 2 } }` — índice da posição escolhida (RF-10). Global por padrão; por música quando escolhida no editor.

### Renderização

- Componente React `<ChordDiagram chord tuning voicing lefty size />` desenhando **SVG próprio** (nº de cordas variável, casa inicial, pestana, X/O, dedos opcionais).
- **Canhoto:** inverte a ordem das cordas no desenho (espelho horizontal) — puro, sem dados extras.
- **Coluna de acordes** no palco: lista `chordsUsed` (já transpostos e com capo aplicado) com o diagrama do instrumento escolhido; tocar num diagrama alterna entre as posições.
- Tela **Dicionário** separada: escolher instrumento, fundamental e tipo → todas as posições.

## 7. API pública do pacote (para os testes e para a UI)

```ts
parseSong(text): SongDoc
autoFormat(text): { text: string; report: FormatReport }
serializeSong(doc): string
parseChord(s): Chord | null
formatChord(c, style: 'br'|'intl'): string
transposeChord(c, n, opts): Chord
transposeDoc(doc, n, opts): SongDoc
applyCapo(doc, capo, mode: 'shapes'|'sounding'): SongDoc
detectKey(doc): { key: string; confidence: number }
getVoicings(chord, instrument): Voicing[]   // dataset + gerador
toChordPro(doc) / fromChordPro(text)
```
