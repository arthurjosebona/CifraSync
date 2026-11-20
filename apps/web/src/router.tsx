import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';

import { AppShell } from './components/AppShell';

function page(load: () => Promise<{ default: ComponentType }>) {
  const C = lazy(load);
  return (
    <Suspense fallback={<div className="p-8 text-muted">Carregando…</div>}>
      <C />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: page(() => import('./routes/Biblioteca')) },
      { path: 'musicas/nova', element: page(() => import('./routes/Editor')) },
      { path: 'musicas/:id', element: page(() => import('./routes/Musica')) },
      { path: 'musicas/:id/editar', element: page(() => import('./routes/Editor')) },
      { path: 'repertorios', element: page(() => import('./routes/Repertorios')) },
      { path: 'repertorios/:id', element: page(() => import('./routes/Repertorio')) },
      { path: 'grupos', element: page(() => import('./routes/Grupos')) },
      { path: 'grupos/:id', element: page(() => import('./routes/Grupo')) },
      { path: 'dicionario', element: page(() => import('./routes/Dicionario')) },
      { path: 'configuracoes', element: page(() => import('./routes/Configuracoes')) },
      { path: 'entrar', element: page(() => import('./routes/Login')) },
      { path: '*', element: page(() => import('./routes/NaoEncontrado')) },
    ],
  },
  // o palco fica fora do layout: tela cheia, sem navegação
  { path: 'palco/musica/:id', element: page(() => import('./routes/Palco')) },
  { path: 'palco/repertorio/:id', element: page(() => import('./routes/Palco')) },
]);
