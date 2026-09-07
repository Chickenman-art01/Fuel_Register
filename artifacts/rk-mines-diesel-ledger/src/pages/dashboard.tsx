import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownToLine, ArrowUpFromLine, CalendarDays, Check, ChevronLeft, ChevronRight,
  Edit3, Fuel, Plus, RefreshCw, Save, Trash2, TriangleAlert, X,
} from 'lucide-react';
import {
  getGetDieselSummaryQueryKey, getListDieselRecordsQueryKey, getListVehiclesQueryKey,
  useListVehicles,
} from '@workspace/api-client-react';
import type { DieselRecord, DieselRecordInput, DieselSummary, Vehicle } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/app-shell';
import {
  useOfflineCreateDieselRecord, useOfflineDeleteDieselRecord, useOfflineGetDieselSummary,
  useOfflineListDieselRecords, useOfflineListVehicles, useOfflineUpdateDieselRecord,
} from '@/lib/offline-api';

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const recordSchema = z.object({
  vehicleId: z.coerce.number().min(1, 'Choose a vehicle'),
  reading: z.preprocess((value) => value === '' || value === undefined ? null : value, z.coerce.number().nullable()),
  dieselIssued: z.coerce.number().min(0, 'Cannot be negative'),
  dieselPurchased: z.coerce.number().min(0, 'Cannot be negative'),
  operator: z.string().trim().min(1, 'Operator is required'),
  issuer: z.string().trim().min(1, 'Issuer is required'),
});
type RecordForm = z.infer<typeof recordSchema>;
type EntryMode = 'issue' | 'purchase';

const litres = (value?: number | null) => `${(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} L`;
const shortDate = (date: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
const timeLabel = (stamp: string) => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(stamp));
const shiftDate = (value: string, amount: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
};

function SummarySkeleton() {
  return <div className="grid animate-pulse-soft gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-[112px] rounded-2xl bg-muted" />)}</div>;
}

function SummaryCards({ summary }: { summary: DieselSummary }) {
  const cards = [
    { label: 'Opening balance', value: summary.openingBalance, tone: 'plain', icon: Fuel },
    { label: 'Issued today', value: summary.totalIssued, tone: 'orange', icon: ArrowUpFromLine },
    { label: 'Purchased today', value: summary.totalPurchased, tone: 'teal', icon: ArrowDownToLine },
    { label: 'Closing balance', value: summary.closingBalance, tone: 'dark', icon: Check },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, tone, icon: Icon }, index) => (
        <div key={label} className={`animate-rise relative overflow-hidden rounded-2xl border p-4 shadow-[0_5px_18px_rgba(40,53,58,.035)] ${tone === 'dark' ? 'border-sidebar bg-sidebar text-sidebar-foreground' : tone === 'orange' ? 'border-primary/25 bg-primary/10' : tone === 'teal' ? 'border-accent/20 bg-accent/10' : 'border-card-border bg-card'}`} style={{ animationDelay: `${index * 60}ms` }} data-testid={`card-summary-${label.toLowerCase().replaceAll(' ', '-')}`}>
          <div className="flex items-start justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-[.13em] ${tone === 'dark' ? 'text-sidebar-foreground/55' : 'text-muted-foreground'}`}>{label}</span>
            <Icon size={16} className={tone === 'dark' ? 'text-primary' : tone === 'teal' ? 'text-accent' : tone === 'orange' ? 'text-primary' : 'text-muted-foreground'} />
          </div>
          <div className={`mt-4 font-mono text-2xl font-medium tracking-tight ${tone === 'dark' ? 'text-primary' : ''}`} data-testid={`text-summary-${label.toLowerCase().replaceAll(' ', '-')}`}>{litres(value)}</div>
          {tone === 'dark' && <span className="absolute -bottom-8 -right-3 select-none font-mono text-8xl font-medium text-primary/10">L</span>}
        </div>
      ))}
    </div>
  );
}

