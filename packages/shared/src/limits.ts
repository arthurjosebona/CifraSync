/** Limites do produto — protegem a cota gratuita do banco (PLAN, "Custo zero"). */
export const LIMITS = {
  groupsOwnedPerUser: 10,
  membersPerGroup: 30,
  usernameSearchMinChars: 3,
  usernameSearchMaxResults: 10,
  pullPageSize: 500,
  pushBatchSize: 200,
} as const;

/** Intervalos de sincronização em milissegundos (ADR 0005). */
export const SYNC_INTERVALS = {
  foreground: 60_000,
  groupScreen: 15_000,
  afterEditDebounce: 2_000,
} as const;
