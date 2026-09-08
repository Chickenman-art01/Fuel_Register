import { LayoutDashboard, Truck, CircleHelp, Activity, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncOfflineQueue } from '@/lib/offline-api';
import { getOfflineQueueCount } from '@/lib/offline-store';
import { useAppRole } from '@/components/auth-gate';

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const role = useAppRole();
  const nav = role === 'commander'
    ? [
      { href: '/Fuelentry', label: 'Fuel entry', icon: LayoutDashboard, testId: 'link-fuel-entry' },
      { href: '/controlpanal', label: 'Control panel', icon: Truck, testId: 'link-control-panel' },
    ]
    : [{ href: '/Fuelentry', label: 'Fuel entry', icon: LayoutDashboard, testId: 'link-fuel-entry' }];

  const refreshPendingCount = () => { getOfflineQueueCount().then(setPendingCount).catch(() => undefined); };
  const syncNow = async () => {
    if ((typeof navigator !== 'undefined' && !navigator.onLine) || syncing) return;
    setSyncing(true);
    try {
      await syncOfflineQueue();
      await queryClient.invalidateQueries();
    } finally {
      refreshPendingCount();
      setSyncing(false);
    }
  };

  useEffect(() => {
    refreshPendingCount();
    const handleOnline = () => { setOnline(true); void syncNow(); };
    const handleOffline = () => setOnline(false);
    const handleQueueChange = () => refreshPendingCount();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChange);
    window.addEventListener('offline-sync-complete', handleQueueChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
      window.removeEventListener('offline-sync-complete', handleQueueChange);
    };
  }, []);

  return (
    <div className="noise min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 border-b border-sidebar-border/50 bg-sidebar text-sidebar-foreground shadow-[0_3px_18px_rgba(29,43,49,.12)]">
        <div className="mx-auto flex h-[4.4rem] max-w-[1500px] items-center justify-between px-4 sm:px-7">
          <Link href="/Fuelentry" className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-primary shadow-[3px_3px_0_hsl(34_84%_30%)]">
              <img src="/logo.png" alt="RK Mines" className="size-full object-contain" />
            </span>
            <span className="leading-none">
              <span className="block text-[13px] font-extrabold tracking-[.18em] text-sidebar-foreground">RK MINES</span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[.21em] text-sidebar-foreground/55">Diesel ledger</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary navigation">
            {nav.map(({ href, label, icon: Icon, testId }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${active ? 'bg-sidebar-accent text-primary' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}
                  data-testid={testId}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 text-sidebar-foreground/60">
            {online ? <Cloud size={15} className="text-emerald-300" /> : <CloudOff size={15} className="text-primary" />}
            <span className="hidden text-[11px] font-semibold uppercase tracking-[.14em] sm:inline">{online ? 'Online' : 'Offline'}</span>
            {pendingCount > 0 && <span className="font-mono text-[10px] font-bold text-primary" data-testid="text-pending-sync">{pendingCount} pending</span>}
            <button type="button" onClick={() => void syncNow()} disabled={!online || syncing} className="grid size-7 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-40" title={online ? 'Sync pending records' : 'Waiting for connection'} aria-label="Sync pending records" data-testid="button-sync-now"><RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /></button>
            <Activity size={15} className="hidden text-primary sm:block" />
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,.13)]" data-testid="status-site-active" />
          </div>
        </div>
        <nav className="flex border-t border-sidebar-border/50 px-3 py-2 sm:hidden" aria-label="Mobile navigation">
          {nav.map(({ href, label, icon: Icon, testId }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-bold ${location === href ? 'bg-sidebar-accent text-primary' : 'text-sidebar-foreground/60'}`}
              data-testid={`${testId}-mobile`}
            >
              <Icon size={14} /> {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-6 sm:px-7 sm:pt-8">{children}</main>
      <footer className="mx-auto flex max-w-[1500px] items-center justify-between px-4 pb-7 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground/65 sm:px-7">
        <span>RK Mines / Daily control</span>
        <span className="flex items-center gap-1.5"><CircleHelp size={12} /> Internal register</span>
      </footer>
    </div>
  );
}