function RecordFormPanel({ date, vehicles, editing, summary, onDone, onDateChange }: { date: string; vehicles: Vehicle[]; editing: DieselRecord | null; summary?: DieselSummary; onDone: () => void; onDateChange: (date: string) => void }) {
  const queryClient = useQueryClient();
  const create = useOfflineCreateDieselRecord();
  const update = useOfflineUpdateDieselRecord();
  const [entryMode, setEntryMode] = useState<EntryMode>((editing?.dieselPurchased ?? 0) > 0 && (editing?.dieselIssued ?? 0) === 0 ? 'purchase' : 'issue');
  const form = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: { vehicleId: editing?.vehicleId ?? 0, reading: editing?.reading ?? null, dieselIssued: editing?.dieselIssued ?? 0, dieselPurchased: editing?.dieselPurchased ?? 0, operator: editing?.operator ?? '', issuer: editing?.issuer ?? '' },
  });

  useEffect(() => {
    setEntryMode((editing?.dieselPurchased ?? 0) > 0 && (editing?.dieselIssued ?? 0) === 0 ? 'purchase' : 'issue');
    form.reset({ vehicleId: editing?.vehicleId ?? 0, reading: editing?.reading ?? null, dieselIssued: editing?.dieselIssued ?? 0, dieselPurchased: editing?.dieselPurchased ?? 0, operator: editing?.operator ?? '', issuer: editing?.issuer ?? '' });
  }, [editing, form]);

  const changeEntryMode = (mode: EntryMode) => {
    setEntryMode(mode);
    if (mode === 'issue') {
      form.setValue('dieselIssued', editing?.dieselIssued ?? 0);
      form.setValue('dieselPurchased', 0);
    } else {
      form.setValue('dieselIssued', 0);
      form.setValue('dieselPurchased', editing?.dieselPurchased ?? 0);
      form.setValue('reading', null);
    }
  };

  const submit = (values: RecordForm) => {
    const payload: DieselRecordInput = { date, vehicleId: Number(values.vehicleId), reading: values.reading === null ? null : Number(values.reading), dieselIssued: Number(values.dieselIssued), dieselPurchased: Number(values.dieselPurchased), operator: values.operator, issuer: values.issuer };
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetDieselSummaryQueryKey({ date }) });
      queryClient.invalidateQueries({ queryKey: getListDieselRecordsQueryKey({ date }) });
      if (!editing) form.reset({ vehicleId: 0, reading: null, dieselIssued: 0, dieselPurchased: 0, operator: '', issuer: '' });
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
            <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary"><Plus size={15} strokeWidth={2.5} /></span>
            <h2 className="font-extrabold tracking-tight">{editing ? 'Edit movement' : 'Record movement'}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{editing ? 'Correct the record below and save the ledger.' : 'Issue or receive diesel against a vehicle.'}</p>
        </div>
        {editing && <button type="button" onClick={onDone} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="button-cancel-edit"><X size={16} /></button>}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Entry type">
        <button
          type="button"
          role="tab"
          aria-selected={entryMode === 'issue'}
          onClick={() => changeEntryMode('issue')}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${entryMode === 'issue' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          data-testid="button-entry-mode-issue"
        >
          Issue entry
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={entryMode === 'purchase'}
          onClick={() => changeEntryMode('purchase')}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition ${entryMode === 'purchase' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          data-testid="button-entry-mode-purchase"
        >
          Purchase entry
        </button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="entry-date" className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Entry date</label>
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
          <FormField control={form.control} name="vehicleId" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Vehicle</FormLabel>
              <FormControl><select {...field} value={field.value || ''} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="select-record-vehicle"><option value="" disabled>Select vehicle</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNo} · {v.vehicleName}</option>)}</select></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          {entryMode === 'issue' ? (
            <>
              <FormField control={form.control} name="dieselIssued" render={({ field }) => <FormItem><FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Diesel issued (L)</FormLabel><FormControl><Input type="number" min="0" step="0.1" {...field} data-testid="input-diesel-issued" /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="reading" render={({ field }) => <FormItem><FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Meter reading</FormLabel><FormControl><Input type="number" min="0" step="1" value={field.value ?? ''} onChange={field.onChange} placeholder="Enter vehicle reading" data-testid="input-meter-reading" /></FormControl><FormMessage /></FormItem>} />
            </>
          ) : (
            <FormField control={form.control} name="dieselPurchased" render={({ field }) => <FormItem><FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Diesel purchased (L)</FormLabel><FormControl><Input type="number" min="0" step="0.1" {...field} data-testid="input-diesel-purchased" /></FormControl><FormMessage /></FormItem>} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField control={form.control} name="operator" render={({ field }) => <FormItem><FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Operator</FormLabel><FormControl><Input {...field} placeholder="Full name" data-testid="input-operator" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="issuer" render={({ field }) => <FormItem><FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Issued by</FormLabel><FormControl><Input {...field} placeholder="Full name" data-testid="input-issuer" /></FormControl><FormMessage /></FormItem>} />
          </div>
          <div className="flex items-center justify-between border-t border-border/70 pt-4">
            <span className="text-[11px] text-muted-foreground">{summary ? `Closing after ${entryMode}: ${litres(summary.closingBalance)}` : 'Balances update after save'}</span>
            <Button type="submit" disabled={busy || vehicles.length === 0} className="gap-2 rounded-lg bg-primary font-bold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)] hover:bg-primary/90" data-testid="button-save-record">{busy ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}{busy ? 'Saving' : editing ? 'Save changes' : 'Add to ledger'}</Button>
          </div>
          {(create.isError || update.isError) && <p className="flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-record-error"><TriangleAlert size={14} /> Could not save this movement. Try again.</p>}
        </form>
      </Form>
    </section>
  );
}

function RecentRecords({ records, onEdit, onDelete, deleting }: { records: DieselRecord[]; onEdit: (record: DieselRecord) => void; onDelete: (id: number) => void; deleting: boolean }) {
  return (
    <section className="min-w-0 rounded-2xl border border-card-border bg-card shadow-[0_7px_22px_rgba(40,53,58,.045)]" data-testid="panel-recent-records">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-4 sm:px-5">
        <div><h2 className="font-extrabold tracking-tight">Recent movement</h2><p className="mt-1 text-xs text-muted-foreground">Latest entries for the selected day</p></div>
        <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] font-medium text-muted-foreground" data-testid="text-record-count">{records.length.toString().padStart(2, '0')} entries</span>
      </div>
      {records.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center"><span className="mb-3 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground"><Fuel size={18} /></span><p className="text-sm font-bold">No movement logged</p><p className="mt-1 max-w-xs text-xs text-muted-foreground">Entries added for this date will appear here.</p></div> :
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-muted/45 text-[10px] font-extrabold uppercase tracking-[.12em] text-muted-foreground"><tr><th className="px-4 py-3 sm:px-5">Vehicle</th><th className="px-3 py-3">Movement</th><th className="px-3 py-3">Reading</th><th className="px-3 py-3">People</th><th className="px-3 py-3">Logged</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border/60">{records.map((record) => <tr key={record.id} className="group transition-colors hover:bg-muted/30" data-testid={`row-record-${record.id}`}><td className="px-4 py-3 sm:px-5"><div className="font-mono text-xs font-medium">{record.vehicleNo}</div><div className="mt-0.5 max-w-[145px] truncate text-[11px] text-muted-foreground">{record.vehicleName}</div></td><td className="px-3 py-3"><div className="flex gap-2 font-mono text-xs"><span className="text-primary">+{litres(record.dieselPurchased)}</span><span className="text-destructive">−{litres(record.dieselIssued)}</span></div><div className="mt-1 text-[10px] text-muted-foreground">net {litres(record.dieselPurchased - record.dieselIssued)}</div></td><td className="px-3 py-3 font-mono text-xs text-foreground/75">{record.reading == null ? '—' : record.reading.toLocaleString('en-IN')}</td><td className="px-3 py-3 text-[11px]"><div>{record.operator}</div><div className="text-muted-foreground">by {record.issuer}</div></td><td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{timeLabel(record.createdAt)}</td><td className="px-3 py-3 text-right"><div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100"><button type="button" onClick={() => onEdit(record)} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Edit record" data-testid={`button-edit-record-${record.id}`}><Edit3 size={14} /></button><button type="button" onClick={() => onDelete(record.id)} disabled={deleting} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete record" data-testid={`button-delete-record-${record.id}`}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>}
    </section>
  );
}

export default function Dashboard() {
  const [date, setDate] = useState(today);
  const [editing, setEditing] = useState<DieselRecord | null>(null);
  const queryClient = useQueryClient();
  const summaryQuery = useOfflineGetDieselSummary({ date });
  const recordsQuery = useOfflineListDieselRecords({ date });
  const vehiclesQuery = useOfflineListVehicles();
  const deleteRecord = useOfflineDeleteDieselRecord(date);
  const vehiclesResponseInvalid = vehiclesQuery.data != null && !Array.isArray(vehiclesQuery.data);
  const vehicles = useMemo(() => (Array.isArray(vehiclesQuery.data) ? vehiclesQuery.data as Vehicle[] : []).filter((v) => v.active), [vehiclesQuery.data]);
  const summary = summaryQuery.data;
  const records = recordsQuery.data ?? summary?.recentRecords ?? [];

  const changeDate = (next: string) => { setEditing(null); setDate(next); };
  const handleDelete = (id: number) => {
    if (!window.confirm('Delete this diesel movement? This cannot be undone.')) return;
    deleteRecord.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetDieselSummaryQueryKey({ date }) }); queryClient.invalidateQueries({ queryKey: getListDieselRecordsQueryKey({ date }) }); } });
  };
  const hasError = summaryQuery.isError || recordsQuery.isError || vehiclesQuery.isError || vehiclesResponseInvalid;

  return (
    <AppShell>
      <div className="animate-rise">
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-primary"><span className="size-1.5 rounded-full bg-primary" /> Daily register</div><h1 className="text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Control room <span className="font-normal text-muted-foreground/55">/</span> <span className="text-foreground/65">{shortDate(date)}</span></h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">A clean read on what came in, what went out, and what remains at the tank.</p></div>
          <div className="flex items-center gap-2 rounded-xl border border-card-border bg-card p-1.5 shadow-sm" data-testid="date-navigation"><button type="button" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => changeDate(shiftDate(date, -1))} data-testid="button-previous-date"><ChevronLeft size={17} /></button><div className="relative flex items-center gap-2 px-2"><CalendarDays size={15} className="text-primary" /><input type="date" value={date} onChange={(event) => changeDate(event.target.value)} className="w-[126px] bg-transparent font-mono text-xs font-medium outline-none" data-testid="input-selected-date" /></div><button type="button" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => changeDate(shiftDate(date, 1))} data-testid="button-next-date"><ChevronRight size={17} /></button></div>
        </div>
        {hasError ? <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive" data-testid="status-dashboard-error"><span className="flex items-center gap-2"><TriangleAlert size={16} /> Some ledger data could not be loaded.</span><button type="button" onClick={() => { summaryQuery.refetch(); recordsQuery.refetch(); vehiclesQuery.refetch(); }} className="flex items-center gap-1.5 font-bold underline" data-testid="button-retry-dashboard"><RefreshCw size={13} /> Retry</button></div> : null}
        {summaryQuery.isLoading ? <SummarySkeleton /> : summary ? <SummaryCards summary={summary} /> : <div className="rounded-2xl border border-dashed border-card-border p-8 text-center text-sm text-muted-foreground" data-testid="empty-summary">No summary available for this date.</div>}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(310px,370px)_1fr]">
          <RecordFormPanel date={date} vehicles={vehicles} editing={editing} summary={summary} onDone={() => setEditing(null)} onDateChange={changeDate} />
          {recordsQuery.isLoading ? <div className="min-h-[300px] animate-pulse-soft rounded-2xl bg-muted" data-testid="skeleton-records" /> : <RecentRecords records={records} onEdit={setEditing} onDelete={handleDelete} deleting={deleteRecord.isPending} />}
        </div>
        {deleteRecord.isError && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-delete-record-error"><TriangleAlert size={14} /> Could not delete this movement. Refresh and try again.</p>}
      </div>
    </AppShell>
  );
}