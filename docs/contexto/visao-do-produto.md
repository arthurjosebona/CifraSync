# Visão do produto

## O que é

O **CifraSync** é um organizador de músicas cifradas e um **monitor de palco**. O músico cadastra letras com cifras e monta repertórios em qualquer dispositivo. No show, o app exibe as músicas em tela cheia como um **teleprompter**, com transposição na hora, diagramas de acordes e rolagem/paginação, **sem depender de internet**.

## Para quem

- **Músico solo** (voz e violão, barzinho, eventos): precisa trocar de tom rápido, ler de longe e não ficar sem a letra quando o sinal cai.
- **Banda / equipe de louvor / grupo de ensaio**: precisa que todos toquem **o mesmo repertório, na mesma ordem e no mesmo tom**, e que uma mudança feita por um chegue a todos.

## Conceitos do domínio

| Conceito | Definição |
|---|---|
| **Música** | Título, artista, tom, capotraste, estilo e o **conteúdo cifrado** (letra + cifras + marcações). Pertence a um usuário. |
| **Cifra** | Acordes escritos na linha **acima** da letra, alinhados por espaços com a sílaba onde entram. |
| **Marcações** | Destaques no conteúdo: **refrão** (3 variações), **2ª voz** (linha ou trecho), **tablatura/solo**, **anotação** (incluindo anotação pessoal ocultável). |
| **Tom / transposição** | Tom em que a cifra foi escrita e o deslocamento em semitons aplicado para tocar em outro tom. |
| **Capotraste** | Casa em que o capo é preso; muda as formas dos acordes sem mudar o som. |
| **Diagrama de acorde** | Desenho do braço com a posição dos dedos, por instrumento (violão/guitarra, cavaco/banjo, ukulele) e orientação (destro/canhoto). |
| **Repertório** (setlist) | Lista ordenada de músicas para um show/ensaio, com tom por item e separadores ("momentos"). |
| **Grupo** (banda) | Conjunto de usuários que compartilham repertórios. Tem um dono que convida membros pelo **nome de usuário**. |
| **Modo palco** | Tela cheia de execução: paginação por toque, rolagem automática ou híbrida, coluna de acordes. |
| **Sincronização** | Troca automática de alterações entre web, Android e desktop, nos dois sentidos, com cada dispositivo funcionando sozinho quando offline. |

## Princípios

1. **Offline primeiro:** o dispositivo tem uma cópia completa do que o usuário usa; a internet só serve para sincronizar.
2. **Editar em qualquer lugar:** web, celular e desktop têm as mesmas capacidades de criação e edição.
3. **Palco acima de tudo:** a tela de execução precisa ser rápida, legível de longe e à prova de toques acidentais.
4. **Formato familiar:** o músico cola a cifra como já conhece (cifra em cima, letra embaixo); o app entende e formata sozinho.
5. **Custo zero:** projeto pessoal, open source, hospedado em planos gratuitos.

## Documentos relacionados

- [requisitos.md](requisitos.md) — requisitos numerados (`RF-xx`, `RNF-xx`) com prioridade
- [dominio-musical.md](dominio-musical.md) — formato da cifra, formatação automática, acordes, transposição, capo, diagramas
- [sincronizacao-offline.md](sincronizacao-offline.md) — dados, sync, grupos e permissões (notas técnicas preliminares)
- [modo-palco.md](modo-palco.md) — comportamento da tela de execução
