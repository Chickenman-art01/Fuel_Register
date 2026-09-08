import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, RefreshCw, TriangleAlert, X } from "lucide-react";
import { getListVehiclesQueryKey, type Vehicle } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useOfflineCreateVehicle, useOfflineUpdateVehicle } from "@/lib/offline-api";

export const vehicleSchema = z.object({
  vehicleNo: z.string().trim().min(1, "Vehicle number is required"),
  vehicleName: z.string().trim().min(1, "Vehicle name is required"),
});
export type VehicleForm = z.infer<typeof vehicleSchema>;

export interface VehicleEntryFormProps {
  editing: Vehicle | null;
  onDone: () => void;
}

export function VehicleEntryForm({ editing, onDone }: VehicleEntryFormProps) {
  const queryClient = useQueryClient();
  const create = useOfflineCreateVehicle();
  const update = useOfflineUpdateVehicle();
  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicleNo: editing?.vehicleNo ?? "",
      vehicleName: editing?.vehicleName ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      vehicleNo: editing?.vehicleNo ?? "",
      vehicleName: editing?.vehicleName ?? "",
    });
  }, [editing, form]);

  const submit = (values: VehicleForm) => {
    if (editing) {
      update.mutate(
        { id: editing.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
            onDone();
          },
        }
      );
    } else {
      create.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
            form.reset();
            onDone();
          },
        }
      );
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_7px_22px_rgba(40,53,58,.045)]" data-testid="panel-vehicle-form">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
              <Plus size={15} />
            </span>
            <h2 className="font-extrabold">{editing ? "Edit vehicle" : "Add vehicle"}</h2>
          </div>
        </div>
        {editing && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            data-testid="button-cancel-vehicle-edit"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="vehicleNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                  Vehicle number
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. EX-07" data-testid="input-vehicle-number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                  Vehicle name
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Volvo haul truck" data-testid="input-vehicle-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={busy}
            className="w-full gap-2 rounded-lg bg-primary font-bold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)]"
            data-testid="button-save-vehicle"
          >
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
            {busy ? "Saving" : editing ? "Save vehicle" : "Add vehicle"}
          </Button>

          {(create.isError || update.isError) && (
            <p className="flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-vehicle-error">
              <TriangleAlert size={14} /> Could not save vehicle. Try again.
            </p>
          )}
        </form>
      </Form>
    </div>
  );
}

// Backward compatibility alias
export const VehicleFormPanel = VehicleEntryForm;
