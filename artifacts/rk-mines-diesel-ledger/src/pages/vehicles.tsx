import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Archive, Check, Edit3, Gauge, Plus, RefreshCw, Search, Truck, TriangleAlert, X } from 'lucide-react';
import {
  getListVehiclesQueryKey,
} from '@workspace/api-client-react';
import type { Vehicle } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/app-shell';
import { useOfflineCreateVehicle, useOfflineDeleteVehicle, useOfflineListVehicles, useOfflineUpdateVehicle } from '@/lib/offline-api';

const vehicleSchema = z.object({ vehicleNo: z.string().trim().min(1, 'Vehicle number is required'), vehicleName: z.string().trim().min(1, 'Vehicle name is required') });
type VehicleForm = z.infer<typeof vehicleSchema>;

function VehicleFormPanel({ editing, onDone }: { editing: Vehicle | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const create = useOfflineCreateVehicle();
  const update = useOfflineUpdateVehicle();
  const form = useForm<VehicleForm>({ resolver: zodResolver(vehicleSchema), defaultValues: { vehicleNo: editing?.vehicleNo ?? '', vehicleName: editing?.vehicleName ?? '' } });
  useEffect(() => {
    form.reset({ vehicleNo: editing?.vehicleNo ?? '', vehicleName: editing?.vehicleName ?? '' });
  }, [editing, form]);
  const submit = (values: VehicleForm) => {
    if (editing) update.mutate({ id: editing.id, data: values }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }); onDone(); } });
    else create.mutate({ data: values }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }); form.reset(); onDone(); } });
  };
  const busy = create.isPending || update.isPending;
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-[0_7px_22px_rgba(40,53,58,.045)]" data-testid="panel-vehicle-form">
      <div className="mb-5 flex items-start justify-between"><div><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary"><Plus size={15} /></span><h2 className="font-extrabold">{editing ? 'Edit vehicle' : 'Add vehicle'}</h2></div><p className="mt-1 text-xs text-muted-foreground">{editing ? 'Keep the master list accurate.' : 'Add a vehicle before logging movement.'}</p></div>{editing && <button type="button" onClick={onDone} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" data-testid="button-cancel-vehicle-edit"><X size={16} /></button>}</div>
      <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-4"><FormField control={form.control} name="vehicleNo" render={({ field }) => <FormItem><FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Vehicle number</FormLabel><FormControl><Input {...field} placeholder="e.g. EX-07" data-testid="input-vehicle-number" /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="vehicleName" render={({ field }) => <FormItem><FormLabel className="text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground">Vehicle name</FormLabel><FormControl><Input {...field} placeholder="e.g. Volvo haul truck" data-testid="input-vehicle-name" /></FormControl><FormMessage /></FormItem>} /><Button type="submit" disabled={busy} className="w-full gap-2 rounded-lg bg-primary font-bold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)]" data-testid="button-save-vehicle">{busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}{busy ? 'Saving' : editing ? 'Save vehicle' : 'Add vehicle'}</Button>{(create.isError || update.isError) && <p className="flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-vehicle-error"><TriangleAlert size={14} /> Could not save vehicle. Try again.</p>}</form></Form>
    </div>
  );
}

