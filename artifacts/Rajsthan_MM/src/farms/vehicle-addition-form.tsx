import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, RefreshCw, TriangleAlert, X, Truck, ShieldCheck, Cpu } from "lucide-react";
import { getListVehiclesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useOfflineCreateVehicle } from "@/lib/offline-api";
import { fetchDropdownCategories, getCachedDropdownCategories, type DropdownCategory } from "@/lib/dropdown-store";

export const vehicleAdditionSchema = z.object({
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

export type VehicleAdditionFormValues = z.infer<typeof vehicleAdditionSchema>;

export interface VehicleAdditionFormProps {
  onDone: () => void;
}

export function VehicleAdditionForm({ onDone }: VehicleAdditionFormProps) {
  const queryClient = useQueryClient();
  const create = useOfflineCreateVehicle();
  const [activeTab, setActiveTab] = useState<"general" | "technical" | "compliance">("general");
  const [categories, setCategories] = useState<DropdownCategory[]>(() => getCachedDropdownCategories());

  useEffect(() => {
    fetchDropdownCategories().then(setCategories);
  }, []);

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

  const form = useForm<VehicleAdditionFormValues>({
    resolver: zodResolver(vehicleAdditionSchema) as any,
    defaultValues: {
      srNo: undefined,
      vehicleCode: "",
      registrationNo: "",
      ownerName: "",
      installedLocation: "",
      vehicleType: "",
      chassisNo: "",
      engineNo: "",
      gpsImeiNo: "",
      gpsStatus: "",
      cameraStatus: "",
      maintenanceStatus: "",
      permitType: "",
      registrationFrom: "",
      registrationTill: "",
      registrationStatus: "",
      insuranceFrom: "",
      insuranceTill: "",
      insuranceStatus: "",
      fitnessFrom: "",
      fitnessTill: "",
      fitnessStatus: "",
      puccTill: "",
      puccStatus: "",
    },
  });

  const submit = (values: VehicleAdditionFormValues) => {
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

    create.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          form.reset();
          onDone();
        },
      }
    );
  };

  const busy = create.isPending;

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_7px_22px_rgba(40,53,58,.045)]" data-testid="panel-vehicle-addition-form">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
            <Plus size={15} />
          </span>
          <h2 className="font-extrabold text-lg">Add Vehicle</h2>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          data-testid="button-cancel-vehicle-add"
        >
          <X size={16} />
        </button>
      </div>

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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        Sr. no
                      </FormLabel>
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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        Vehicle ID / Code (For No Number Gadi) *
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. EX-07, D-12" data-testid="input-vehicle-code" />
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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        Registration No. (Agar Hai To)
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. RJ-14-EA-1234" data-testid="input-registration-no" />
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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        Vehicle Type
                      </FormLabel>
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
                    <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                      Owner Name (Gadi Kis ke Name Par)
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Owner name / entity" data-testid="input-owner-name" />
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
                    <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                      Installed Location
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Mines Pit A, Crusher 1" data-testid="input-installed-location" />
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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        Chasis No.
                      </FormLabel>
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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        Engine No.
                      </FormLabel>
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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        GPS IMEI / ID No.
                      </FormLabel>
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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        GPS Status
                      </FormLabel>
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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        Camera Status
                      </FormLabel>
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
                      <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                        Maintenance Status
                      </FormLabel>
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
                    <FormLabel className="text-[11px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                      Permit Type
                    </FormLabel>
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
                <div className="mb-2 text-[11px] font-extrabold text-foreground">Registration</div>
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
                <div className="mb-2 text-[11px] font-extrabold text-foreground">Insurance</div>
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
                <div className="mb-2 text-[11px] font-extrabold text-foreground">Fitness</div>
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
                <div className="mb-2 text-[11px] font-extrabold text-foreground">PUCC (Pollution)</div>
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
              data-testid="button-submit-add-vehicle"
            >
              {busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
              {busy ? "Saving" : "Add Vehicle"}
            </Button>
          </div>

          {create.isError && (
            <p className="flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-vehicle-add-error">
              <TriangleAlert size={14} /> Could not add vehicle. Try again.
            </p>
          )}
        </form>
      </Form>
    </div>
  );
}
