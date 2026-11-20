/**
 * Motor de sync do app e os gatilhos (RF-41): ao abrir, ao voltar a conexão, 2 s depois de
 * uma edição, a cada 60 s com o app em primeiro plano e no botão "Sincronizar agora".
 */
import { SYNC_INTERVALS } from '@cifrasync/shared';
import { SyncEngine, type SyncState } from '@cifrasync/sync';
import { liveQuery } from 'dexie';
import { useSyncExternalStore } from 'react';

import { transport } from './api';
import { db } from './data';

export const syncEngine = new SyncEngine(db, transport);

let started = false;
let interval: ReturnType<typeof setInterval> | undefined;
let fastUntil = 0;

/** Liga os gatilhos automáticos (uma vez). */
export function startSync(): void {
  if (started) return;
  started = true;
  const kick = () => void syncEngine.sync();

  kick();
  window.addEventListener('online', kick);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kick();
  });

  // a cada edição local (fila de mutações cresce), sincroniza 2 s depois da última
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let lastCount = -1;
  liveQuery(() => db.outbox.count()).subscribe((count) => {
    if (count > lastCount && lastCount !== -1) {
      clearTimeout(debounce);
      debounce = setTimeout(kick, SYNC_INTERVALS.afterEditDebounce);
    }
    lastCount = count;
  });

  // relógio de 15 s: sincroniza a cada tique em telas de grupo, e a cada 4 tiques (60 s) no resto
  const ticksPerForeground = Math.round(SYNC_INTERVALS.foreground / SYNC_INTERVALS.groupScreen);
  let ticks = 0;
  const tick = () => {
    if (document.visibilityState !== 'visible') return;
    ticks++;
    if (Date.now() < fastUntil || ticks % ticksPerForeground === 0) kick();
  };
  interval = setInterval(tick, SYNC_INTERVALS.groupScreen);
}

/** Telas de grupo pedem sync mais frequente (15 s) enquanto estão abertas. */
export function syncFastFor(ms: number): void {
  fastUntil = Date.now() + ms;
  void syncEngine.sync();
}

export function stopSync(): void {
  clearInterval(interval);
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (cb) => syncEngine.subscribe(cb),
    () => syncEngine.getState(),
  );
}
