import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const authClient = createClient(supabaseUrl, supabaseAnonKey);
const db = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey);
const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

type Json = Record<string, unknown> | unknown[] | null;

type JoinedRecord = {
  id: number;
  date: string;
  vehicle_id: number;
  opening_balance: number;
  reading: number | null;
  diesel_issued: number;
  diesel_purchased: number;
  closing_balance: number;
  operator: string;
  issuer: string;
  created_at: string;
  vehicles: { vehicle_no: string; vehicle_name: string } | null;
};

function response(body: Json, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400): Response {
  return response({ error: message }, status);
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateValue(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function mapRecord(row: JoinedRecord) {
  return {
    id: Number(row.id),
    date: new Date(`${row.date}T00:00:00.000Z`),
    vehicleId: Number(row.vehicle_id),
    vehicleNo: row.vehicles?.vehicle_no ?? '',
    vehicleName: row.vehicles?.vehicle_name ?? '',
    openingBalance: numberValue(row.opening_balance),
    reading: row.reading == null ? null : numberValue(row.reading),
    dieselIssued: numberValue(row.diesel_issued),
    dieselPurchased: numberValue(row.diesel_purchased),
    closingBalance: numberValue(row.closing_balance),
    operator: row.operator,
    issuer: row.issuer,
    createdAt: new Date(row.created_at),
  };
}

async function joinedRecords(): Promise<JoinedRecord[]> {
  const { data, error } = await db
    .from('diesel_records')
    .select('*, vehicles!inner(vehicle_no, vehicle_name)')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []) as JoinedRecord[];
}

async function latestBalanceBefore(date: string): Promise<number> {
  const { data, error } = await db
    .from('diesel_records')
    .select('closing_balance')
    .lte('date', date)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return numberValue(data?.closing_balance);
}

async function recalculateBalances(): Promise<void> {
  const { data, error } = await db
    .from('diesel_records')
    .select('id, diesel_purchased, diesel_issued')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  let runningBalance = 0;
  for (const row of data ?? []) {
    const closingBalance = runningBalance + numberValue(row.diesel_purchased) - numberValue(row.diesel_issued);
    const update = await db
      .from('diesel_records')
      .update({ opening_balance: runningBalance, closing_balance: closingBalance })
      .eq('id', row.id);
    if (update.error) throw update.error;
    runningBalance = closingBalance;
  }
}

async function listVehicles(): Promise<Response> {
  const { data, error } = await db
    .from('vehicles')
    .select('id, vehicle_no, vehicle_name, active')
    .eq('active', true)
    .order('vehicle_no');
  if (error) throw error;
  return response((data ?? []).map((row) => ({
    id: Number(row.id),
    vehicleNo: row.vehicle_no,
    vehicleName: row.vehicle_name,
    active: row.active,
  })));
}

async function listPeople(role: string): Promise<Response> {
  if (role !== 'operator' && role !== 'issuer') return errorResponse('Role must be operator or issuer');
  const { data, error } = await db
    .from('staff_members')
    .select('id, name, role, active')
    .eq('role', role)
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return response((data ?? []).map((row) => ({ id: Number(row.id), name: row.name, role: row.role, active: row.active })));
}

async function createVehicle(body: Record<string, unknown>): Promise<Response> {
  const vehicleNo = String(body.vehicleNo ?? '').trim();
  const vehicleName = String(body.vehicleName ?? '').trim();
  if (!vehicleNo || !vehicleName) return errorResponse('Vehicle number and name are required');
  const { data, error } = await db
    .from('vehicles')
    .insert({ vehicle_no: vehicleNo, vehicle_name: vehicleName })
    .select('id, vehicle_no, vehicle_name, active')
    .single();
  if (error) return errorResponse(error.code === '23505' ? 'Vehicle number already exists' : error.message, 409);
  return response({ id: Number(data.id), vehicleNo: data.vehicle_no, vehicleName: data.vehicle_name, active: data.active }, 201);
}

async function updateVehicle(id: number, body: Record<string, unknown>): Promise<Response> {
  const vehicleNo = String(body.vehicleNo ?? '').trim();
  const vehicleName = String(body.vehicleName ?? '').trim();
  if (!vehicleNo || !vehicleName) return errorResponse('Vehicle number and name are required');
  const { data, error } = await db
    .from('vehicles')
    .update({ vehicle_no: vehicleNo, vehicle_name: vehicleName })
    .eq('id', id)
    .select('id, vehicle_no, vehicle_name, active')
    .maybeSingle();
  if (error) return errorResponse(error.message, 400);
  if (!data) return errorResponse('Vehicle not found', 404);
  return response({ id: Number(data.id), vehicleNo: data.vehicle_no, vehicleName: data.vehicle_name, active: data.active });
}

async function archiveVehicle(id: number): Promise<Response> {
  const { data, error } = await db.from('vehicles').update({ active: false }).eq('id', id).select('id').maybeSingle();
  if (error) return errorResponse(error.message, 400);
  if (!data) return errorResponse('Vehicle not found', 404);
  return new Response(null, { status: 204, headers: corsHeaders });
}

function roleValue(value: unknown): 'commander' | 'operator' | null {
  return value === 'commander' || value === 'operator' ? value : null;
}

function adminUnavailable(): Response {
  return errorResponse('User administration is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the Edge Function secrets.', 503);
}

async function listUsers(): Promise<Response> {
  if (!adminClient) return adminUnavailable();
  const result = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (result.error) return errorResponse(result.error.message, 400);
  return response(result.data.users.map((user) => ({
    id: user.id,
    email: user.email ?? '',
    role: user.app_metadata?.role === 'commander' ? 'commander' : 'operator',
    createdAt: user.created_at,
  })));
}

async function createUser(body: Record<string, unknown>): Promise<Response> {
  if (!adminClient) return adminUnavailable();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = roleValue(body.role);
  if (!email || password.length < 6 || !role) return errorResponse('Email, password of at least 6 characters, and a valid role are required');
  const result = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (result.error) return errorResponse(result.error.message, 400);
  return response({ id: result.data.user.id, email: result.data.user.email ?? email, role }, 201);
}

async function updateUser(id: string, body: Record<string, unknown>): Promise<Response> {
  if (!adminClient) return adminUnavailable();
  const role = roleValue(body.role);
  if (!role) return errorResponse('A valid role is required');
  const result = await adminClient.auth.admin.updateUserById(id, { app_metadata: { role } });
  if (result.error) return errorResponse(result.error.message, 400);
  return response({ id: result.data.user.id, email: result.data.user.email ?? '', role });
}

async function deleteUser(id: string): Promise<Response> {
  if (!adminClient) return adminUnavailable();
  const result = await adminClient.auth.admin.deleteUser(id);
  if (result.error) return errorResponse(result.error.message, 400);
  return new Response(null, { status: 204, headers: corsHeaders });
}

async function dieselRecords(date: string): Promise<Response> {
  const rows = (await joinedRecords()).filter((row) => row.date === date);
  return response(rows.map(mapRecord));
}

async function dieselSummary(date: string): Promise<Response> {
  const records = (await joinedRecords()).filter((row) => row.date === date).map(mapRecord);
  const openingBalance = records[0]?.openingBalance ?? await latestBalanceBefore(date);
  const totalIssued = records.reduce((sum, row) => sum + row.dieselIssued, 0);
  const totalPurchased = records.reduce((sum, row) => sum + row.dieselPurchased, 0);
  return response({
    date: new Date(`${date}T00:00:00.000Z`),
    openingBalance,
    totalIssued,
    totalPurchased,
    closingBalance: records.at(-1)?.closingBalance ?? openingBalance,
    recordCount: records.length,
    recentRecords: records.slice(-5).reverse(),
  });
}

function validateRecord(body: Record<string, unknown>) {
  const date = dateValue(body.date);
  const vehicleId = numberValue(body.vehicleId, NaN);
  const dieselIssued = numberValue(body.dieselIssued, NaN);
  const dieselPurchased = numberValue(body.dieselPurchased, NaN);
  const operator = String(body.operator ?? '').trim();
  const issuer = String(body.issuer ?? '').trim();
  if (!date || !Number.isFinite(vehicleId) || !Number.isFinite(dieselIssued) || !Number.isFinite(dieselPurchased) || !operator || !issuer) return null;
  if (dieselIssued > 0 && body.reading == null) return null;
  return { date, vehicleId, reading: body.reading == null ? null : numberValue(body.reading, NaN), dieselIssued, dieselPurchased, operator, issuer };
}

async function createRecord(body: Record<string, unknown>): Promise<Response> {
  const input = validateRecord(body);
  if (!input) return errorResponse('Invalid diesel record or missing reading');
  const vehicle = await db.from('vehicles').select('id').eq('id', input.vehicleId).eq('active', true).maybeSingle();
  if (vehicle.error) return errorResponse(vehicle.error.message, 400);
  if (!vehicle.data) return errorResponse('Vehicle not found', 404);
  const openingBalance = await latestBalanceBefore(input.date);
  const closingBalance = openingBalance + input.dieselPurchased - input.dieselIssued;
  const inserted = await db.from('diesel_records').insert({
    date: input.date, vehicle_id: input.vehicleId, reading: input.reading,
    diesel_issued: input.dieselIssued, diesel_purchased: input.dieselPurchased,
    opening_balance: openingBalance, closing_balance: closingBalance,
    operator: input.operator, issuer: input.issuer,
  }).select('id').single();
  if (inserted.error) return errorResponse(inserted.error.message, 400);
  await recalculateBalances();
  const created = (await joinedRecords()).find((row) => Number(row.id) === Number(inserted.data.id));
  return created ? response(mapRecord(created), 201) : errorResponse('Created record could not be loaded', 500);
}

async function updateRecord(id: number, body: Record<string, unknown>): Promise<Response> {
  const input = validateRecord(body);
  if (!input) return errorResponse('Invalid diesel record or missing reading');
  const vehicle = await db.from('vehicles').select('id').eq('id', input.vehicleId).eq('active', true).maybeSingle();
  if (vehicle.error) return errorResponse(vehicle.error.message, 400);
  if (!vehicle.data) return errorResponse('Vehicle not found', 404);
  const updated = await db.from('diesel_records').update({
    date: input.date, vehicle_id: input.vehicleId, reading: input.reading,
    diesel_issued: input.dieselIssued, diesel_purchased: input.dieselPurchased,
    operator: input.operator, issuer: input.issuer,
  }).eq('id', id).select('id').maybeSingle();
  if (updated.error) return errorResponse(updated.error.message, 400);
  if (!updated.data) return errorResponse('Diesel record not found', 404);
  await recalculateBalances();
  const record = (await joinedRecords()).find((row) => Number(row.id) === id);
  return record ? response(mapRecord(record)) : errorResponse('Updated record could not be loaded', 500);
}

async function deleteRecord(id: number): Promise<Response> {
  const deleted = await db.from('diesel_records').delete().eq('id', id).select('id').maybeSingle();
  if (deleted.error) return errorResponse(deleted.error.message, 400);
  if (!deleted.data) return errorResponse('Diesel record not found', 404);
  await recalculateBalances();
  return new Response(null, { status: 204, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return errorResponse('Authentication required', 401);
    const user = await authClient.auth.getUser(token);
    if (user.error || !user.data.user) return errorResponse('Invalid authentication token', 401);
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\/api/, '');
    const segments = pathname.split('/').filter(Boolean);
    const role = user.data.user.app_metadata?.role === 'commander' ? 'commander' : 'operator';
    if (segments[0] === 'vehicles' && role !== 'commander') {
      return errorResponse('Commander access required', 403);
    }
    if (segments[0] === 'users' && role !== 'commander') {
      return errorResponse('Commander access required', 403);
    }
    if (segments[0] === 'users' && segments[1] === user.data.user.id && (request.method === 'PATCH' || request.method === 'DELETE')) {
      return errorResponse('You cannot change or remove your own commander account', 400);
    }
    const body = request.method === 'GET' || request.method === 'DELETE' ? {} : await request.json() as Record<string, unknown>;
    if (request.method === 'GET' && pathname === '/vehicles') return await listVehicles();
    if (request.method === 'GET' && pathname === '/people') return await listPeople(url.searchParams.get('role') ?? '');
    if (request.method === 'POST' && pathname === '/vehicles') return await createVehicle(body);
    if (request.method === 'PATCH' && segments[0] === 'vehicles' && segments[1]) return await updateVehicle(Number(segments[1]), body);
    if (request.method === 'DELETE' && segments[0] === 'vehicles' && segments[1]) return await archiveVehicle(Number(segments[1]));
    if (request.method === 'GET' && pathname === '/users') return await listUsers();
    if (request.method === 'POST' && pathname === '/users') return await createUser(body);
    if (request.method === 'PATCH' && segments[0] === 'users' && segments[1]) return await updateUser(segments[1], body);
    if (request.method === 'DELETE' && segments[0] === 'users' && segments[1]) return await deleteUser(segments[1]);
    if (request.method === 'GET' && pathname === '/diesel/records') {
      const date = dateValue(url.searchParams.get('date'));
      return date ? await dieselRecords(date) : errorResponse('A valid date is required');
    }
    if (request.method === 'GET' && pathname === '/diesel/summary') {
      const date = dateValue(url.searchParams.get('date'));
      return date ? await dieselSummary(date) : errorResponse('A valid date is required');
    }
    if (request.method === 'POST' && pathname === '/diesel/records') return await createRecord(body);
    if (request.method === 'PATCH' && segments[0] === 'diesel' && segments[1] === 'records' && segments[2]) return await updateRecord(Number(segments[2]), body);
    if (request.method === 'DELETE' && segments[0] === 'diesel' && segments[1] === 'records' && segments[2]) return await deleteRecord(Number(segments[2]));
    return errorResponse('Not found', 404);
  } catch (error) {
    console.error(error);
    return errorResponse(error instanceof Error ? error.message : 'Unexpected server error', 500);
  }
});
