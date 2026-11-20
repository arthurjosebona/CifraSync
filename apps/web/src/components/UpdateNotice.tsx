import { useEffect, useState } from 'react';

import { detectPlatform, platform, type UpdateInfo } from '../platform';

/**
 * Apps nativos: avisa quando há versão nova. No desktop instala e reinicia; no Android abre o
 * APK da última release. Nunca interrompe sozinho (o músico pode estar no palco).
 */
export function UpdateNotice() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (detectPlatform() === 'web') return;
    // espera a plataforma nativa carregar e checa uma vez por abertura
    const t = setTimeout(() => {
      void platform()
        .checkForUpdate()
        .then(setUpdate)
        .catch(() => undefined);
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  if (!update) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm shadow-lg md:bottom-4"
    >
      <span className="flex-1">Versão {update.version} disponível.</span>
      <button
        type="button"
        disabled={busy}
        className="min-h-10 rounded-lg bg-accent px-3 font-medium text-accent-contrast"
        onClick={async () => {
          if (update.install) {
            setBusy(true);
            await update.install();
          } else if (update.url) {
            window.location.href = update.url;
          }
        }}
      >
        {busy ? 'Atualizando…' : update.install ? 'Atualizar e reiniciar' : 'Baixar'}
      </button>
      <button type="button" className="min-h-10 px-2 text-muted" onClick={() => setUpdate(null)}>
        Depois
      </button>
    </div>
  );
}
