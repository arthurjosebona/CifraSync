import { saveSettings } from '@cifrasync/sync';

import { db, deepMerge } from './data';

/**
 * Grava uma alteração parcial nas configurações, mesclando com o que já existe no escopo.
 * `device` grava só neste dispositivo (override); `global` vale para a conta toda.
 */
export async function updateSettings(
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
  scope: 'global' | 'device' = 'global',
): Promise<void> {
  await saveSettings(db, deepMerge(current, patch) as Record<string, unknown>, scope);
}
