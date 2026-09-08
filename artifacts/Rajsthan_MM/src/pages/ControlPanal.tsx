import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Fuel, ShieldCheck, Truck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useOfflineListVehicles } from "@/lib/offline-api";
import { listManagedUsers } from "@/lib/commander-users";
import { supabase } from "@/lib/supabase";

export default function ControlPanal() {
  const vehiclesQuery = useOfflineListVehicles();
  const [userCount, setUserCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);

  useEffect(() => {
    void listManagedUsers()
      .then((users) => setUserCount(users.length))
      .catch(() => setUserCount(0));

    void (async () => {
      try {
        const { count } = await supabase
          .from("staff_members")
          .select("id", { count: "exact", head: true });
        if (count != null) setEmployeeCount(count);
      } catch {
        setEmployeeCount(0);
      }
    })();
  }, []);

  const activeVehicles = Array.isArray(vehiclesQuery.data)
    ? vehiclesQuery.data.filter((v) => v.active).length
    : 0;

  const modules = [
    {
      title: "Fleet & vehicles",
      count: `${activeVehicles.toString().padStart(2, "0")} active`,
      icon: Truck,
      href: "/vehicles",
      buttonText: "Manage fleet",
      testId: "card-module-vehicles",
    },
    {
      title: "Employees & roster",
      count: `${employeeCount.toString().padStart(2, "0")} staff`,
      icon: Users,
      href: "/employees",
      buttonText: "Manage roster",
      testId: "card-module-employees",
    },
    {
      title: "User accounts",
      count: `${userCount.toString().padStart(2, "0")} accounts`,
      icon: ShieldCheck,
      href: "/users",
      buttonText: "Manage accounts",
      testId: "card-module-users",
    },
    {
      title: "Daily fuel register",
      count: "Ledger",
      icon: Fuel,
      href: "/Fuelentry",
      buttonText: "Open register",
      testId: "card-module-fuel",
    },
  ];

  return (
    <AppShell>
      <div className="animate-rise">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Control panel</h1>
          </div>
          <div
            className="rounded-xl border border-card-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground"
            data-testid="text-commander-badge"
          >
            <span className="font-bold text-foreground">Commander</span> privileged access
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                className="flex flex-col justify-between rounded-2xl border border-card-border bg-card p-5 shadow-[0_7px_22px_rgba(40,53,58,.045)]"
                data-testid={mod.testId}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
                      <Icon size={19} />
                    </span>
                    <span className="font-mono text-xs font-bold text-muted-foreground">{mod.count}</span>
                  </div>
                  <h2 className="mt-4 text-base font-extrabold">{mod.title}</h2>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60">
                  <Link
                    href={mod.href}
                    className="flex items-center justify-between text-xs font-bold text-primary transition-colors hover:underline"
                  >
                    <span>{mod.buttonText}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
