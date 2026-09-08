import { LayoutDashboard, CircleHelp, Activity, Cloud, CloudOff, RefreshCw, Menu, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, Sliders } from 'lucide-react';
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
  const [collapsed, setCollapsed] = useState(true);
  const role = useAppRole();
  const homeHref = role === 'commander' ? '/controlpanal' : '/Fuelentry';
  const nav = role === 'commander'
    ? [
      { href: '/controlpanal', label: 'Control panel', icon: SlidersHorizontal, testId: 'link-control-panel' },
      { href: '/Fuelentry', label: 'Fuel register', icon: LayoutDashboard, testId: 'link-fuel-entry' },
      { href: '/dropdowns', label: 'Dropdowns', icon: Sliders, testId: 'link-dropdowns' },
    ]
    : [{ href: '/Fuelentry', label: 'Fuel register', icon: LayoutDashboard, testId: 'link-fuel-entry' }];

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
    <div className="noise flex min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col bg-sidebar text-sidebar-foreground shadow-[3px_0_18px_rgba(29,43,49,.12)] transition-[width,transform] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${collapsed ? 'w-[76px] -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'}`}>
        <div className={`flex h-[4.4rem] items-center border-b border-sidebar-border/50 ${collapsed ? 'justify-center' : 'justify-between px-4'}`}>
          <Link href={homeHref} className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary shadow-[3px_3px_0_hsl(34_84%_30%)]"><img src="/logo.png" alt="Rajsthan M&M" className="size-full object-contain" /></span>
            {!collapsed && <span className="leading-none"><span className="block text-[13px] font-extrabold tracking-[.18em]">RAJSTHAN M&M</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[.21em] text-sidebar-foreground/55">Diesel ledger</span></span>}
          </Link>
          {!collapsed && <button type="button" onClick={() => setCollapsed(true)} className="grid size-8 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" title="Collapse sidebar" aria-label="Collapse sidebar"><PanelLeftClose size={17} /></button>}
        </div>
        {collapsed && <button type="button" onClick={() => setCollapsed(false)} className="mx-auto mt-4 grid size-9 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" title="Expand sidebar" aria-label="Expand sidebar"><PanelLeftOpen size={17} /></button>}
        <nav className={`mt-5 flex flex-col gap-1 ${collapsed ? 'px-2' : 'px-3'}`} aria-label="Primary navigation">
          {nav.map(({ href, label, icon: Icon, testId }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg py-3 text-xs font-bold transition-colors ${collapsed ? 'justify-center px-2' : 'px-3'} ${location === href ? 'bg-sidebar-accent text-primary' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} title={collapsed ? label : undefined} data-testid={testId}><Icon size={17} />{!collapsed && label}</Link>)}
        </nav>
        <div className={`mt-auto border-t border-sidebar-border/50 py-4 ${collapsed ? 'px-2' : 'px-4'}`}>
          <div className={`flex items-center gap-2 text-sidebar-foreground/60 ${collapsed ? 'justify-center' : ''}`} title={online ? 'Online' : 'Offline'}>{online ? <Cloud size={15} className="text-emerald-300" /> : <CloudOff size={15} className="text-primary" />}{!collapsed && <span className="text-[10px] font-semibold uppercase tracking-[.14em]">{online ? 'Online' : 'Offline'}</span>}<span className="ml-auto size-2 rounded-full bg-emerald-400" data-testid="status-site-active" /></div>
          <button type="button" onClick={() => void syncNow()} disabled={!online || syncing} className={`mt-3 flex items-center gap-2 rounded-lg text-[10px] font-bold text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-40 ${collapsed ? 'mx-auto size-9 justify-center' : 'w-full px-3 py-2'}`} title={online ? 'Sync pending records' : 'Waiting for connection'} aria-label="Sync pending records" data-testid="button-sync-now"><RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />{!collapsed && <>{online ? 'Sync now' : 'Offline'} {pendingCount > 0 && `(${pendingCount})`}</>}</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-[4.4rem] items-center justify-between border-b border-border/70 bg-card px-4 shadow-sm md:hidden">
          <Link href={homeHref} className="flex items-center gap-2"><span className="grid size-8 place-items-center overflow-hidden rounded-full bg-primary"><img src="/logo.png" alt="Rajsthan M&M" className="size-full object-contain" /></span><span className="text-xs font-extrabold tracking-[.14em]">RAJSTHAN M&M</span></Link>
          <button type="button" onClick={() => setCollapsed(false)} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted" title="Open navigation" aria-label="Open navigation"><Menu size={19} /></button>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-6 sm:px-7 sm:pt-8">{children}</main>
        <footer className="mx-auto flex max-w-[1500px] items-center justify-between px-4 pb-7 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground/65 sm:px-7"><span>RAJSTHAN M&M</span><span className="flex items-center gap-1.5"><CircleHelp size={12} /> Internal register</span></footer>
      </div>
    </div>
  );
}