import { DatabaseBackup, FolderInput } from 'lucide-react';
import { useState } from 'react';

import { useMyId } from '../lib/groups';
import { exportBackup, restoreBackup } from '../lib/transfer';
import { platform } from '../platform';
import { Button } from './ui';

export function BackupSection() {
  const myId = useMyId();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-1 text-sm font-semibold text-muted">Backup</h2>
      <p className="mb-3 text-sm text-muted">
        Um arquivo com todas as suas músicas e repertórios deste aparelho. Restaurar cria cópias —
        nada é apagado.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void exportBackup(myId)}>
          <DatabaseBackup className="size-4" aria-hidden />
          Exportar backup (.json)
        </Button>
        <Button
          onClick={async () => {
            const file = await platform().openFile(['.json']);
            if (!file) return;
            try {
              const r = await restoreBackup(file);
              setMessage(`Restaurado: ${r.songs} música(s) e ${r.setlists} repertório(s).`);
            } catch (e) {
              setMessage(e instanceof Error ? e.message : 'Não foi possível restaurar.');
            }
          }}
        >
          <FolderInput className="size-4" aria-hidden />
          Restaurar backup
        </Button>
      </div>
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