export default function Vehicles() {
  const queryClient = useQueryClient();
  const query = useOfflineListVehicles();
  const archive = useOfflineDeleteVehicle();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const vehiclesResponseInvalid = query.data != null && !Array.isArray(query.data);
  const vehicles = useMemo(() => (Array.isArray(query.data) ? query.data as Vehicle[] : []).filter((item) => item.active && `${item.vehicleNo} ${item.vehicleName}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  const handleArchive = (vehicle: Vehicle) => {
    if (!window.confirm(`Archive ${vehicle.vehicleNo} from the active fleet?`)) return;
    archive.mutate({ id: vehicle.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }); if (selected?.id === vehicle.id) setSelected(null); } });
  };
  return (
    <AppShell>
      <div className="animate-rise">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-primary"><span className="size-1.5 rounded-full bg-primary" /> Master data</div><h1 className="text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Vehicles <span className="font-normal text-muted-foreground/55">/</span> <span className="text-foreground/65">Active fleet</span></h1><p className="mt-2 text-sm text-muted-foreground">The vehicles available to receive diesel on the register.</p></div><div className="rounded-xl border border-card-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground" data-testid="text-active-vehicle-count"><span className="font-bold text-foreground">{vehicles.length.toString().padStart(2, '0')}</span> active units</div></div>
        {(query.isError || vehiclesResponseInvalid) && <div className="mb-5 flex items-center justify-between rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive" data-testid="status-vehicles-error"><span className="flex items-center gap-2"><TriangleAlert size={15} /> Could not load the vehicle master list.</span><button type="button" onClick={() => query.refetch()} className="font-bold underline" data-testid="button-retry-vehicles">Retry</button></div>}
        <div className="grid gap-5 xl:grid-cols-[minmax(310px,370px)_1fr]">
          <VehicleFormPanel editing={editing} onDone={() => setEditing(null)} />
          <section className="min-w-0 rounded-2xl border border-card-border bg-card shadow-[0_7px_22px_rgba(40,53,58,.045)]" data-testid="panel-vehicle-list">
            <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="font-extrabold">Fleet register</h2><p className="mt-1 text-xs text-muted-foreground">Select a unit to inspect its details.</p></div><label className="relative block sm:w-56"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search fleet" className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-search-vehicles" /></label></div>
            {query.isLoading ? <div className="space-y-2 p-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-[68px] animate-pulse-soft rounded-xl bg-muted" />)}</div> : vehicles.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center"><span className="mb-3 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"><Truck size={19} /></span><p className="text-sm font-bold">{search ? 'No matching vehicles' : 'No active vehicles yet'}</p><p className="mt-1 max-w-xs text-xs text-muted-foreground">{search ? 'Try another vehicle number or name.' : 'Use the form to add the first unit to the active fleet.'}</p></div> : <div className="divide-y divide-border/60">{vehicles.map((vehicle) => <div role="button" tabIndex={0} key={vehicle.id} onClick={() => setSelected(vehicle)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelected(vehicle); }} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/35 sm:px-5 ${selected?.id === vehicle.id ? 'bg-primary/5' : ''}`} data-testid={`card-vehicle-${vehicle.id}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary font-mono text-xs font-medium text-secondary-foreground">{vehicle.vehicleNo.slice(-2)}</span><span className="min-w-0 flex-1"><span className="block font-mono text-sm font-medium">{vehicle.vehicleNo}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{vehicle.vehicleName}</span></span><span className="mr-2 hidden items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-emerald-700 sm:flex"><span className="size-1.5 rounded-full bg-emerald-500" />Active</span><span className="flex shrink-0 gap-1"><span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); setEditing(vehicle); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); setEditing(vehicle); } }} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Edit vehicle" data-testid={`button-edit-vehicle-${vehicle.id}`}><Edit3 size={14} /></span><span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); handleArchive(vehicle); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); handleArchive(vehicle); } }} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Archive vehicle" data-testid={`button-archive-vehicle-${vehicle.id}`}><Archive size={14} /></span></span></div>)}</div>}
          </section>
        </div>
        {selected && <section className="mt-5 rounded-2xl border border-accent/20 bg-accent/5 p-5" data-testid={`panel-vehicle-details-${selected.id}`}><div className="flex items-start justify-between"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-accent"><Gauge size={14} /> Vehicle detail</div><h2 className="font-mono text-2xl font-medium">{selected.vehicleNo}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.vehicleName}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/10" data-testid="button-close-vehicle-details"><X size={16} /></button></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-accent/15 pt-4 sm:grid-cols-4"><div><div className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Status</div><div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" /> Active</div></div><div><div className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Record ID</div><div className="mt-1 font-mono text-sm">#{selected.id}</div></div><div><div className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Register use</div><div className="mt-1 text-sm">Diesel movement</div></div><div><div className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Next action</div><div className="mt-1 text-sm">Ready for issue</div></div></div></section>}
        {archive.isError && <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-archive-error"><TriangleAlert size={14} /> Could not archive vehicle. Try again.</p>}
      </div>
    </AppShell>
  );
}