import { AlertTriangle, CheckCircle2, CloudOff, LogIn, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';

import { syncEngine, useSyncState } from '../lib/sync';

function ago(iso: string | null): string {
  if (!iso) return 'nunca';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  return `há ${Math.round(s / 3600)} h`;
}

/** Estado da sincronização: sincronizado, sincronizando, pendentes (offline) ou erro. */
export function SyncIndicator({ compact = false }: { compact?: boolean }) {
  const s = useSyncState();

  if (s.status === 'signed-out') {
    return (
      <Link
        to="/entrar"
        className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted hover:bg-surface-2"
        title="Entre para sincronizar entre aparelhos"
      >
        <LogIn className="size-4" aria-hidden />
        {!compact && <span>Entrar para sincronizar</span>}
      </Link>
    );
  }

  const view = {
    idle: { icon: CheckCircle2, text: 'Sincronizado', cls: 'text-muted' },
    syncing: { icon: RefreshCw, text: 'Sincronizando…', cls: 'text-muted' },
    offline: {
      icon: CloudOff,
      text: s.pending ? `${s.pending} alteração(ões) pendente(s)` : 'Sem conexão',
      cls: 'text-muted',
    },
    error: { icon: AlertTriangle, text: 'Erro ao sincronizar', cls: 'text-danger' },
  }[s.status];
  const Icon = view.icon;
  const title =
    s.status === 'error'
      ? `${s.message} — toque para tentar de novo`
      : `${view.text}. Última sincronização: ${ago(s.lastSync)}. Toque para sincronizar agora.`;

  return (
    <button
      type="button"
      onClick={() => void syncEngine.sync()}
      className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface-2 ${view.cls}`}
      title={title}
      aria-label={title}
    >
      <Icon className={`size-4 ${s.status === 'syncing' ? 'animate-spin' : ''}`} aria-hidden />
      {!compact && <span className="truncate">{view.text}</span>}
    </button>
  );
}
