import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createDieselRecord,
  createVehicle,
  deleteDieselRecord,
  deleteVehicle,
  getDieselSummary,
  listDieselRecords,
  listVehicles,
  listPeople,
  updateDieselRecord,
  updateVehicle,
} from '@workspace/api-client-react';
import type {
  DieselRecord,
  DieselRecordInput,
  DieselSummary,
  GetDieselSummaryParams,
  ListDieselRecordsParams,
  Vehicle,
  VehicleInput,
  VehicleUpdate,
  ListPeopleParams,
  Person,
} from '@workspace/api-client-react';
import {
  getCreateDieselRecordMutationOptions,
  getCreateVehicleMutationOptions,
  getDeleteDieselRecordMutationOptions,
  getDeleteVehicleMutationOptions,
  getGetDieselSummaryQueryKey,
  getListDieselRecordsQueryKey,
  getListVehiclesQueryKey,
  getListPeopleQueryKey,
  getUpdateDieselRecordMutationOptions,
  getUpdateVehicleMutationOptions,
} from '@workspace/api-client-react';
import { addOfflineQueue, listOfflineQueue, readCache, removeOfflineQueueItem, removeQueuedCreate, updateQueuedCreate, writeCache } from './offline-store';

const vehicleCacheKey = 'vehicles';
const recordsCacheKey = (date: string) => `diesel-records:${date}`;
const summaryCacheKey = (date: string) => `diesel-summary:${date}`;
const peopleCacheKey = (role: string) => `people:${role}`;

type OfflineError = { status?: number };

function shouldQueue(error: unknown): boolean {
  return typeof navigator !== 'undefined' && (!navigator.onLine || error instanceof TypeError || (error as OfflineError)?.status === 0);
}

async function cachedQuery<T>(key: string, request: () => Promise<T>, fallback?: () => Promise<T | undefined>): Promise<T> {
  try {
    const value = await request();
    await writeCache(key, value);
    return value;
  } catch (error) {
    const cached = await readCache<T>(key);
    if (cached !== undefined) return cached;
    const derived = await fallback?.();
    if (derived !== undefined) return derived;
    throw error;
  }
}

async function cachedVehicles(): Promise<Vehicle[]> {
  return (await readCache<Vehicle[]>(vehicleCacheKey)) ?? [];
}

async function cachedRecords(date: string): Promise<DieselRecord[]> {
  return (await readCache<DieselRecord[]>(recordsCacheKey(date))) ?? [];
}

async function buildSummary(date: string): Promise<DieselSummary | undefined> {
  const records = await readCache<DieselRecord[]>(recordsCacheKey(date));
  if (!records) return undefined;
  const stored = await readCache<DieselSummary>(summaryCacheKey(date));
  const openingBalance = stored?.openingBalance ?? records[0]?.openingBalance ?? 0;
  const totalIssued = records.reduce((sum, record) => sum + record.dieselIssued, 0);
  const totalPurchased = records.reduce((sum, record) => sum + record.dieselPurchased, 0);
  return {
    date,
    openingBalance,
    totalIssued,
    totalPurchased,
    closingBalance: records.at(-1)?.closingBalance ?? openingBalance,
    recordCount: records.length,
    recentRecords: records.slice(-5).reverse(),
  };
}

function isOfflineRecord(value: DieselRecord): boolean {
  return value.id < 0;
}

async function optimisticVehicle(input: VehicleInput): Promise<Vehicle> {
  const vehicle: Vehicle = {
    id: -Date.now(),
    srNo: input.srNo ?? null,
    vehicleCode: input.vehicleCode ?? null,
    registrationNo: input.registrationNo ?? null,
    ownerName: input.ownerName ?? null,
    installedLocation: input.installedLocation ?? null,
    vehicleType: input.vehicleType ?? null,
    chassisNo: input.chassisNo ?? null,
    engineNo: input.engineNo ?? null,
    gpsImeiNo: input.gpsImeiNo ?? null,
    gpsStatus: input.gpsStatus ?? null,
    cameraStatus: input.cameraStatus ?? null,
    maintenanceStatus: input.maintenanceStatus ?? null,
    permitType: input.permitType ?? null,
    registrationFrom: input.registrationFrom ?? null,
    registrationTill: input.registrationTill ?? null,
    registrationStatus: input.registrationStatus ?? null,
    insuranceFrom: input.insuranceFrom ?? null,
    insuranceTill: input.insuranceTill ?? null,
    insuranceStatus: input.insuranceStatus ?? null,
    fitnessFrom: input.fitnessFrom ?? null,
    fitnessTill: input.fitnessTill ?? null,
    fitnessStatus: input.fitnessStatus ?? null,
    puccTill: input.puccTill ?? null,
    puccStatus: input.puccStatus ?? null,
    vehicleNo: input.vehicleNo || input.registrationNo || input.vehicleCode || 'UNNAMED',
    vehicleName: input.vehicleName || (input.ownerName ? `${input.vehicleType || 'Vehicle'} (${input.ownerName})` : input.vehicleType || input.vehicleCode || 'Vehicle'),
    active: true,
  };
  await writeCache(vehicleCacheKey, [...await cachedVehicles(), vehicle]);
  return vehicle;
}

