import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { ensureIdentity } from '@cifrasync/sync';

import { UpdatePrompt } from './components/UpdatePrompt';
import { db } from './lib/data';
import { ThemeProvider } from './lib/theme';
import { initPlatform } from './platform';
import { router } from './router';
import './styles.css';

// Pede ao navegador para não apagar o banco local sob pressão de espaço (dados offline).
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  void navigator.storage.persist().catch(() => undefined);
}

void initPlatform();
// ids do aparelho e do usuário local precisam existir antes das consultas reativas
void ensureIdentity(db);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </ThemeProvider>
  </StrictMode>,
);
