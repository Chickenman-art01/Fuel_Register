import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Edit3,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
  Truck,
  ShieldCheck,
  Cpu,
  Lock,
  Unlock,
} from "lucide-react";
import { getListVehiclesQueryKey, type Vehicle } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useOfflineListVehicles, useOfflineUpdateVehicle } from "@/lib/offline-api";
import { fetchDropdownCategories, getCachedDropdownCategories, type DropdownCategory } from "@/lib/dropdown-store";

export const vehicleEditSchema = z.object({
  srNo: z.coerce.number().optional().nullable(),
  vehicleCode: z.string().trim().min(1, "Vehicle ID / Code is required"),
  registrationNo: z.string().trim().optional().default(""),
  ownerName: z.string().trim().optional().default(""),
  installedLocation: z.string().trim().optional().default(""),
  vehicleType: z.string().trim().optional().default(""),
  chassisNo: z.string().trim().optional().default(""),
  engineNo: z.string().trim().optional().default(""),
  gpsImeiNo: z.string().trim().optional().default(""),
  gpsStatus: z.string().trim().optional().default(""),
  cameraStatus: z.string().trim().optional().default(""),
  maintenanceStatus: z.string().trim().optional().default(""),
  permitType: z.string().trim().optional().default(""),
  registrationFrom: z.string().optional().default(""),
  registrationTill: z.string().optional().default(""),
  registrationStatus: z.string().optional().default(""),
  insuranceFrom: z.string().optional().default(""),
  insuranceTill: z.string().optional().default(""),
  insuranceStatus: z.string().optional().default(""),
  fitnessFrom: z.string().optional().default(""),
  fitnessTill: z.string().optional().default(""),
  fitnessStatus: z.string().optional().default(""),
  puccTill: z.string().optional().default(""),
  puccStatus: z.string().optional().default(""),
});

export type VehicleEditFormValues = z.infer<typeof vehicleEditSchema>;

export interface VehicleEditFormProps {
  vehicle?: Vehicle | null;
  onDone: () => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

export function VehicleEditForm({ vehicle, onDone, onSelectVehicle }: VehicleEditFormProps) {
  const queryClient = useQueryClient();
  const update = useOfflineUpdateVehicle();
  const vehiclesQuery = useOfflineListVehicles();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(vehicle ?? null);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(!vehicle);
  const [activeTab, setActiveTab] = useState<"general" | "technical" | "compliance">("general");
  const [categories, setCategories] = useState<DropdownCategory[]>(() => getCachedDropdownCategories());
  
  // Track which fields are actively in edit mode (edit symbol clicked)
  const [editableFields, setEditableFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDropdownCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (vehicle) {
      setSelectedVehicle(vehicle);
    }
  }, [vehicle]);

