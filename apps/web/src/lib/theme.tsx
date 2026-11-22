import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSettings } from './data';
import { updateSettings } from './settings';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'cifrasync:tema';

/** Cópia local do tema só para a primeira pintura, antes do banco carregar (sem piscar). */
function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // armazenamento indisponível (janela privada, preview): usa o padrão
  }
  return 'system';
}

function storeLocal(p: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, p);
  } catch {
    // ignora: o tema continua salvo nas configurações
  }
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, loaded } = useSettings();
  const [initial] = useState<ThemePreference>(readStored);
  const preference: ThemePreference = loaded ? settings.theme : initial;
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    storeLocal(preference);
  }, [resolved, preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference: (p) => {
        storeLocal(p);
        void updateSettings({ theme: p });
      },
    }),
    [preference, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme fora do ThemeProvider');
  return ctx;
}
