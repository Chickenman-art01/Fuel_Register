import { useEffect, useState, type FormEvent } from 'react';
import { RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import {
  createManagedUser,
  deleteManagedUser,
  listManagedUsers,
  type ManagedUser,
  updateManagedUser,
} from '@/lib/commander-users';

type UserRole = 'commander' | 'operator';

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    try {
      setUsers(await listManagedUsers());
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load users.');
    }
  };

  useEffect(() => { void loadUsers(); }, []);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await createManagedUser({ email, password, role });
      setEmail('');
      setPassword('');
      setRole('operator');
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create user.');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (user: ManagedUser, nextRole: UserRole) => {
    setBusy(true);
    try {
      await updateManagedUser(user.id, nextRole);
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update role.');
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (user: ManagedUser) => {
    if (!window.confirm(`Remove ${user.email}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteManagedUser(user.id);
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not remove user.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-card-border bg-card shadow-[0_7px_22px_rgba(40,53,58,.045)]" data-testid="panel-user-management">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-4 sm:px-5">
        <div><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary"><Users size={15} /></span><h2 className="font-extrabold">User access</h2></div></div>
        <button type="button" onClick={() => void loadUsers()} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" title="Refresh users" aria-label="Refresh users"><RefreshCw size={15} /></button>
      </div>
      <form onSubmit={createUser} className="grid gap-3 border-b border-border/70 p-4 sm:grid-cols-[1.2fr_1fr_auto_auto] sm:items-end sm:px-5">
        <label className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal normal-case tracking-normal outline-none focus:border-primary" placeholder="operator@example.com" /></label>
        <label className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Temporary password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal normal-case tracking-normal outline-none focus:border-primary" /></label>
        <label className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-2 text-xs font-normal normal-case tracking-normal outline-none focus:border-primary"><option value="operator">Fuel operator</option><option value="commander">Commander</option></select></label>
        <button type="submit" disabled={busy} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-60"><UserPlus size={14} />Create user</button>
      </form>
      {message && <p className="border-b border-border/70 px-4 py-3 text-xs font-semibold text-destructive sm:px-5">{message}</p>}
      <div className="divide-y divide-border/60">
        {users.map((user) => <div key={user.id} className="flex items-center gap-3 px-4 py-3 sm:px-5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><ShieldCheck size={16} /></span><span className="min-w-0 flex-1 truncate text-xs font-medium">{user.email}</span><select value={user.role} disabled={busy} onChange={(event) => void changeRole(user, event.target.value as UserRole)} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="operator">Operator</option><option value="commander">Commander</option></select><button type="button" disabled={busy} onClick={() => void removeUser(user)} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40" title="Remove user" aria-label={`Remove ${user.email}`}><Trash2 size={14} /></button></div>)}
        {users.length === 0 && <p className="px-4 py-5 text-xs text-muted-foreground sm:px-5">No users found.</p>}
      </div>
    </section>
  );
}
