import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, RefreshCw, TriangleAlert } from "lucide-react";
import { getListPeopleQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export type EmployeeRole = "operator" | "issuer";

export interface EmployeeEntryFormProps {
  onSuccess?: () => void | Promise<void>;
}

export function EmployeeEntryForm({ onSuccess }: EmployeeEntryFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [role, setRole] = useState<EmployeeRole>("operator");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setBusy(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("employees")
        .insert({ name: trimmedName, role, active: true });

      if (insertError) throw insertError;

      // also keep staff_members table in sync
      try {
        await supabase
          .from("staff_members")
          .insert({ name: trimmedName, role, active: true });
      } catch {
        // ignore sync error
      }

      setName("");
      queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey({ role: "operator" }) });
      queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey({ role: "issuer" }) });
      await onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add employee.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_7px_22px_rgba(40,53,58,.045)]" data-testid="panel-employee-form">
      <div className="mb-5 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <Plus size={15} />
        </span>
        <h2 className="font-extrabold">Add employee</h2>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
            Employee name
          </label>
          <Input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Singh"
            data-testid="input-employee-name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as EmployeeRole)}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            data-testid="select-employee-role"
          >
            <option value="operator">Diesel operator</option>
            <option value="issuer">Stock issuer</option>
          </select>
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="w-full gap-2 rounded-lg bg-primary font-bold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)]"
          data-testid="button-save-employee"
        >
          {busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
          {busy ? "Adding employee" : "Add employee"}
        </Button>

        {error && (
          <p className="flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-employee-error">
            <TriangleAlert size={14} /> {error}
          </p>
        )}
      </form>
    </div>
  );
}
