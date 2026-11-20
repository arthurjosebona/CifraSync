import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['source', 'module', 'node', 'development|production'] },
  test: { setupFiles: ['fake-indexeddb/auto'] },
});
