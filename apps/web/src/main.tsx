import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { UpdatePrompt } from './components/UpdatePrompt';
import { ThemeProvider } from './lib/theme';
import { router } from './router';
import './styles.css';

// Pede ao navegador para não apagar o banco local sob pressão de espaço (dados offline).
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  void navigator.storage.persist().catch(() => undefined);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </ThemeProvider>
  </StrictMode>,
);
