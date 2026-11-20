import type { Platform } from './types';
import { webPlatform } from './web';

/** Implementação provisória: até a Fase 7 (Capacitor), usa os recursos web do WebView. */
export const androidPlatform: Platform = { ...webPlatform, kind: 'android' };
