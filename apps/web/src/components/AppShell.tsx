import { BookOpen, Guitar, ListMusic, Settings, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

import { SyncIndicator } from './SyncIndicator';

const NAV = [
  { to: '/', label: 'Músicas', icon: BookOpen, end: true },
  { to: '/repertorios', label: 'Repertórios', icon: ListMusic, end: false },
  { to: '/grupos', label: 'Grupos', icon: Users, end: false },
  { to: '/dicionario', label: 'Acordes', icon: Guitar, end: false },
  { to: '/configuracoes', label: 'Ajustes', icon: Settings, end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-surface-2 text-accent' : 'text-muted hover:bg-surface-2 hover:text-text',
  ].join(' ');

const tabClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium',
    isActive ? 'text-accent' : 'text-muted',
  ].join(' ');

export function AppShell() {
  return (
    <div className="flex h-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-3">
          <img src="/icon.svg" alt="" className="size-7 rounded-md" />
          <span className="text-lg font-semibold tracking-tight">CifraSync</span>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Principal">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <SyncIndicator />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="fixed top-[env(safe-area-inset-top)] right-2 z-20 md:hidden">
          <SyncIndicator compact />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label="Principal"
        >
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={tabClass}>
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
