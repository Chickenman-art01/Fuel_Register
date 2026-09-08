import { useState, useRef, useEffect } from 'react';
import { LogOut, ShieldCheck, UserCheck, ChevronDown, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/auth-gate';
import { Link } from 'wouter';

export function ProfileCorner() {
  const { user, role, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = user?.email || (role === 'commander' ? 'commander@rajsthan.com' : 'operator@rajsthan.com');
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0];

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const parts = user.user_metadata.full_name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      return prefix.slice(0, 2).toUpperCase();
    }
    return role === 'commander' ? 'CM' : 'OP';
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
      setSigningOut(false);
    }
  };

  const isCommander = role === 'commander';

  return (
    <div className="relative flex items-center gap-2 sm:gap-3" ref={menuRef}>
      {/* Profile summary trigger */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="group flex items-center gap-2.5 rounded-full border border-border/80 bg-background/80 py-1 pl-1 pr-2.5 shadow-sm transition hover:border-border hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        title="View profile & account details"
        data-testid="button-profile-menu"
      >
        <div
          className={`grid size-8 place-items-center rounded-full text-xs font-black shadow-inner border transition ${
            isCommander
              ? 'bg-amber-500/15 text-amber-700 border-amber-500/30 group-hover:bg-amber-500/25'
              : 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 group-hover:bg-emerald-500/25'
          }`}
        >
          {getInitials()}
        </div>

        <div className="hidden flex-col text-left sm:flex">
          <span className="max-w-[130px] truncate text-xs font-bold leading-tight text-foreground">
            {displayName}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">
            {role}
          </span>
        </div>

        <span
          className={`hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold md:inline-flex ${
            isCommander
              ? 'bg-amber-500/15 text-amber-700'
              : 'bg-emerald-500/15 text-emerald-700'
          }`}
        >
          {isCommander ? <ShieldCheck size={11} /> : <UserCheck size={11} />}
          {isCommander ? 'Commander' : 'Operator'}
        </span>

        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${
            dropdownOpen ? 'rotate-180 text-foreground' : ''
          }`}
        />
      </button>

      {/* Direct Logout Button in Corner */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={signingOut}
        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/90 bg-rose-50/80 px-2.5 py-1.5 text-xs font-bold text-rose-700 shadow-sm transition-all hover:bg-rose-600 hover:text-white disabled:opacity-60 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
        title="Log out of Rajsthan M&M"
        data-testid="button-logout"
      >
        <LogOut size={14} className={signingOut ? 'animate-spin' : ''} />
        <span className="hidden xs:inline sm:inline">
          {signingOut ? 'Logging out...' : 'Logout'}
        </span>
      </button>

      {/* Dropdown Profile Card */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border border-border bg-card p-4 shadow-2xl animate-rise"
          role="menu"
          data-testid="profile-dropdown-card"
        >
          {/* User Header */}
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <div
              className={`grid size-11 place-items-center rounded-2xl text-sm font-black border ${
                isCommander
                  ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
              }`}
            >
              {getInitials()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-extrabold text-foreground">
                  {displayName}
                </span>
              </div>
              <p className="truncate font-mono text-[11px] text-muted-foreground" title={email}>
                {email}
              </p>
              <div className="mt-1 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-600">Active session</span>
              </div>
            </div>
          </div>

          {/* Role and Permissions Info */}
          <div className="mt-3 rounded-xl bg-muted/50 p-2.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Access Role</span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold ${
                  isCommander
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {isCommander ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                {isCommander ? 'Commander' : 'Operator'}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
              {isCommander
                ? 'Full system privileges: Fleet configuration, user control, master dropdowns, and diesel ledger.'
                : 'Operational access: Fuel dispensing entries and vehicle diesel register logs.'}
            </p>
          </div>

          {/* Quick links */}
          <div className="mt-3 space-y-1 text-xs">
            {isCommander ? (
              <>
                <Link
                  href="/controlpanal"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-foreground transition hover:bg-muted"
                >
                  <ShieldCheck size={14} className="text-primary" />
                  Control panel
                </Link>
                <Link
                  href="/vehicles"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-foreground transition hover:bg-muted"
                >
                  <User size={14} className="text-primary" />
                  Fleet & Vehicles
                </Link>
              </>
            ) : (
              <Link
                href="/Fuelentry"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-foreground transition hover:bg-muted"
              >
                <CheckCircle2 size={14} className="text-primary" />
                Fuel Register
              </Link>
            )}
          </div>

          {/* Sign out button inside dropdown */}
          <div className="mt-3 border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
              data-testid="button-dropdown-logout"
            >
              <LogOut size={14} className={signingOut ? 'animate-spin' : ''} />
              {signingOut ? 'Logging out...' : 'Sign out of system'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