async function optimisticVehicleUpdate(id: number, input: VehicleUpdate): Promise<Vehicle> {
  const vehicles = await cachedVehicles();
  const existing = vehicles.find((vehicle) => vehicle.id === id);
  if (!existing) throw new Error('Vehicle is not available offline.');
  const updated = { ...existing, ...input };
  await writeCache(vehicleCacheKey, vehicles.map((vehicle) => vehicle.id === id ? updated : vehicle));
  return updated;
}

async function optimisticVehicleDelete(id: number): Promise<void> {
  const vehicles = await cachedVehicles();
  await writeCache(vehicleCacheKey, vehicles.map((vehicle) => vehicle.id === id ? { ...vehicle, active: false } : vehicle));
}

async function optimisticRecord(input: DieselRecordInput): Promise<DieselRecord> {
  const vehicles = await cachedVehicles();
  const vehicle = vehicles.find((item) => item.id === input.vehicleId);
  if (!vehicle) throw new Error('Vehicle is not available offline. Sync the vehicle list first.');
  const records = await cachedRecords(input.date);
  const storedSummary = await readCache<DieselSummary>(summaryCacheKey(input.date));
  const openingBalance = records.at(-1)?.closingBalance ?? storedSummary?.closingBalance ?? 0;
  const record: DieselRecord = {
    id: -Date.now(),
    date: input.date,
    vehicleId: input.vehicleId,
    vehicleNo: vehicle.vehicleNo ?? vehicle.vehicleCode ?? '',
    vehicleName: vehicle.vehicleName ?? vehicle.ownerName ?? 'Vehicle',
    openingBalance,
    reading: input.reading ?? null,
    dieselIssued: input.dieselIssued,
    dieselPurchased: input.dieselPurchased,
    closingBalance: openingBalance + input.dieselPurchased - input.dieselIssued,
    operator: input.operator,
    issuer: input.issuer,
    createdAt: new Date().toISOString(),
  };
  const nextRecords = [...records, record];
  await writeCache(recordsCacheKey(input.date), nextRecords);
  const summary = await buildSummary(input.date);
  if (summary) await writeCache(summaryCacheKey(input.date), summary);
  return record;
}

async function optimisticRecordUpdate(id: number, input: DieselRecordInput): Promise<DieselRecord> {
  const records = await cachedRecords(input.date);
  const existing = records.find((record) => record.id === id);
  if (!existing) throw new Error('Record is not available offline.');
  const updated = { ...existing, ...input, reading: input.reading ?? null };
  await writeCache(recordsCacheKey(input.date), records.map((record) => record.id === id ? updated : record));
  const summary = await buildSummary(input.date);
  if (summary) await writeCache(summaryCacheKey(input.date), summary);
  return updated;
}

async function optimisticRecordDelete(id: number, date?: string): Promise<void> {
  if (!date) return;
  const records = await cachedRecords(date);
  await writeCache(recordsCacheKey(date), records.filter((record) => record.id !== id));
  const summary = await buildSummary(date);
  if (summary) await writeCache(summaryCacheKey(date), summary);
}

export function useOfflineListVehicles() {
  return useQuery({ queryKey: getListVehiclesQueryKey(), queryFn: () => cachedQuery(vehicleCacheKey, listVehicles) });
}

export function useOfflineListPeople(params: ListPeopleParams) {
  return useQuery({
    queryKey: getListPeopleQueryKey(params),
    queryFn: () => cachedQuery<Person[]>(peopleCacheKey(params.role), () => listPeople(params)),
  });
}

export function useOfflineListDieselRecords(params: ListDieselRecordsParams) {
  return useQuery({ queryKey: getListDieselRecordsQueryKey(params), queryFn: () => cachedQuery(recordsCacheKey(params.date), () => listDieselRecords(params)) });
}

export function useOfflineGetDieselSummary(params: GetDieselSummaryParams) {
  return useQuery({ queryKey: getGetDieselSummaryQueryKey(params), queryFn: () => cachedQuery(summaryCacheKey(params.date), () => getDieselSummary(params), () => buildSummary(params.date)) });
}

