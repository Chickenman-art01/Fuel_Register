import { getSupabaseAccessToken } from '@/lib/supabase';

type UserRole = 'commander' | 'operator';
export type ManagedUser = { id: string; email: string; role: UserRole; createdAt: string };

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getSupabaseAccessToken();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return response.status === 204 ? (null as T) : response.json() as Promise<T>;
}

export const listManagedUsers = () => adminRequest<ManagedUser[]>('/users');

export const createManagedUser = (data: { email: string; password: string; role: UserRole }) =>
  adminRequest<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(data) });

export const updateManagedUser = (id: string, role: UserRole) =>
  adminRequest<ManagedUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) });

export const deleteManagedUser = (id: string) =>
  adminRequest<null>(`/users/${id}`, { method: 'DELETE' });
