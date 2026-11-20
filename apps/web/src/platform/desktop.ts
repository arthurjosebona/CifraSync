/**
 * Plataforma desktop (Tauri 2): tela ligada pela crate keepawake, tela cheia da janela,
 * token no plugin store, arquivos pelos diálogos nativos e atualização pelo plugin updater.
 */
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { relaunch } from '@tauri-apps/plugin-process';
import { load, type Store } from '@tauri-apps/plugin-store';
import { check } from '@tauri-apps/plugin-updater';

import type { Platform } from './types';

let fullscreen = false;
let store: Promise<Store> | null = null;
const getStore = () => (store ??= load('sessao.json', { autoSave: true, defaults: {} }));

export const desktopPlatform: Platform = {
  kind: 'desktop',
  async keepAwake(on) {
    try {
      await invoke('keep_awake', { on });
    } catch {
      // sem suporte no sistema: o palco funciona, só sem impedir o descanso de tela
    }
  },
  async setFullscreen(on) {
    await getCurrentWindow().setFullscreen(on);
    fullscreen = on;
  },
  isFullscreen: () => fullscreen,
  tokenStore: {
    async get() {
      return (await (await getStore()).get<string>('token')) ?? null;
    },
    async set(token) {
      const s = await getStore();
      if (token) await s.set('token', token);
      else await s.delete('token');
    },
  },
  async saveFile(name, data) {
    const ext = name.split('.').pop() ?? '';
    const path = await save({
      defaultPath: name,
      filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [],
    });
    if (!path) return;
    await writeFile(path, new Uint8Array(await data.arrayBuffer()));
  },
  async openFile(accept) {
    const extensions = accept.map((a) => a.replace(/^\./, ''));
    const path = await open({ multiple: false, filters: [{ name: 'Arquivos', extensions }] });
    if (!path || Array.isArray(path)) return null;
    const bytes = await readFile(path);
    const name = path.split(/[\\/]/).pop() ?? 'arquivo';
    return new File([bytes], name);
  },
  async checkForUpdate() {
    try {
      const update = await check();
      if (!update) return null;
      return {
        version: update.version,
        ...(update.body ? { notes: update.body } : {}),
        install: async () => {
          await update.downloadAndInstall();
          await relaunch();
        },
      };
    } catch {
      return null;
    }
  },
};
