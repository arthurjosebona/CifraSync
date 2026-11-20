import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // o app pergunta antes de recarregar com a versão nova (nunca no meio do palco)
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'CifraSync',
        short_name: 'CifraSync',
        description: 'Cifras, repertórios e teleprompter de palco — offline e sincronizado.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#111111',
        theme_color: '#111111',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,json}'],
        navigateFallback: '/index.html',
        // a API nunca é servida do cache: o sync cuida dos dados offline
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    // pacotes do monorepo são consumidos pelo código-fonte (condição "source")
    conditions: ['source', 'module', 'browser', 'development|production'],
  },
  ssr: {
    // testes do servidor (Vitest em Node) também usam o código-fonte dos pacotes
    resolve: { conditions: ['source', 'module', 'node', 'development|production'] },
  },
  server: {
    // API local (pnpm dev:api) na porta 8787
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    // os testes e2e (Playwright) ficam em e2e/ e não rodam no Vitest
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    // testes do servidor criam banco (PGlite) e fazem hash de senha: mais tempo que o padrão
    testTimeout: 30_000,
  },
});
