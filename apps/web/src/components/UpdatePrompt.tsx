import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Avisa quando há versão nova do app e quando ele está pronto para uso offline.
 * Nunca recarrega sozinho: o músico pode estar no meio de uma música.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm shadow-lg md:bottom-4"
    >
      <span className="flex-1">
        {needRefresh ? 'Há uma versão nova do CifraSync.' : 'Pronto para usar sem internet.'}
      </span>
      {needRefresh && (
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="min-h-10 rounded-lg bg-accent px-3 font-medium text-accent-contrast"
        >
          Atualizar
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
        className="min-h-10 rounded-lg px-3 text-muted"
      >
        Fechar
      </button>
    </div>
  );
}
