import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Save, TriangleAlert, X } from "lucide-react";
import {
  getGetDieselSummaryQueryKey,
  getListDieselRecordsQueryKey,
  type DieselRecord,
  type DieselRecordInput,
  type DieselSummary,
  type Vehicle,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useOfflineCreateDieselRecord, useOfflineUpdateDieselRecord } from "@/lib/offline-api";

const recordSchema = z.object({
  vehicleId: z.coerce.number().min(1, "Choose a vehicle"),
  reading: z.preprocess((value) => value === "" || value === undefined ? null : value, z.coerce.number().nullable()),
  dieselIssued: z.coerce.number().min(0, "Cannot be negative"),
  dieselPurchased: z.coerce.number().min(0, "Cannot be negative"),
  operator: z.string().trim().min(1, "Operator is required"),
  issuer: z.string().trim().min(1, "Issuer is required"),
});

export type RecordForm = z.infer<typeof recordSchema>;
export type EntryMode = "issue" | "purchase";

export const litres = (value?: number | null) => `${(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })} L`;

export interface FuelEntryFormProps {
  date: string;
  vehicles: Vehicle[];
  operators: string[];
  issuers: string[];
  editing: DieselRecord | null;
  summary?: DieselSummary;
  onDone: () => void;
  onDateChange: (date: string) => void;
}

export function FuelEntryForm({
  date,
  vehicles,
  operators,
  issuers,
  editing,
  summary,
  onDone,
  onDateChange,
}: FuelEntryFormProps) {
  const queryClient = useQueryClient();
  const create = useOfflineCreateDieselRecord();
  const update = useOfflineUpdateDieselRecord();
  const [entryMode, setEntryMode] = useState<EntryMode>(
    (editing?.dieselPurchased ?? 0) > 0 && (editing?.dieselIssued ?? 0) === 0 ? "purchase" : "issue"
  );

  const form = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      vehicleId: editing?.vehicleId ?? 0,
      reading: editing?.reading ?? null,
      dieselIssued: editing?.dieselIssued ?? 0,
      dieselPurchased: editing?.dieselPurchased ?? 0,
      operator: editing?.operator ?? "",
      issuer: editing?.issuer ?? "",
    },
  });

  useEffect(() => {
    setEntryMode((editing?.dieselPurchased ?? 0) > 0 && (editing?.dieselIssued ?? 0) === 0 ? "purchase" : "issue");
    form.reset({
      vehicleId: editing?.vehicleId ?? 0,
      reading: editing?.reading ?? null,
      dieselIssued: editing?.dieselIssued ?? 0,
      dieselPurchased: editing?.dieselPurchased ?? 0,
      operator: editing?.operator ?? "",
      issuer: editing?.issuer ?? "",
    });
  }, [editing, form]);

  const changeEntryMode = (mode: EntryMode) => {
    setEntryMode(mode);
    if (mode === "issue") {
      form.setValue("dieselIssued", editing?.dieselIssued ?? 0);
      form.setValue("dieselPurchased", 0);
    } else {
      form.setValue("dieselIssued", 0);
      form.setValue("dieselPurchased", editing?.dieselPurchased ?? 0);
      form.setValue("reading", null);
    }
  };

  const submit = (values: RecordForm) => {
    const payload: DieselRecordInput = {
      date,
      vehicleId: Number(values.vehicleId),
      reading: values.reading === null ? null : Number(values.reading),
      dieselIssued: Number(values.dieselIssued),
      dieselPurchased: Number(values.dieselPurchased),
      operator: values.operator,
      issuer: values.issuer,
    };
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetDieselSummaryQueryKey({ date }) });
      queryClient.invalidateQueries({ queryKey: getListDieselRecordsQueryKey({ date }) });
      if (!editing) {
        form.reset({ vehicleId: 0, reading: null, dieselIssued: 0, dieselPurchased: 0, operator: "", issuer: "" });
      }
      onDone();
    };
    if (editing) update.mutate({ id: editing.id, data: payload }, { onSuccess });
    else create.mutate({ data: payload }, { onSuccess });
  };

  const busy = create.isPending || update.isPending;

  return (
    <section className="rounded-2xl border border-card-border bg-card p-4 shadow-[0_7px_22px_rgba(40,53,58,.045)] sm:p-5" data-testid="panel-record-entry">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
              <Plus size={15} strokeWidth={2.5} />
            </span>
            <h2 className="font-extrabold tracking-tight">{editing ? "Edit movement" : "Record movement"}</h2>
          </div>
        </div>
        {editing && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            data-testid="button-cancel-edit"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Entry type">
        <button
          type="button"
          role="tab"
          aria-selected={entryMode === "issue"}
          onClick={() => changeEntryMode("issue")}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
            entryMode === "issue" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="button-entry-mode-issue"
        >
          Issue entry
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={entryMode === "purchase"}
          onClick={() => changeEntryMode("purchase")}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
            entryMode === "purchase" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="button-entry-mode-purchase"
        >
          Purchase entry
        </button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="entry-date" className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
              Entry date
            </label>
            <div>
              <Input
                id="entry-date"
                type="date"
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                data-testid="input-entry-date"
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                  Vehicle
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={field.value || ""}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    data-testid="select-record-vehicle"
                  >
                    <option value="" disabled>
                      Select vehicle
                    </option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNo} · {v.vehicleName}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {entryMode === "issue" ? (
            <>
              <FormField
                control={form.control}
                name="dieselIssued"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                      Diesel issued (L)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.1" {...field} data-testid="input-diesel-issued" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                      Meter reading
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Enter vehicle reading"
                        data-testid="input-meter-reading"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : (
            <FormField
              control={form.control}
              name="dieselPurchased"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                    Diesel purchased (L)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.1" {...field} data-testid="input-diesel-purchased" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                    Operator
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value || ""}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      data-testid="select-operator"
                    >
                      <option value="" disabled>
                        Select operator
                      </option>
                      {operators.map((name) => (
                        <option key={name} value={name}>
                          {name}
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
              name="issuer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">
                    Issued by
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value || ""}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      data-testid="select-issuer"
                    >
                      <option value="" disabled>
                        Select issuer
                      </option>
                      {issuers.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/70 pt-4">
            <span className="text-[11px] text-muted-foreground">
              {summary ? `Closing after ${entryMode}: ${litres(summary.closingBalance)}` : "Balances update after save"}
            </span>
            <Button
              type="submit"
              disabled={busy || vehicles.length === 0}
              className="gap-2 rounded-lg bg-primary font-bold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)] hover:bg-primary/90"
              data-testid="button-save-record"
            >
              {busy ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              {busy ? "Saving" : editing ? "Save changes" : "Add to ledger"}
            </Button>
          </div>

          {(create.isError || update.isError) && (
            <p className="flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-record-error">
              <TriangleAlert size={14} /> Could not save this movement. Try again.
            </p>
          )}
        </form>
      </Form>
    </section>
  );
}
