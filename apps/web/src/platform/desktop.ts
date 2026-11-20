import type { Platform } from './types';
import { webPlatform } from './web';

/** Implementação provisória: até a Fase 6 (Tauri), usa os recursos web do WebView. */
export const desktopPlatform: Platform = { ...webPlatform, kind: 'desktop' };
