# Verificação dos critérios de aceitação — MVP

Checklist da T79: como cada critério da [SPEC](SPEC.md#critérios-de-aceitação-testáveis) é verificado.

- **Automático:** coberto por teste que roda no CI a cada PR.
- **Autor:** precisa de aparelho real, conta na Vercel ou release publicada. Fica para depois do deploy, como combinado no prompt [0009](../../prompts/0009-construir-tudo-antes-de-testar.md).

| # | Critério (resumo) | Como verificar | Situação |
|---|---|---|---|
| 1 | Conta criada na Web entra no Android e no Desktop e vê os mesmos dados | Criar conta no site; entrar no APK e no desktop com o mesmo usuário; conferir músicas, repertórios e grupos | **Autor** (depois do deploy). Base automática: `server/sync-devices.test.ts` (dois aparelhos, mesma conta) |
| 2 | Cifra de 3 seções com tablatura classificada 100% em ≥ 30 cifras | `packages/core/src/fixtures.test.ts` (30 cifras autorais rotuladas linha a linha) | Automático ✅ |
| 3 | "E agora, A casa caiu" = letra; "E  A  Bm  F#m" = cifra | `packages/core/src/song.test.ts` → `classifyLine` | Automático ✅ |
| 4 | `G D/F# Em7 C7M(9)` +2 → `A E/G# F#m7 D7M(9)` na mesma coluna | `transpose.test.ts` e `song-transform.test.ts` (critério da SPEC) | Automático ✅ |
| 5 | Fá maior usa bemóis; tablatura intacta | `song-transform.test.ts` → "usa bemóis para Fá e não mexe na tablatura" | Automático ✅ |
| 6 | Capo 2 em Lá → formas de Sol | `song-transform.test.ts` → "capo 2 em Lá mostra formas de Sol" | Automático ✅ |
| 7 | ≥ 3 posições de 9 acordes em violão, cavaco e ukulele; canhoto espelhado | `voicings.test.ts` (27 casos); espelho em `ChordDiagram` (ordem das cordas invertida) | Automático ✅ (espelho: conferência visual pelo autor) |
| 8 | Refrão 1/2/3, 2ª voz, tablatura e anotação com cores próprias no palco | Classes `song-chorus1..3`, `song-voice2`, `song-tab`, `song-note` ligadas às cores do palco; pré-visualização em Ajustes | **Autor** (conferência visual) |
| 9 | Modo avião: criar, editar, montar repertório, tocar; ao reconectar aparece no outro aparelho em ≤ 60 s | Banco local + fila de mutações; sync ao voltar a conexão e a cada 60 s | **Autor** (aparelho real). Base automática: `sync-devices.test.ts` → "edição offline no aparelho A aparece no B" |
| 10 | Mesma música editada offline em dois aparelhos → versão vencedora + cópia de conflito | `sync-devices.test.ts` → "conflito de letra gera cópia nos dois aparelhos" e `api.test.ts` | Automático ✅ |
| 11 | Dono encontra usuário pelas 3 primeiras letras e adiciona; membro recebe repertório com músicas, inclusive offline | `api.test.ts` (busca por prefixo) + `groups.test.ts` (convite → aceite → recebe repertório e músicas antigas) | Automático ✅ (fluxo na interface: **autor**, T62) |
| 12 | Membro sem papel de editor não altera repertório nem música alheia, mesmo chamando a API | `groups.test.ts` → "membro sem papel de editor..." e `api.test.ts` → "não deixa gravar música de outro usuário" | Automático ✅ |
| 13 | Membro removido deixa de ver o repertório após o próximo sync | `groups.test.ts` → "membro removido perde o conteúdo do grupo no aparelho" | Automático ✅ |
| 14 | Toque na metade direita avança, na esquerda volta, na última página vai à próxima música | e2e `palco.spec.ts` (paginação e repertório) | Automático ✅ (Chromium e WebKit) |
| 15 | Nenhuma página começa com letra separada da cifra | `paginate.test.ts` + e2e "nenhuma página começa com letra separada" | Automático ✅ |
| 16 | Rolagem por duração termina no tempo (±5%); híbrido não desliga a rolagem | Velocidade = altura rolável ÷ (duração − espera); e2e do modo híbrido | Híbrido: automático ✅. Tempo: **autor** (cronometrar uma música) |
| 17 | Tela não apaga em 10 min de palco (Android, Windows, Linux) | Wake Lock (web), keep-awake (Android), crate `keepawake` (desktop) | **Autor** (T68 e T73) |
| 18 | Troca de página < 100 ms em celular intermediário | Páginas pré-calculadas; troca só muda o índice; paginação memoizada | **Autor** (T73) |
| 19 | Fonte/cores/tema "só neste aparelho" ficam só nele; sem a opção, vão para os outros | Configurações global × por dispositivo (`user_settings.deviceId`); `repo.test.ts` → "separa global e override do dispositivo" | Automático ✅ (entre aparelhos: **autor**) |
| 20 | Release com instalador Windows, pacotes Linux e APK assinado; desktop se atualiza sozinho | Workflow `release-build.yml` (tauri-action + Gradle) | **Autor** (T66, T71 e primeira release com tag) |
| 21 | Infra sem cobrança (Vercel, banco, GitHub) | Vercel Hobby, Neon Free, repositório público | **Autor** (conferir o painel de uso depois do deploy) |

## Passos do autor, em ordem

1. **T46 — Vercel e Neon:** importar o repositório (diretório raiz `apps/web`), criar o banco Neon em *Storage*, definir `BETTER_AUTH_SECRET` e a região das funções.
2. **T55 — Secret das migrations:** cadastrar `DATABASE_URL_UNPOOLED` em *Settings → Secrets and variables → Actions* (ambiente `production`) e rodar o workflow **Migrations**.
3. **Variável do app nativo:** criar a variável de repositório `VITE_API_URL` com a URL de produção (ex.: `https://cifrasync.vercel.app`).
4. **T66 — Chave do updater:** gerar com `pnpm --filter @cifrasync/desktop tauri signer generate -w cifrasync.key`, colar a chave pública em `tauri.conf.json` e cadastrar os secrets `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
5. **T71 — Keystore Android:** gerar com `keytool`, guardar em 2 lugares e cadastrar os secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD`.
6. **Testes em uso real:** T33 (web), T44 (palco em ensaio), T62 (grupo com outra pessoa), T68 (Windows e Linux), T73 (Android) — marcando os critérios **Autor** acima.
7. **T81 — Nome e ícone** definitivos e a release `v1.0.0`.
