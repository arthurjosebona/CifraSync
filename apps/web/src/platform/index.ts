/**
 * Escolhe a implementação de plataforma em tempo de execução.
 * Desktop (Tauri) e Android (Capacitor) entram nas Fases 6 e 7 e são carregados sob demanda,
 * para que o bundle web não inclua código nativo.
 */
import type { Platform, PlatformKind } from './types';
import { webPlatform } from './web';

export type { Platform, PlatformKind, UpdateInfo } from './types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    Capacitor?: { isNativePlatform?: () => boolean };
  }
}

export function detectPlatform(): PlatformKind {
  if (typeof window === 'undefined') return 'web';
  if (window.__TAURI_INTERNALS__) return 'desktop';
  if (window.Capacitor?.isNativePlatform?.()) return 'android';
  return 'web';
}

let current: Platform = webPlatform;

/** Carrega a implementação nativa, se houver. Chamado uma vez na inicialização. */
export async function initPlatform(): Promise<Platform> {
  const kind = detectPlatform();
  if (kind === 'desktop') {
    current = (await import('./desktop')).desktopPlatform;
  } else if (kind === 'android') {
    current = (await import('./android')).androidPlatform;
  }
  return current;
}

export function platform(): Platform {
  return current;
}
