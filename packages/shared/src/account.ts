/**
 * Contas sem e-mail (docs/specs/02-contas-e-administracao): a biblioteca de autenticação exige
 * um e-mail, então o cadastro usa um endereço interno derivado do nome de usuário.
 * O TLD `.invalid` é reservado (RFC 2606) e nunca recebe mensagens.
 */
export const INTERNAL_EMAIL_DOMAIN = 'usuarios.cifrasync.invalid';

export function internalEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function isInternalEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
}

/** Lê a lista de administradores da variável de ambiente (nomes separados por vírgula). */
export function parseAdminUsernames(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}