export function useOfflineCreateVehicle() {
  return useMutation({
    ...getCreateVehicleMutationOptions(),
    mutationFn: async ({ data }: { data: VehicleInput }) => {
      try {
        const result = await createVehicle(data);
        await writeCache(vehicleCacheKey, [...(await cachedVehicles()).filter((vehicle) => vehicle.id >= 0), result]);
        return result;
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        const result = await optimisticVehicle(data);
        await addOfflineQueue('createVehicle', { temporaryId: result.id, data });
        return result;
      }
    },
  });
}

export function useOfflineUpdateVehicle() {
  return useMutation({
    ...getUpdateVehicleMutationOptions(),
    mutationFn: async ({ id, data }: { id: number; data: VehicleUpdate }) => {
      try {
        const result = await updateVehicle(id, data);
        await writeCache(vehicleCacheKey, (await cachedVehicles()).map((vehicle) => vehicle.id === id ? result : vehicle));
        return result;
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        if (id < 0) {
          const result = await optimisticVehicleUpdate(id, data);
          await updateQueuedCreate('createVehicle', id, data);
          return result;
        }
        const result = await optimisticVehicleUpdate(id, data);
        await addOfflineQueue('updateVehicle', { id, data });
        return result;
      }
    },
  });
}

export function useOfflineDeleteVehicle() {
  return useMutation({
    ...getDeleteVehicleMutationOptions(),
    mutationFn: async ({ id }: { id: number }) => {
      try {
        await deleteVehicle(id);
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        if (id < 0) {
          await optimisticVehicleDelete(id);
          await removeQueuedCreate('createVehicle', id);
          return;
        }
        await optimisticVehicleDelete(id);
        await addOfflineQueue('deleteVehicle', { id });
      }
    },
  });
}

export function useOfflineCreateDieselRecord() {
  return useMutation({
    ...getCreateDieselRecordMutationOptions(),
    mutationFn: async ({ data }: { data: DieselRecordInput }) => {
      try {
        const result = await createDieselRecord(data);
        await writeCache(recordsCacheKey(data.date), [...(await cachedRecords(data.date)).filter((record) => !isOfflineRecord(record)), result]);
        return result;
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        const result = await optimisticRecord(data);
        await addOfflineQueue('createDieselRecord', { temporaryId: result.id, data });
        return result;
      }
    },
  });
}

export function useOfflineUpdateDieselRecord() {
  return useMutation({
    ...getUpdateDieselRecordMutationOptions(),
    mutationFn: async ({ id, data }: { id: number; data: DieselRecordInput }) => {
      try {
        const result = await updateDieselRecord(id, data);
        await writeCache(recordsCacheKey(data.date), (await cachedRecords(data.date)).map((record) => record.id === id ? result : record));
        return result;
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        if (id < 0) {
          const result = await optimisticRecordUpdate(id, data);
          await updateQueuedCreate('createDieselRecord', id, data);
          return result;
        }
        const result = await optimisticRecordUpdate(id, data);
        await addOfflineQueue('updateDieselRecord', { id, data });
        return result;
      }
    },
  });
}

export function useOfflineDeleteDieselRecord(date?: string) {
  return useMutation({
    ...getDeleteDieselRecordMutationOptions(),
    mutationFn: async ({ id }: { id: number }) => {
      try {
        await deleteDieselRecord(id);
      } catch (error) {
        if (!shouldQueue(error)) throw error;
        if (id < 0) {
          await optimisticRecordDelete(id, date);
          await removeQueuedCreate('createDieselRecord', id);
          return;
        }
        await optimisticRecordDelete(id, date);
        await addOfflineQueue('deleteDieselRecord', { id });
      }
    },
  });
}

export async function syncOfflineQueue(): Promise<number> {
  const queue = await listOfflineQueue();
  let synced = 0;
  for (const item of queue) {
    try {
      if (item.kind === 'createVehicle') await createVehicle(((item.payload as { data?: VehicleInput }).data ?? item.payload) as VehicleInput);
      if (item.kind === 'updateVehicle') {
        const payload = item.payload as { id: number; data: VehicleUpdate };
        await updateVehicle(payload.id, payload.data);
      }
      if (item.kind === 'deleteVehicle') await deleteVehicle((item.payload as { id: number }).id);
      if (item.kind === 'createDieselRecord') await createDieselRecord(((item.payload as { data?: DieselRecordInput }).data ?? item.payload) as DieselRecordInput);
      if (item.kind === 'updateDieselRecord') {
        const payload = item.payload as { id: number; data: DieselRecordInput };
        await updateDieselRecord(payload.id, payload.data);
      }
      if (item.kind === 'deleteDieselRecord') await deleteDieselRecord((item.payload as { id: number }).id);
      if (item.id !== undefined) await removeOfflineQueueItem(item.id);
      synced += 1;
    } catch {
      break;
    }
  }
  if (synced > 0) window.dispatchEvent(new Event('offline-sync-complete'));
  return synced;
}
