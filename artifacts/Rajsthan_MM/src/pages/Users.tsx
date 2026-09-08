import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { UserEntryForm } from "@/farms";
import {
  deleteManagedUser,
  listManagedUsers,
  type ManagedUser,
  updateManagedUser,
} from "@/lib/commander-users";

type UserRole = "commander" | "operator";

export default function Users() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    try {
      setUsers(await listManagedUsers());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load users.");
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const changeRole = async (user: ManagedUser, nextRole: UserRole) => {
    setBusy(true);
    try {
      await updateManagedUser(user.id, nextRole);
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update role.");
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
      setMessage(error instanceof Error ? error.message : "Could not remove user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="animate-rise">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Users</h1>
          </div>
          <div
            className="rounded-xl border border-card-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground"
            data-testid="text-user-count"
          >
            <span className="font-bold text-foreground">{users.length.toString().padStart(2, "0")}</span> system users
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive">
            {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(310px,370px)_1fr]">
          <UserEntryForm onSuccess={loadUsers} />

          <section
            className="min-w-0 rounded-2xl border border-card-border bg-card shadow-[0_7px_22px_rgba(40,53,58,.045)]"
            data-testid="panel-users-list"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-4 sm:px-5">
              <div>
                <h2 className="font-extrabold">Active accounts</h2>
              </div>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                title="Refresh users"
                aria-label="Refresh users"
                data-testid="button-refresh-users"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            <div className="divide-y divide-border/60">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5" data-testid={`card-user-${user.id}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <ShieldCheck size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{user.email}</span>
                  <select
                    value={user.role}
                    disabled={busy}
                    onChange={(event) => void changeRole(user, event.target.value as UserRole)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    data-testid={`select-role-${user.id}`}
                  >
                    <option value="operator">Operator</option>
                    <option value="commander">Commander</option>
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeUser(user)}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    title="Remove user"
                    aria-label={`Remove ${user.email}`}
                    data-testid={`button-delete-user-${user.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {users.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground sm:px-5">No user accounts found.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
