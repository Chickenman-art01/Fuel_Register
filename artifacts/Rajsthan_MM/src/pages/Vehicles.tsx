import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Edit3,
  Gauge,
  Search,
  Truck,
  TriangleAlert,
  X,
  Table as TableIcon,
  LayoutGrid,
  ShieldCheck,
  Cpu,
  MapPin,
  Plus,
  Activity,
  Wrench,
  Camera,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { getListVehiclesQueryKey, type Vehicle } from "@workspace/api-client-react";
import { AppShell } from "@/components/app-shell";
import { VehicleAdditionForm, VehicleEditForm } from "@/farms";
import { useOfflineDeleteVehicle, useOfflineListVehicles } from "@/lib/offline-api";

export default function Vehicles() {
  const queryClient = useQueryClient();
  const query = useOfflineListVehicles();
  const archive = useOfflineDeleteVehicle();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [maintenanceFilter, setMaintenanceFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  
  // Modals / Panels
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [selected, setSelected] = useState<Vehicle | null>(null);

  // Edit Vehicles Dropdown State
  const [editDropdownOpen, setEditDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");

  const vehiclesResponseInvalid = query.data != null && !Array.isArray(query.data);

  const rawVehicles = useMemo(
    () => (Array.isArray(query.data) ? (query.data as Vehicle[]) : []),
    [query.data]
  );

  // Stats Dashboard calculations
  const stats = useMemo(() => {
    const activeFleet = rawVehicles.filter((v) => v.active);
    const total = activeFleet.length;
    const running = activeFleet.filter((v) => {
      const s = (v.maintenanceStatus ?? "").toLowerCase();
      return s.includes("active") || s.includes("running");
    }).length;
    const maintenance = activeFleet.filter((v) => {
      const s = (v.maintenanceStatus ?? "").toLowerCase();
      return s.includes("maintenance") || s.includes("breakdown");
    }).length;
    const gpsWorking = activeFleet.filter((v) => {
      const s = (v.gpsStatus ?? "").toLowerCase();
      return s.includes("working") || s.includes("installed");
    }).length;
    const cameraWorking = activeFleet.filter((v) => {
      const s = (v.cameraStatus ?? "").toLowerCase();
      return s.includes("working") || s.includes("installed");
    }).length;

    const now = new Date();
    const alertCount = activeFleet.filter((v) => {
      const dates = [v.insuranceTill, v.fitnessTill, v.puccTill, v.registrationTill].filter(Boolean);
      return dates.some((d) => {
        const exp = new Date(d!);
        const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      });
    }).length;

    return { total, running, maintenance, gpsWorking, cameraWorking, alertCount };
  }, [rawVehicles]);

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    rawVehicles.forEach((v) => {
      if (v.vehicleType) set.add(v.vehicleType);
    });
    return Array.from(set);
  }, [rawVehicles]);

  const uniqueMaintenance = useMemo(() => {
    const set = new Set<string>();
    rawVehicles.forEach((v) => {
      if (v.maintenanceStatus) set.add(v.maintenanceStatus);
    });
    return Array.from(set);
  }, [rawVehicles]);

  const vehicles = useMemo(() => {
    return rawVehicles.filter((item) => {
      if (!item.active) return false;
      if (typeFilter !== "all" && item.vehicleType !== typeFilter) return false;
      if (maintenanceFilter !== "all" && item.maintenanceStatus !== maintenanceFilter) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const searchable = [
        item.vehicleCode,
        item.registrationNo,
        item.ownerName,
        item.installedLocation,
        item.vehicleType,
        item.chassisNo,
        item.engineNo,
        item.gpsImeiNo,
        item.permitType,
        item.vehicleNo,
        item.vehicleName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [rawVehicles, search, typeFilter, maintenanceFilter]);

  // Vehicles for Edit Dropdown
  const editDropdownVehicles = useMemo(() => {
    const activeUnits = rawVehicles.filter((v) => v.active);
    if (!dropdownSearch.trim()) return activeUnits;
    const term = dropdownSearch.toLowerCase();
    return activeUnits.filter((v) => {
      const searchable = [
        v.vehicleCode,
        v.registrationNo,
        v.ownerName,
        v.vehicleType,
        v.vehicleNo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [rawVehicles, dropdownSearch]);

  const handleArchive = (vehicle: Vehicle) => {
    const label = vehicle.registrationNo || vehicle.vehicleCode || vehicle.vehicleNo;
    if (!window.confirm(`Archive ${label} from the active fleet?`)) return;
    archive.mutate(
      { id: vehicle.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          if (selected?.id === vehicle.id) setSelected(null);
          if (editing?.id === vehicle.id) setEditing(null);
        },
      }
    );
  };

  const getStatusBadge = (status?: string | null) => {
    if (!status) return <span className="text-muted-foreground">-</span>;
    const lower = status.toLowerCase();
    if (lower.includes("active") || lower.includes("working") || lower.includes("valid")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {status}
        </span>
      );
    }
    if (lower.includes("breakdown") || lower.includes("expired") || lower.includes("not working")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
          <span className="size-1.5 rounded-full bg-rose-500" />
          {status}
        </span>
      );
    }
    if (lower.includes("maintenance") || lower.includes("expiring") || lower.includes("issue")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          <span className="size-1.5 rounded-full bg-amber-500" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
        {status}
      </span>
    );
  };

  return (
    <AppShell>
      <div className="animate-rise">
        {/* Page Top Bar */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Vehicles</h1>
          </div>

          {/* Two Buttons: Add Vehicles & Edit Vehicles */}
          <div className="flex items-center gap-2.5">
            {/* Add Vehicles Button */}
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                setEditing(null);
                setEditDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)] transition hover:brightness-105 active:translate-y-0.5"
              data-testid="button-add-vehicle-top"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Vehicles</span>
            </button>

            {/* Edit Vehicles Button with Search Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setEditDropdownOpen(!editDropdownOpen);
                  setDropdownSearch("");
                }}
                className="flex items-center gap-1.5 rounded-xl border border-input bg-card px-4 py-2.5 text-xs font-extrabold text-foreground shadow-sm transition hover:bg-muted active:translate-y-0.5"
                data-testid="button-edit-vehicles-top"
              >
                <Edit3 size={15} />
                <span>Edit Vehicles</span>
                <ChevronDown size={14} className={`transition-transform ${editDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown with live search inside */}
              {editDropdownOpen && (
                <div className="absolute right-0 top-full z-40 mt-1.5 w-72 sm:w-80 rounded-2xl border border-border bg-popover p-2.5 shadow-2xl animate-rise">
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      autoFocus
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      placeholder="Search vehicle code or reg no..."
                      className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-2.5 text-xs outline-none focus:border-primary"
                      data-testid="input-search-edit-vehicles-dropdown"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-border/40 text-xs">
                    {editDropdownVehicles.length === 0 ? (
                      <div className="p-3 text-center text-muted-foreground">No vehicles found</div>
                    ) : (
                      editDropdownVehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setEditing(v);
                            setIsAdding(false);
                            setEditDropdownOpen(false);
                          }}
                          className="flex w-full items-center justify-between p-2.5 text-left rounded-xl transition hover:bg-muted/70"
                          data-testid={`option-edit-vehicle-${v.id}`}
                        >
                          <div>
                            <div className="flex items-center gap-2 font-mono font-bold">
                              <span className="text-foreground">{v.vehicleCode || v.vehicleNo}</span>
                              {v.registrationNo && (
                                <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground font-normal">
                                  {v.registrationNo}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {v.vehicleType || "General"} · {v.ownerName || "No owner"}
                            </div>
                          </div>
                          <span className="rounded-md bg-primary/10 p-1 text-primary">
                            <Edit3 size={13} />
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Stats Dashboard */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-testid="dashboard-vehicle-stats">
          <div className="rounded-2xl border border-card-border bg-card p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-[.08em]">Total Fleet</span>
              <Truck size={15} className="text-primary" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-foreground" data-testid="text-active-vehicle-count">
              {stats.total.toString().padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Registered units</div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-[.08em]">Running</span>
              <Activity size={15} className="text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-600">
              {stats.running.toString().padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Active in operations</div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-[.08em]">Under Maint.</span>
              <Wrench size={15} className="text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-amber-600">
              {stats.maintenance.toString().padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Workshop / breakdown</div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-[.08em]">GPS Active</span>
              <Cpu size={15} className="text-sky-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-sky-600">
              {stats.gpsWorking.toString().padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Tracking live</div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-[.08em]">Camera Active</span>
              <Camera size={15} className="text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-indigo-600">
              {stats.cameraWorking.toString().padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Recording active</div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-3.5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-[.08em]">Expiry Alerts</span>
              <AlertTriangle size={15} className={stats.alertCount > 0 ? "text-rose-600" : "text-emerald-600"} />
            </div>
            <div className={`mt-2 text-2xl font-extrabold ${stats.alertCount > 0 ? "text-rose-600" : "text-foreground"}`}>
              {stats.alertCount.toString().padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Due within 30 days</div>
          </div>
        </div>

        {(query.isError || vehiclesResponseInvalid) && (
          <div
            className="mb-5 flex items-center justify-between rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            data-testid="status-vehicles-error"
          >
            <span className="flex items-center gap-2">
              <TriangleAlert size={15} /> Could not load the vehicle master list.
            </span>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="font-bold underline"
              data-testid="button-retry-vehicles"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="grid gap-5 xl:grid-cols-1">
          {/* Modal / Slide-over Drawer for Add Vehicle */}
          {isAdding && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-rise">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card shadow-2xl border border-border">
                <VehicleAdditionForm onDone={() => setIsAdding(false)} />
              </div>
            </div>
          )}

          {/* Modal / Slide-over Drawer for Edit Vehicle */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-rise">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card shadow-2xl border border-border">
                <VehicleEditForm
                  vehicle={editing}
                  onDone={() => setEditing(null)}
                  onSelectVehicle={(v) => setEditing(v)}
                />
              </div>
            </div>
          )}

          <section
            className="min-w-0 rounded-2xl border border-card-border bg-card shadow-[0_7px_22px_rgba(40,53,58,.045)]"
            data-testid="panel-vehicle-list"
          >
            {/* Table Controls */}
            <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-extrabold text-base">Fleet Register</h2>
                <div className="flex rounded-lg border border-border bg-background p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${
                      viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <TableIcon size={13} /> Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${
                      viewMode === "cards" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid size={13} /> Cards
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:border-primary"
                >
                  <option value="all">All Vehicle Types</option>
                  {uniqueTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <select
                  value={maintenanceFilter}
                  onChange={(e) => setMaintenanceFilter(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:border-primary"
                >
                  <option value="all">All Maintenance</option>
                  {uniqueMaintenance.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <label className="relative block w-full sm:w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search fleet..."
                    className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
                    data-testid="input-search-vehicles"
                  />
                </label>
              </div>
            </div>

            {query.isLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-14 animate-pulse-soft rounded-xl bg-muted" />
                ))}
              </div>
            ) : vehicles.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
                <span className="mb-3 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Truck size={19} />
                </span>
                <p className="text-sm font-bold">{search ? "No matching vehicles" : "No active vehicles yet"}</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  {search ? "Try another search term or filter." : "Click Add Vehicles above to register the first unit."}
                </p>
              </div>
            ) : viewMode === "table" ? (
              /* Full 24-Column Data Table */
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30 font-bold uppercase tracking-[.06em] text-muted-foreground">
                      <th className="px-3 py-2.5">Sr. no</th>
                      <th className="px-3 py-2.5">Vehicle ID / Code</th>
                      <th className="px-3 py-2.5">Registration No.</th>
                      <th className="px-3 py-2.5">Owner Name</th>
                      <th className="px-3 py-2.5">Location</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Chasis No.</th>
                      <th className="px-3 py-2.5">Engine No.</th>
                      <th className="px-3 py-2.5">GPS IMEI</th>
                      <th className="px-3 py-2.5">GPS Status</th>
                      <th className="px-3 py-2.5">Camera Status</th>
                      <th className="px-3 py-2.5">Maintenance</th>
                      <th className="px-3 py-2.5">Permit Type</th>
                      <th className="px-3 py-2.5">Reg. Till</th>
                      <th className="px-3 py-2.5">Ins. Till</th>
                      <th className="px-3 py-2.5">Fitness Till</th>
                      <th className="px-3 py-2.5">PUCC Till</th>
                      <th className="sticky right-0 bg-muted/90 px-3 py-2.5 text-right backdrop-blur-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {vehicles.map((vehicle, idx) => (
                      <tr
                        key={vehicle.id}
                        onClick={() => setSelected(vehicle)}
                        className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                          selected?.id === vehicle.id ? "bg-primary/5 font-medium" : ""
                        }`}
                        data-testid={`card-vehicle-${vehicle.id}`}
                      >
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">
                          {vehicle.srNo ?? idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-foreground">
                          {vehicle.vehicleCode || vehicle.vehicleNo}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">
                          {vehicle.registrationNo || "-"}
                        </td>
                        <td className="px-3 py-2.5 truncate max-w-[140px] text-foreground">
                          {vehicle.ownerName || "-"}
                        </td>
                        <td className="px-3 py-2.5 truncate max-w-[120px] text-muted-foreground">
                          {vehicle.installedLocation || "-"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                            {vehicle.vehicleType || "General"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">
                          {vehicle.chassisNo || "-"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">
                          {vehicle.engineNo || "-"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">
                          {vehicle.gpsImeiNo || "-"}
                        </td>
                        <td className="px-3 py-2.5">
                          {getStatusBadge(vehicle.gpsStatus)}
                        </td>
                        <td className="px-3 py-2.5">
                          {getStatusBadge(vehicle.cameraStatus)}
                        </td>
                        <td className="px-3 py-2.5">
                          {getStatusBadge(vehicle.maintenanceStatus)}
                        </td>
                        <td className="px-3 py-2.5 truncate max-w-[120px]">
                          {vehicle.permitType || "-"}
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          {vehicle.registrationTill || "-"}
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          {vehicle.insuranceTill || "-"}
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          {vehicle.fitnessTill || "-"}
                        </td>
                        <td className="px-3 py-2.5 font-mono">
                          {vehicle.puccTill || "-"}
                        </td>
                        <td className="sticky right-0 bg-card/95 px-3 py-2.5 text-right backdrop-blur-sm">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditing(vehicle);
                                setIsAdding(false);
                              }}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              title="Edit vehicle"
                              data-testid={`button-edit-vehicle-${vehicle.id}`}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(vehicle);
                              }}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Archive vehicle"
                              data-testid={`button-archive-vehicle-${vehicle.id}`}
                            >
                              <Archive size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Compact Cards View */
              <div className="divide-y divide-border/60">
                {vehicles.map((vehicle) => (
                  <div
                    role="button"
                    tabIndex={0}
                    key={vehicle.id}
                    onClick={() => setSelected(vehicle)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelected(vehicle);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/35 sm:px-5 ${
                      selected?.id === vehicle.id ? "bg-primary/5" : ""
                    }`}
                    data-testid={`card-vehicle-${vehicle.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary font-mono text-xs font-medium text-secondary-foreground">
                        {(vehicle.vehicleCode || vehicle.vehicleNo || "VH").slice(-2)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">
                            {vehicle.vehicleCode || vehicle.vehicleNo}
                          </span>
                          {vehicle.registrationNo && (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                              {vehicle.registrationNo}
                            </span>
                          )}
                          {vehicle.vehicleType && (
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                              {vehicle.vehicleType}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {vehicle.ownerName || vehicle.installedLocation || vehicle.vehicleName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block">
                        {getStatusBadge(vehicle.maintenanceStatus)}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditing(vehicle);
                            setIsAdding(false);
                          }}
                          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title="Edit vehicle"
                          data-testid={`button-edit-vehicle-${vehicle.id}`}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleArchive(vehicle);
                          }}
                          className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Archive vehicle"
                          data-testid={`button-archive-vehicle-${vehicle.id}`}
                        >
                          <Archive size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Selected Vehicle Comprehensive Overview */}
        {selected && (
          <section
            className="mt-6 rounded-2xl border border-accent/20 bg-accent/5 p-5 shadow-sm"
            data-testid={`panel-vehicle-details-${selected.id}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-accent">
                  <Gauge size={14} /> Complete Vehicle Specifications & Compliance
                </div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="font-mono text-2xl font-bold">
                    {selected.vehicleCode || selected.vehicleNo}
                  </h2>
                  {selected.registrationNo && (
                    <span className="font-mono text-sm text-muted-foreground">
                      ({selected.registrationNo})
                    </span>
                  )}
                  {selected.vehicleType && (
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                      {selected.vehicleType}
                    </span>
                  )}
                </div>
                {selected.ownerName && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Owner: <span className="font-medium text-foreground">{selected.ownerName}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(selected);
                    setIsAdding(false);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
                >
                  <Edit3 size={13} />
                  <span>Edit Unit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/10"
                  data-testid="button-close-vehicle-details"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 border-t border-accent/15 pt-5 md:grid-cols-3">
              {/* Group 1: General & Location */}
              <div className="space-y-3 rounded-xl bg-card/60 p-4 border border-card-border">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <MapPin size={14} className="text-primary" /> General & Location
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sr. No:</span>
                    <span className="font-mono">{selected.srNo ?? selected.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Installed Location:</span>
                    <span className="font-medium">{selected.installedLocation || "Not specified"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Permit Type:</span>
                    <span className="font-medium">{selected.permitType || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fleet Status:</span>
                    <span className="font-bold text-emerald-700">Active</span>
                  </div>
                </div>
              </div>

              {/* Group 2: Technical & Tracking */}
              <div className="space-y-3 rounded-xl bg-card/60 p-4 border border-card-border">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Cpu size={14} className="text-primary" /> Technical & Tracking
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chasis No:</span>
                    <span className="font-mono">{selected.chassisNo || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Engine No:</span>
                    <span className="font-mono">{selected.engineNo || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GPS IMEI / ID:</span>
                    <span className="font-mono">{selected.gpsImeiNo || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GPS Status:</span>
                    <span>{getStatusBadge(selected.gpsStatus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Camera Status:</span>
                    <span>{getStatusBadge(selected.cameraStatus)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maintenance:</span>
                    <span>{getStatusBadge(selected.maintenanceStatus)}</span>
                  </div>
                </div>
              </div>

              {/* Group 3: Compliance & Expiries */}
              <div className="space-y-3 rounded-xl bg-card/60 p-4 border border-card-border">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <ShieldCheck size={14} className="text-primary" /> Compliance & Expiries
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registration Till:</span>
                    <span className="font-mono">{selected.registrationTill || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Insurance Till:</span>
                    <span className="font-mono">{selected.insuranceTill || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fitness Till:</span>
                    <span className="font-mono">{selected.fitnessTill || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PUCC Till:</span>
                    <span className="font-mono">{selected.puccTill || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {archive.isError && (
          <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-archive-error">
            <TriangleAlert size={14} /> Could not archive vehicle. Try again.
          </p>
        )}
      </div>
    </AppShell>
  );
}
