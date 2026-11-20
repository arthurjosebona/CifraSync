import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // pacotes do monorepo são consumidos pelo código-fonte (condição "source")
    conditions: ['source', 'module', 'browser', 'development|production'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
