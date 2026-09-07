import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Fingerprint, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const passkeyStorageKey = 'rk-mines-passkey-id';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

function canUsePasskeys(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function';
}

async function registerPasskey(): Promise<void> {
  if (!canUsePasskeys()) throw new Error('Fingerprint login is not supported on this device.');
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'RK Mines Diesel Ledger', id: window.location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: 'rk-mines-user',
        displayName: 'RK Mines user',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none',
    },
  });
  if (!(credential instanceof PublicKeyCredential)) throw new Error('Fingerprint setup was cancelled.');
  localStorage.setItem(passkeyStorageKey, credential.id);
}

async function verifyPasskey(): Promise<void> {
  const credentialId = localStorage.getItem(passkeyStorageKey);
  if (!credentialId || !canUsePasskeys()) throw new Error('Fingerprint login is not available.');
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: window.location.hostname,
      allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId) }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  if (!(credential instanceof PublicKeyCredential) || credential.id !== credentialId) {
    throw new Error('Fingerprint verification failed.');
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(() => typeof window !== 'undefined' && Boolean(localStorage.getItem(passkeyStorageKey)));
  const [passkeyLocked, setPasskeyLocked] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const storedPasskey = localStorage.getItem(passkeyStorageKey);
      if (data.session && storedPasskey) {
        setPasskeyLocked(true);
        setSignedIn(false);
      } else {
        setSignedIn(Boolean(data.session));
      }
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') setSignedIn(false);
      if (event === 'SIGNED_IN' && !localStorage.getItem(passkeyStorageKey)) setSignedIn(true);
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
    else {
      setSignedIn(true);
      setPasskeyLocked(false);
      if (mode === 'sign-up') setMessage('Account created. Check your email if confirmation is enabled.');
    }
  };

  const unlockWithFingerprint = async () => {
    setPasskeyBusy(true);
    setMessage('');
    try {
      await verifyPasskey();
      setPasskeyLocked(false);
      setSignedIn(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Fingerprint verification failed.');
    } finally {
      setPasskeyBusy(false);
    }
  };

  const setupFingerprint = async () => {
    setPasskeyBusy(true);
    setMessage('');
    try {
      await registerPasskey();
      setPasskeyEnabled(true);
      setSetupDismissed(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Fingerprint setup failed.');
    } finally {
      setPasskeyBusy(false);
    }
  };

  if (!ready) return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Loading secure session...</div>;
  if (signedIn) return (
    <>
      {!passkeyEnabled && !setupDismissed && (
        <aside className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-card p-3 text-xs shadow-lg sm:left-auto sm:max-w-md">
          <span className="flex items-center gap-2"><Fingerprint size={18} className="shrink-0 text-primary" />Enable fingerprint unlock on this device?</span>
          <span className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setSetupDismissed(true)} className="font-semibold text-muted-foreground">Later</button>
            <button type="button" onClick={setupFingerprint} disabled={passkeyBusy} className="rounded-md bg-primary px-2.5 py-1.5 font-bold text-primary-foreground disabled:opacity-60">{passkeyBusy ? 'Setting up...' : 'Enable'}</button>
          </span>
        </aside>
      )}
      {children}
    </>
  );

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-[0_12px_35px_rgba(40,53,58,.08)]">
        <div className="mb-6 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><ShieldCheck size={20} /></span><div><h1 className="font-extrabold">RK Mines Fuel Ledger</h1><p className="text-xs text-muted-foreground">Secure register access</p></div></div>
        {passkeyLocked && (
          <div className="mb-5 rounded-xl border border-primary/25 bg-primary/5 p-4 text-center">
            <Fingerprint className="mx-auto mb-2 text-primary" size={28} />
            <p className="text-sm font-bold">Unlock with fingerprint</p>
            <p className="mt-1 text-xs text-muted-foreground">Use your phone fingerprint, PIN, or screen lock.</p>
            <button type="button" onClick={unlockWithFingerprint} disabled={passkeyBusy} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-60"><Fingerprint size={16} />{passkeyBusy ? 'Checking...' : 'Unlock'}</button>
            <button type="button" onClick={() => { setPasskeyLocked(false); setMessage(''); }} className="mt-3 text-xs font-bold text-muted-foreground hover:text-foreground">Use password instead</button>
          </div>
        )}
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
