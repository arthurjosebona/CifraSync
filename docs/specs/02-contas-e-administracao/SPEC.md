# SPEC — Contas sem e-mail e administração

- **Status:** aprovada pelo autor (prompt [0012](../../prompts/0012-contas-sem-email-e-admin.md))
- **Depende de:** [01-mvp](../01-mvp/SPEC.md)

## Contexto

O CifraSync vai ser usado por um grupo pequeno, em que todos se conhecem (a equipe de louvor de uma igreja). No MVP o cadastro pede e-mail, mas o app nunca manda mensagem nem verifica o endereço, e não existe nenhuma forma de recuperar a senha: a [SPEC do MVP](../01-mvp/SPEC.md) deixou "recuperação de senha por e-mail" fora do escopo.

## Objetivo

Cadastro só com nome, nome de usuário e senha. Quem esquecer a senha recebe uma senha temporária de um administrador do app, sem serviço de e-mail e sem custo.

## Requisitos

### Cadastro e login

1. O cadastro pede **nome**, **nome de usuário** e **senha**. Não pede e-mail.
2. O login é feito pelo nome de usuário. Contas antigas, criadas com e-mail, continuam entrando também pelo e-mail.
3. O e-mail interno que a biblioteca de autenticação exige nunca aparece para o usuário.

### Troca de senha

4. Quem está logado troca a própria senha em Ajustes → Conta, informando a senha atual e a nova (mínimo de 8 caracteres).

### Administração

5. **Administrador do app** é quem tem o nome de usuário na variável de ambiente `ADMIN_USERNAMES` (lista separada por vírgulas) ou quem foi promovido por outro administrador.
6. Administradores veem uma tela **Administração** (link em Ajustes → Conta) com a lista de usuários e uma busca por nome ou usuário.
7. Para cada usuário, o administrador pode:
   - **gerar uma senha temporária**, mostrada uma única vez na tela para ser repassada à pessoa;
   - **promover a administrador** ou **remover o papel de administrador**;
   - **desativar** ou **reativar** a conta.
8. Gerar senha temporária desconecta a pessoa de todos os aparelhos. No próximo login, o app obriga a trocar a senha antes de continuar.
9. Conta desativada não consegue entrar, é desconectada de todos os aparelhos e não aparece na busca de usuários para convites de grupo. Os dados dela continuam guardados.
10. Proteções:
    - ninguém remove o papel de administrador de quem está em `ADMIN_USERNAMES` (só editando a variável);
    - o administrador não remove o próprio papel nem desativa a própria conta;
    - um administrador não pode ser desativado sem antes perder o papel.
11. O administrador **não** vê senhas (só a temporária que acabou de gerar) nem as músicas, os repertórios e as configurações dos outros usuários.

## Fora do escopo

- Recuperação de senha por e-mail (pode ser adicionada depois, sem refazer o que está aqui).
- Excluir a conta de outra pessoa pela administração (a própria pessoa continua podendo excluir a dela).
- Registro (log) das ações de administração.

## Critérios de aceite

- Criar conta sem e-mail e entrar com o nome de usuário funciona na web, no desktop e no Android.
- Um usuário comum recebe 403 em qualquer rota `/api/admin/*`.
- Depois de uma senha temporária: a senha antiga deixa de funcionar, os aparelhos da pessoa são desconectados, a temporária funciona e o app pede a troca até ela ser feita.
- Conta desativada recebe erro ao entrar e some da busca de usuários; reativada, volta a entrar.
