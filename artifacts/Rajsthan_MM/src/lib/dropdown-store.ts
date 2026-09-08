import { supabase } from "@/lib/supabase";

export interface DropdownCategory {
  id: string;
  description: string;
  options: string[];
  sort_order?: number;
}

const STORAGE_KEY = "rajsthan_mm_dropdown_categories_cache";

export function getCachedDropdownCategories(): DropdownCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function updateLocalCache(categories: DropdownCategory[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent("rajsthan_dropdowns_changed", { detail: categories }));
  } catch {
    // ignore
  }
}

export async function fetchDropdownCategories(): Promise<DropdownCategory[]> {
  try {
    const { data, error } = await supabase
      .from("dropdown_categories")
      .select("id, description, options, sort_order")
      .order("sort_order", { ascending: true })
      .order("description", { ascending: true });

    if (error) throw error;
    if (data && Array.isArray(data)) {
      const mapped: DropdownCategory[] = data.map((row) => ({
        id: String(row.id),
        description: String(row.description),
        options: Array.isArray(row.options) ? (row.options as string[]) : [],
        sort_order: typeof row.sort_order === "number" ? row.sort_order : 0,
      }));
      updateLocalCache(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn("Could not fetch dropdown_categories from database, using cached data:", err);
  }
  return getCachedDropdownCategories();
}

export async function addDropdownCategory(description: string): Promise<DropdownCategory> {
  const trimmed = description.trim();
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `desc-${Date.now()}`;
  const id = `${slug}-${Date.now().toString(36)}`;

  const newRecord = {
    id,
    description: trimmed,
    options: [],
    sort_order: Date.now(),
  };

  const { data, error } = await supabase
    .from("dropdown_categories")
    .insert(newRecord)
    .select("id, description, options, sort_order")
    .single();

  if (error) throw error;

  const current = getCachedDropdownCategories();
  const next = [...current, { id: data.id, description: data.description, options: data.options, sort_order: data.sort_order }];
  updateLocalCache(next);
  return next[next.length - 1];
}

export async function updateDropdownCategory(
  id: string,
  updates: { description?: string; options?: string[]; sort_order?: number }
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.options !== undefined) payload.options = updates.options;
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;

  const { error } = await supabase
    .from("dropdown_categories")
    .update(payload)
    .eq("id", id);

  if (error) throw error;

  const current = getCachedDropdownCategories();
  const next = current.map((c) => (c.id === id ? { ...c, ...updates } : c));
  updateLocalCache(next);
}

export async function deleteDropdownCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("dropdown_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;

  const current = getCachedDropdownCategories();
  const next = current.filter((c) => c.id !== id);
  updateLocalCache(next);
}
