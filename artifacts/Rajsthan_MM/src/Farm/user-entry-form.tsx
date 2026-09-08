import { useState, type FormEvent } from "react";
import { RefreshCw, UserPlus } from "lucide-react";
import { createManagedUser } from "@/lib/commander-users";

export type UserRole = "commander" | "operator";

export interface UserEntryFormProps {
  onSuccess: () => void | Promise<void>;
}

export function UserEntryForm({ onSuccess }: UserEntryFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await createManagedUser({ email, password, role });
      setEmail("");
      setPassword("");
      setRole("operator");
      await onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_7px_22px_rgba(40,53,58,.045)]" data-testid="panel-user-entry-form">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <UserPlus size={15} />
        </span>
        <h2 className="font-extrabold">Add user</h2>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal normal-case tracking-normal outline-none focus:border-primary"
              placeholder="operator@example.com"
              data-testid="input-user-email"
            />
          </label>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
            Temporary password
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal normal-case tracking-normal outline-none focus:border-primary"
              placeholder="Min 6 characters"
              data-testid="input-user-password"
            />
          </label>
        </div>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs font-normal normal-case tracking-normal outline-none focus:border-primary"
              data-testid="select-user-role"
            >
              <option value="operator">Fuel operator</option>
              <option value="commander">Commander</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)] disabled:opacity-60"
          data-testid="button-create-user"
        >
          {busy ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
          {busy ? "Creating user" : "Create user"}
        </button>

        {message && (
          <p className="rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive" data-testid="status-user-form-error">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
