import { Page } from '../components/Page';
import { useTheme, type ThemePreference } from '../lib/theme';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export default function Configuracoes() {
  const { preference, setPreference } = useTheme();
  return (
    <Page title="Ajustes">
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted">Tema da interface</h2>
        <div className="inline-flex rounded-lg border border-border p-1" role="radiogroup">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={preference === o.value}
              onClick={() => setPreference(o.value)}
              className={`min-h-11 rounded-md px-4 text-sm ${
                preference === o.value ? 'bg-accent text-accent-contrast' : 'text-muted'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>
    </Page>
  );
}
