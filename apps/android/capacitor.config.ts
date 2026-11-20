import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cifrasync.app',
  appName: 'CifraSync',
  // build da SPA no modo nativo (sem service worker): pnpm --filter @cifrasync/web build:native
  webDir: '../web/dist',
  android: {
    // https://localhost: origem segura (IndexedDB persistente, APIs modernas) e liberada no CORS da API
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: { overlaysWebView: false },
  },
};

export default config;