  const allVehicles = useMemo(
    () => (Array.isArray(vehiclesQuery.data) ? (vehiclesQuery.data as Vehicle[]) : []).filter((v) => v.active),
    [vehiclesQuery.data]
  );

  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return allVehicles;
    const q = vehicleSearch.toLowerCase();
    return allVehicles.filter((v) => {
      const text = [v.vehicleCode, v.registrationNo, v.ownerName, v.vehicleType, v.vehicleNo, v.vehicleName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [allVehicles, vehicleSearch]);

  const getCategoryOptions = (name: string): string[] => {
    const found = categories.find(
      (c) => c.description.trim().toLowerCase() === name.trim().toLowerCase() || c.id === name
    );
    return found?.options ?? [];
  };

  const vehicleTypeOptions = getCategoryOptions("Vehicle Type");
  const gpsStatusOptions = getCategoryOptions("GPS Status");
  const cameraStatusOptions = getCategoryOptions("Camera Status");
  const maintenanceStatusOptions = getCategoryOptions("Maintenance Status");
  const permitTypeOptions = getCategoryOptions("Permit Type");

  const form = useForm<VehicleEditFormValues>({
    resolver: zodResolver(vehicleEditSchema) as any,
    defaultValues: {
      srNo: selectedVehicle?.srNo ?? undefined,
      vehicleCode: selectedVehicle?.vehicleCode ?? selectedVehicle?.vehicleNo ?? "",
      registrationNo: selectedVehicle?.registrationNo ?? "",
      ownerName: selectedVehicle?.ownerName ?? "",
      installedLocation: selectedVehicle?.installedLocation ?? "",
      vehicleType: selectedVehicle?.vehicleType ?? "",
      chassisNo: selectedVehicle?.chassisNo ?? "",
      engineNo: selectedVehicle?.engineNo ?? "",
      gpsImeiNo: selectedVehicle?.gpsImeiNo ?? "",
      gpsStatus: selectedVehicle?.gpsStatus ?? "",
      cameraStatus: selectedVehicle?.cameraStatus ?? "",
      maintenanceStatus: selectedVehicle?.maintenanceStatus ?? "",
      permitType: selectedVehicle?.permitType ?? "",
      registrationFrom: selectedVehicle?.registrationFrom ?? "",
      registrationTill: selectedVehicle?.registrationTill ?? "",
      registrationStatus: selectedVehicle?.registrationStatus ?? "",
      insuranceFrom: selectedVehicle?.insuranceFrom ?? "",
      insuranceTill: selectedVehicle?.insuranceTill ?? "",
      insuranceStatus: selectedVehicle?.insuranceStatus ?? "",
      fitnessFrom: selectedVehicle?.fitnessFrom ?? "",
      fitnessTill: selectedVehicle?.fitnessTill ?? "",
      fitnessStatus: selectedVehicle?.fitnessStatus ?? "",
      puccTill: selectedVehicle?.puccTill ?? "",
      puccStatus: selectedVehicle?.puccStatus ?? "",
    },
  });

  useEffect(() => {
    if (selectedVehicle) {
      form.reset({
        srNo: selectedVehicle.srNo ?? undefined,
        vehicleCode: selectedVehicle.vehicleCode ?? selectedVehicle.vehicleNo ?? "",
        registrationNo: selectedVehicle.registrationNo ?? "",
        ownerName: selectedVehicle.ownerName ?? "",
        installedLocation: selectedVehicle.installedLocation ?? "",
        vehicleType: selectedVehicle.vehicleType ?? "",
        chassisNo: selectedVehicle.chassisNo ?? "",
        engineNo: selectedVehicle.engineNo ?? "",
        gpsImeiNo: selectedVehicle.gpsImeiNo ?? "",
        gpsStatus: selectedVehicle.gpsStatus ?? "",
        cameraStatus: selectedVehicle.cameraStatus ?? "",
        maintenanceStatus: selectedVehicle.maintenanceStatus ?? "",
        permitType: selectedVehicle.permitType ?? "",
        registrationFrom: selectedVehicle.registrationFrom ?? "",
        registrationTill: selectedVehicle.registrationTill ?? "",
        registrationStatus: selectedVehicle.registrationStatus ?? "",
        insuranceFrom: selectedVehicle.insuranceFrom ?? "",
        insuranceTill: selectedVehicle.insuranceTill ?? "",
        insuranceStatus: selectedVehicle.insuranceStatus ?? "",
        fitnessFrom: selectedVehicle.fitnessFrom ?? "",
        fitnessTill: selectedVehicle.fitnessTill ?? "",
        fitnessStatus: selectedVehicle.fitnessStatus ?? "",
        puccTill: selectedVehicle.puccTill ?? "",
        puccStatus: selectedVehicle.puccStatus ?? "",
      });
      // By default all fields are editable once a vehicle is picked
      setEditableFields({});
    }
  }, [selectedVehicle, form]);

  const toggleFieldEdit = (fieldName: string) => {
    setEditableFields((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  const handlePickVehicle = (v: Vehicle) => {
    setSelectedVehicle(v);
    setDropdownOpen(false);
    onSelectVehicle?.(v);
  };

  const submit = (values: VehicleEditFormValues) => {
    if (!selectedVehicle) return;

    const payload = {
      srNo: values.srNo ?? null,
      vehicleCode: values.vehicleCode,
      registrationNo: values.registrationNo || null,
      ownerName: values.ownerName || null,
      installedLocation: values.installedLocation || null,
      vehicleType: values.vehicleType || null,
      chassisNo: values.chassisNo || null,
      engineNo: values.engineNo || null,
      gpsImeiNo: values.gpsImeiNo || null,
      gpsStatus: values.gpsStatus || null,
      cameraStatus: values.cameraStatus || null,
      maintenanceStatus: values.maintenanceStatus || null,
      permitType: values.permitType || null,
      registrationFrom: values.registrationFrom || null,
      registrationTill: values.registrationTill || null,
      registrationStatus: values.registrationStatus || null,
      insuranceFrom: values.insuranceFrom || null,
      insuranceTill: values.insuranceTill || null,
      insuranceStatus: values.insuranceStatus || null,
      fitnessFrom: values.fitnessFrom || null,
      fitnessTill: values.fitnessTill || null,
      fitnessStatus: values.fitnessStatus || null,
      puccTill: values.puccTill || null,
      puccStatus: values.puccStatus || null,
      vehicleNo: values.registrationNo || values.vehicleCode,
      vehicleName: values.ownerName ? `${values.vehicleType || "Vehicle"} (${values.ownerName})` : values.vehicleType || values.vehicleCode,
    };

    update.mutate(
      { id: selectedVehicle.id, data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          onDone();
        },
      }
    );
  };

  const busy = update.isPending;

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_7px_22px_rgba(40,53,58,.045)]" data-testid="panel-vehicle-edit-form">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
            <Edit3 size={15} />
          </span>
          <div>
            <h2 className="font-extrabold text-lg">Edit Vehicle</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          data-testid="button-cancel-vehicle-edit"
        >
          <X size={16} />
        </button>
      </div>

      {/* Select Vehicle Dropdown with Live Search */}
      <div className="mb-4 relative">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
          Select Vehicle to Edit
        </label>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-xs font-semibold hover:border-primary/50"
          data-testid="button-vehicle-edit-picker"
        >
          {selectedVehicle ? (
            <span className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary">
                {selectedVehicle.vehicleCode || selectedVehicle.vehicleNo}
              </span>
              {selectedVehicle.registrationNo && (
                <span className="text-muted-foreground">({selectedVehicle.registrationNo})</span>
              )}
              {selectedVehicle.vehicleType && (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                  {selectedVehicle.vehicleType}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">-- Click to Search & Select Vehicle --</span>
          )}
          <Search size={14} className="text-muted-foreground" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-border bg-popover p-2 shadow-xl animate-rise">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                autoFocus
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Type to search vehicle code, reg no, owner..."
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-2.5 text-xs outline-none focus:border-primary"
                data-testid="input-search-vehicle-in-dropdown"
              />
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-border/40 text-xs">
              {filteredVehicles.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground">No vehicles found</div>
              ) : (
                filteredVehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handlePickVehicle(v)}
                    className={`flex w-full items-center justify-between p-2 text-left rounded-lg transition hover:bg-muted/60 ${
                      selectedVehicle?.id === v.id ? "bg-primary/10 font-bold" : ""
                    }`}
                    data-testid={`option-vehicle-edit-${v.id}`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-mono font-bold">
                        <span>{v.vehicleCode || v.vehicleNo}</span>
                        {v.registrationNo && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            [{v.registrationNo}]
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {v.vehicleType || "General"} · {v.ownerName || "No owner"}
                      </div>
                    </div>
                    <span className="text-[10px] text-primary underline">Select</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {!selectedVehicle ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
          Please select a vehicle above to open and edit its details.
        </div>
      ) : (
        <>
          <div className="mb-4 flex border-b border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 transition ${
                activeTab === "general"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Truck size={13} /> General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("technical")}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 transition ${
                activeTab === "technical"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cpu size={13} /> Technical & GPS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compliance")}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 transition ${
                activeTab === "compliance"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck size={13} /> Compliance & Expiries
            </button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-3.5">
              {activeTab === "general" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="srNo"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              Sr. no
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("srNo")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit Sr. no"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g. 1"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleCode"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              Vehicle ID / Code *
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("vehicleCode")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit vehicle code"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <Input {...field} placeholder="e.g. EX-07, D-12" data-testid="input-edit-vehicle-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="registrationNo"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              Registration No.
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("registrationNo")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit registration no"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <Input {...field} placeholder="e.g. RJ-14-EA-1234" data-testid="input-edit-registration-no" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleType"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              Vehicle Type
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("vehicleType")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit vehicle type"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <select
                              {...field}
                              value={field.value ?? ""}
                              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                            >
                              <option value="">Select vehicle type</option>
                              {vehicleTypeOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                            Owner Name (Gadi Kis ke Name Par)
                          </FormLabel>
                          <button
                            type="button"
                            onClick={() => toggleFieldEdit("ownerName")}
                            className="text-muted-foreground hover:text-primary"
                            title="Click to edit owner name"
                          >
                            <Edit3 size={11} />
                          </button>
                        </div>
                        <FormControl>
                          <Input {...field} placeholder="Owner name / entity" data-testid="input-edit-owner-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="installedLocation"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                            Installed Location
                          </FormLabel>
                          <button
                            type="button"
                            onClick={() => toggleFieldEdit("installedLocation")}
                            className="text-muted-foreground hover:text-primary"
                            title="Click to edit location"
                          >
                            <Edit3 size={11} />
                          </button>
                        </div>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Mines Pit A, Crusher 1" data-testid="input-edit-installed-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {activeTab === "technical" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="chassisNo"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              Chasis No.
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("chassisNo")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit chassis no"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <Input {...field} placeholder="Chassis number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="engineNo"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              Engine No.
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("engineNo")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit engine no"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <Input {...field} placeholder="Engine number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="gpsImeiNo"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              GPS IMEI / ID No.
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("gpsImeiNo")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit GPS IMEI"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <Input {...field} placeholder="GPS IMEI or ID" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gpsStatus"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              GPS Status
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("gpsStatus")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit GPS status"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <select
                              {...field}
                              value={field.value ?? ""}
                              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                            >
                              <option value="">Select GPS status</option>
                              {gpsStatusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="cameraStatus"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              Camera Status
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("cameraStatus")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit camera status"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <select
                              {...field}
                              value={field.value ?? ""}
                              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                            >
                              <option value="">Select camera status</option>
                              {cameraStatusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maintenanceStatus"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                              Maintenance Status
                            </FormLabel>
                            <button
                              type="button"
                              onClick={() => toggleFieldEdit("maintenanceStatus")}
                              className="text-muted-foreground hover:text-primary"
                              title="Click to edit maintenance status"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                          <FormControl>
                            <select
                              {...field}
                              value={field.value ?? ""}
                              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                            >
                              <option value="">Select maintenance status</option>
                              {maintenanceStatusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="permitType"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                            Permit Type
                          </FormLabel>
                          <button
                            type="button"
                            onClick={() => toggleFieldEdit("permitType")}
                            className="text-muted-foreground hover:text-primary"
                            title="Click to edit permit type"
                          >
                            <Edit3 size={11} />
                          </button>
                        </div>
                        <FormControl>
                          <select
                            {...field}
                            value={field.value ?? ""}
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                          >
                            <option value="">Select permit type</option>
                            {permitTypeOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {activeTab === "compliance" && (
                <div className="space-y-3">
                  {/* Registration */}
                  <div className="rounded-lg border border-border/70 p-2.5">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold text-foreground">
                      <span>Registration</span>
                      <button
                        type="button"
                        onClick={() => toggleFieldEdit("registration")}
                        className="text-muted-foreground hover:text-primary"
                        title="Click to edit registration"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name="registrationFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">From</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registrationTill"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">Till (Expiry)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registrationStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">Status</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Valid / Expired" className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Insurance */}
                  <div className="rounded-lg border border-border/70 p-2.5">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold text-foreground">
                      <span>Insurance</span>
                      <button
                        type="button"
                        onClick={() => toggleFieldEdit("insurance")}
                        className="text-muted-foreground hover:text-primary"
                        title="Click to edit insurance"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name="insuranceFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">From</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="insuranceTill"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">Till (Expiry)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="insuranceStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">Status</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Valid / Expired" className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Fitness */}
                  <div className="rounded-lg border border-border/70 p-2.5">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold text-foreground">
                      <span>Fitness</span>
                      <button
                        type="button"
                        onClick={() => toggleFieldEdit("fitness")}
                        className="text-muted-foreground hover:text-primary"
                        title="Click to edit fitness"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name="fitnessFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">From</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fitnessTill"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">Till (Expiry)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fitnessStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">Status</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Valid / Expired" className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* PUCC */}
                  <div className="rounded-lg border border-border/70 p-2.5">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold text-foreground">
                      <span>PUCC (Pollution)</span>
                      <button
                        type="button"
                        onClick={() => toggleFieldEdit("pucc")}
                        className="text-muted-foreground hover:text-primary"
                        title="Click to edit PUCC"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="puccTill"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">Till (Expiry)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="puccStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] text-muted-foreground">Status</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Valid / Expired" className="h-8 text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={busy}
                  className="flex-1 gap-2 rounded-lg bg-primary font-bold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)]"
                  data-testid="button-submit-edit-vehicle"
                >
                  {busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                  {busy ? "Saving Changes" : "Save Changes"}
                </Button>
              </div>

              {update.isError && (
                <p className="flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-vehicle-edit-error">
                  <TriangleAlert size={14} /> Could not update vehicle. Try again.
                </p>
              )}
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
