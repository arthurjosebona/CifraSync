/**
 * Recursos nativos usados pela UI, com uma implementação por plataforma (ADR 0001).
 * A UI nunca chama APIs nativas diretamente: sempre por aqui.
 */
export type PlatformKind = 'web' | 'desktop' | 'android';

export interface UpdateInfo {
  version: string;
  notes?: string;
  /** Página ou arquivo para baixar (Android) — o desktop instala sozinho. */
  url?: string;
  install?: () => Promise<void>;
}

export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string | null): Promise<void>;
}

export interface Platform {
  kind: PlatformKind;
  /** Mantém a tela ligada (modo palco). */
  keepAwake(on: boolean): Promise<void>;
  setFullscreen(on: boolean): Promise<void>;
  isFullscreen(): boolean;
  lockOrientation?(o: 'portrait' | 'landscape' | 'any'): Promise<void>;
  /** Token de sessão (desktop/Android); na web a sessão usa cookie. */
  tokenStore: TokenStore;
  saveFile(name: string, data: Blob): Promise<void>;
  openFile(accept: string[]): Promise<File | null>;
  checkForUpdate(): Promise<UpdateInfo | null>;
}
