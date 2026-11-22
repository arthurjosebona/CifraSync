import { saveSettings } from '@cifrasync/sync';

import { db, deepMerge } from './data';

/**
 * Grava uma alteração parcial nas configurações, mesclando com o que está salvo no escopo
 * naquele momento (não com uma cópia da tela, que pode estar desatualizada se o usuário
 * mexer em duas opções seguidas). `device` grava só neste dispositivo; `global`, na conta.
 */
export async function updateSettings(
  patch: Record<string, unknown>,
  scope: 'global' | 'device' = 'global',
): Promise<void> {
  await saveSettings(db, (current) => deepMerge(current, patch) as Record<string, unknown>, scope);
}

/** Substitui tudo o que está salvo no escopo (limpar o override ou restaurar padrões). */
export async function replaceSettings(
  data: Record<string, unknown>,
  scope: 'global' | 'device' = 'global',
): Promise<void> {
  await saveSettings(db, data, scope);
}
