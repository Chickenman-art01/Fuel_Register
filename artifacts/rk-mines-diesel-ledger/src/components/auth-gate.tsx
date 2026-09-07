import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { LogIn, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === 'sign-up') setMessage('Account created. Check your email if confirmation is enabled.');
  };

  if (!ready) return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Loading secure session...</div>;
  if (signedIn) return <>{children}</>;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-[0_12px_35px_rgba(40,53,58,.08)]">
        <div className="mb-6 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><ShieldCheck size={20} /></span><div><h1 className="font-extrabold">RK Mines Fuel Ledger</h1><p className="text-xs text-muted-foreground">Secure register access</p></div></div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary" /></label>
          <label className="block text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary" /></label>
          {message && <p className="text-xs text-destructive">{message}</p>}
          <button type="submit" disabled={busy} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-60"><LogIn size={15} />{busy ? 'Working...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage(''); }} className="mt-4 flex w-full items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"><Mail size={13} />{mode === 'sign-in' ? 'Create a new account' : 'Already have an account? Sign in'}</button>
      </section>
    </main>
  );
}
