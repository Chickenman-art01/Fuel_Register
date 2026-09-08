import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, Trash2, UserCheck, Users, XCircle } from "lucide-react";
import { getListPeopleQueryKey } from "@workspace/api-client-react";
import { AppShell } from "@/components/app-shell";
import { EmployeeEntryForm } from "@/farms";
import { supabase } from "@/lib/supabase";

export interface StaffMember {
  id: number;
  name: string;
  role: "operator" | "issuer";
  active: boolean;
  created_at: string;
}

export default function Employees() {
  const queryClient = useQueryClient();
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [roleFilter, setRoleFilter] = useState<"all" | "operator" | "issuer">("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, role, active, created_at")
        .order("name");

      if (error) {
        // Fallback to staff_members if needed
        const { data: fallback, error: fbError } = await supabase
          .from("staff_members")
          .select("id, name, role, active, created_at")
          .order("name");
        if (fbError) throw error;
        setEmployees((fallback as StaffMember[]) ?? []);
      } else {
        setEmployees((data as StaffMember[]) ?? []);
      }
      setMessage("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load employees from database.");
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, []);

  const toggleActive = async (employee: StaffMember) => {
    setBusy(true);
    try {
      const nextActive = !employee.active;
      await supabase
        .from("employees")
        .update({ active: nextActive })
        .eq("id", employee.id);

      try {
        await supabase
          .from("staff_members")
          .update({ active: nextActive })
          .eq("name", employee.name);
      } catch {
        // ignore sync error
      }

      queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey({ role: employee.role }) });
      await loadEmployees();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update employee status.");
    } finally {
      setBusy(false);
    }
  };

  const deleteEmployee = async (employee: StaffMember) => {
    if (!window.confirm(`Remove ${employee.name} (${employee.role})?`)) return;
    setBusy(true);
    try {
      await supabase
        .from("employees")
        .delete()
        .eq("id", employee.id);

      try {
        await supabase
          .from("staff_members")
          .delete()
          .eq("name", employee.name);
      } catch {
        // ignore sync error
      }

      queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey({ role: employee.role }) });
      await loadEmployees();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete employee.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = employees.filter((emp) => (roleFilter === "all" ? true : emp.role === roleFilter));

  return (
    <AppShell>
      <div className="animate-rise">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Employees</h1>
          </div>
          <div
            className="rounded-xl border border-card-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground"
            data-testid="text-employee-count"
          >
            <span className="font-bold text-foreground">{employees.length.toString().padStart(2, "0")}</span> staff members
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive">
            {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(310px,370px)_1fr]">
          <EmployeeEntryForm onSuccess={loadEmployees} />

          <section
            className="min-w-0 rounded-2xl border border-card-border bg-card shadow-[0_7px_22px_rgba(40,53,58,.045)]"
            data-testid="panel-employee-list"
          >
            <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-extrabold">Staff roster</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setRoleFilter("all")}
                    className={`rounded-md px-2.5 py-1 transition ${roleFilter === "all" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground"}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("operator")}
                    className={`rounded-md px-2.5 py-1 transition ${roleFilter === "operator" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground"}`}
                  >
                    Operators
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleFilter("issuer")}
                    className={`rounded-md px-2.5 py-1 transition ${roleFilter === "issuer" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground"}`}
                  >
                    Issuers
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void loadEmployees()}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                  title="Refresh employees"
                  aria-label="Refresh employees"
                  data-testid="button-refresh-employees"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {filtered.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5" data-testid={`card-employee-${emp.id}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <UserCheck size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-foreground">{emp.name}</div>
                    <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[.05em] text-muted-foreground">
                      {emp.role === "operator" ? "Diesel Operator" : "Stock Issuer"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleActive(emp)}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition ${
                      emp.active
                        ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    title="Toggle active status"
                  >
                    {emp.active ? (
                      <>
                        <CheckCircle2 size={12} /> Active
                      </>
                    ) : (
                      <>
                        <XCircle size={12} /> Inactive
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteEmployee(emp)}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    title="Delete employee"
                    aria-label={`Delete ${emp.name}`}
                    data-testid={`button-delete-employee-${emp.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground sm:px-5">No employees in this category.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
