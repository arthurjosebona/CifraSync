import type { Platform } from './types';

let wakeLock: WakeLockSentinel | null = null;
let wantAwake = false;

async function acquire() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch {
    // sem suporte ou negado (ex.: economia de bateria): segue sem travar a tela
  }
}

// o navegador solta a trava quando a aba fica oculta; reabre ao voltar
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wantAwake && !wakeLock && document.visibilityState === 'visible') void acquire();
  });
}

const TOKEN_KEY = 'cifrasync:token';

export const webPlatform: Platform = {
  kind: 'web',
  async keepAwake(on) {
    wantAwake = on;
    if (on) await acquire();
    else {
      await wakeLock?.release().catch(() => undefined);
      wakeLock = null;
    }
  },
  async setFullscreen(on) {
    try {
      if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!on && document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // tela cheia pode ser recusada (iOS, iframes): o palco funciona mesmo assim
    }
  },
  isFullscreen: () => !!document.fullscreenElement,
  tokenStore: {
    async get() {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    },
    async set(token) {
      try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
      } catch {
        // armazenamento indisponível: a sessão vale só enquanto a página estiver aberta
      }
    },
  },
  async saveFile(name, data) {
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  openFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept.join(',');
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.oncancel = () => resolve(null);
      input.click();
    });
  },
  async checkForUpdate() {
    // na web o service worker cuida da atualização (UpdatePrompt)
    return null;
  },
};
