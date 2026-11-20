/**
 * Plataforma Android (Capacitor): tela ligada pelo plugin keep-awake, modo imersivo pela
 * barra de status, orientação, token nas preferências, arquivos via compartilhamento e aviso
 * de versão nova consultando a última release no GitHub.
 */
import { KeepAwake } from '@capacitor-community/keep-awake';
import { App } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Share } from '@capacitor/share';
import { StatusBar } from '@capacitor/status-bar';

import type { Platform } from './types';
import { webPlatform } from './web';

const RELEASES_API = 'https://api.github.com/repos/arthurjosebona/CifraSync/releases/latest';
const TOKEN_KEY = 'cifrasync.token';

let immersive = false;

/** Compara versões semânticas simples (1.2.10 > 1.2.9). */
export function isNewer(latest: string, current: string): boolean {
  const a = latest.replace(/^v/, '').split('.').map(Number);
  const b = current.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export const androidPlatform: Platform = {
  kind: 'android',
  async keepAwake(on) {
    try {
      if (on) await KeepAwake.keepAwake();
      else await KeepAwake.allowSleep();
    } catch {
      // sem suporte: o palco funciona, só sem impedir o descanso de tela
    }
  },
  async setFullscreen(on) {
    try {
      if (on) await StatusBar.hide();
      else await StatusBar.show();
      immersive = on;
    } catch {
      immersive = false;
    }
  },
  isFullscreen: () => immersive,
  async lockOrientation(o) {
    if (o === 'any') await ScreenOrientation.unlock();
    else await ScreenOrientation.lock({ orientation: o });
  },
  tokenStore: {
    async get() {
      return (await Preferences.get({ key: TOKEN_KEY })).value;
    },
    async set(token) {
      if (token) await Preferences.set({ key: TOKEN_KEY, value: token });
      else await Preferences.remove({ key: TOKEN_KEY });
    },
  },
  async saveFile(name, data) {
    // grava no cache e abre o compartilhamento (salvar no Drive, enviar por mensagem etc.)
    const isText = /\.(txt|cho|json|md)$/i.test(name);
    const written = await Filesystem.writeFile({
      path: name,
      directory: Directory.Cache,
      data: isText ? await data.text() : await blobToBase64(data),
      ...(isText ? { encoding: Encoding.UTF8 } : {}),
    });
    await Share.share({ title: name, url: written.uri, dialogTitle: 'Salvar ou enviar' });
  },
  openFile: (accept) => webPlatform.openFile(accept),
  async checkForUpdate() {
    try {
      const [{ version }, res] = await Promise.all([App.getInfo(), fetch(RELEASES_API)]);
      if (!res.ok) return null;
      const release = (await res.json()) as {
        tag_name: string;
        body?: string;
        html_url: string;
        assets?: { name: string; browser_download_url: string }[];
      };
      if (!isNewer(release.tag_name, version)) return null;
      const apk = release.assets?.find((a) => a.name.endsWith('.apk'));
      return {
        version: release.tag_name.replace(/^v/, ''),
        ...(release.body ? { notes: release.body } : {}),
        url: apk?.browser_download_url ?? release.html_url,
      };
    } catch {
      return null;
    }
  },
};

/** Botão "voltar" do Android: volta na navegação; na tela inicial, fecha o app. */
export function setupAndroid(): void {
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.exitApp();
  });
}
