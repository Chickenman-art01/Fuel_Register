import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit3,
  ListPlus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  addDropdownCategory,
  deleteDropdownCategory,
  fetchDropdownCategories,
  getCachedDropdownCategories,
  updateDropdownCategory,
  type DropdownCategory,
} from "@/lib/dropdown-store";

function getColumnHeader(index: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = (index + 1) % 100;
  const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  return `${index + 1}${suffix} Dropdown`;
}

export default function Dropdowns() {
  const [categories, setCategories] = useState<DropdownCategory[]>(() => getCachedDropdownCategories());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [customColumnCount, setCustomColumnCount] = useState<number>(13);
  const [newDescModal, setNewDescModal] = useState(false);
  const [newDescName, setNewDescName] = useState("");
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editingDescText, setEditingDescText] = useState("");
  const [editingCell, setEditingCell] = useState<{ catId: string; colIdx: number; value: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDropdownCategories();
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<DropdownCategory[]>;
      if (customEvent.detail) setCategories(customEvent.detail);
    };
    window.addEventListener("rajsthan_dropdowns_changed", handleSync);
    return () => window.removeEventListener("rajsthan_dropdowns_changed", handleSync);
  }, []);

  const maxOptionsInRows = useMemo(() => {
    return categories.reduce((max, cat) => Math.max(max, cat.options.length), 0);
  }, [categories]);

  const columnCount = Math.max(customColumnCount, maxOptionsInRows, 13);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (cat) =>
        cat.description.toLowerCase().includes(q) ||
        cat.options.some((opt) => opt.toLowerCase().includes(q))
    );
  }, [categories, search]);

  const totalValues = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.options.length, 0);
  }, [categories]);

  const handleAddDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDescName.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await addDropdownCategory(trimmed);
      setNewDescName("");
      setNewDescModal(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not add category to database.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDescription = async (id: string, name: string) => {
    if (!window.confirm(`Delete description "${name}" from database and all its dropdown options?`)) return;
    setBusy(true);
    try {
      await deleteDropdownCategory(id);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete category.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDescriptionName = async (id: string) => {
    const trimmed = editingDescText.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await updateDropdownCategory(id, { description: trimmed });
      setEditingDescId(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not rename category.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddOption = async (catId: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    if (cat.options.includes(trimmed)) return;
    const nextOptions = [...cat.options, trimmed];

    setBusy(true);
    try {
      await updateDropdownCategory(catId, { options: nextOptions });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save option to database.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateOption = async (catId: string, index: number, value: string) => {
    const trimmed = value.trim();
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const nextOptions = [...cat.options];
    if (!trimmed) {
      nextOptions.splice(index, 1);
    } else {
      nextOptions[index] = trimmed;
    }

    setBusy(true);
    try {
      await updateDropdownCategory(catId, { options: nextOptions });
      setEditingCell(null);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update option in database.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOption = async (catId: string, index: number) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const nextOptions = [...cat.options];
    nextOptions.splice(index, 1);

    setBusy(true);
    try {
      await updateDropdownCategory(catId, { options: nextOptions });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not remove option.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="animate-rise">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Dropdowns</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="rounded-xl border border-card-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground"
              data-testid="text-dropdown-metrics"
            >
              <span className="font-bold text-foreground">{categories.length}</span> descriptions ·{" "}
              <span className="font-bold text-foreground">{totalValues}</span> values (Database)
            </div>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading || busy}
              className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              title="Refresh from database"
              data-testid="button-refresh-dropdowns"
            >
              <RefreshCw size={15} className={loading || busy ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Action controls */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setNewDescModal(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)] hover:bg-primary/90 disabled:opacity-50"
              data-testid="button-add-description"
            >
              <Plus size={15} /> Add description
            </button>
            <button
              type="button"
              onClick={() => setCustomColumnCount((prev) => Math.max(prev, columnCount) + 1)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-xs font-bold text-foreground hover:bg-muted"
              title="Add an additional dropdown column"
              data-testid="button-add-column"
            >
              <ListPlus size={15} /> Add column
            </button>
          </div>

          <label className="relative block sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search descriptions or values"
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              data-testid="input-search-dropdowns"
            />
          </label>
        </div>

        {/* Add Description Modal / Inline Card */}
        {newDescModal && (
          <div className="mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5" data-testid="panel-add-desc">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-primary">New description row</h3>
              <button
                type="button"
                onClick={() => setNewDescModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleAddDescription} className="flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                required
                type="text"
                value={newDescName}
                onChange={(e) => setNewDescName(e.target.value)}
                placeholder="e.g. Fuel Type, Shift Timing, Road Condition"
                className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:border-primary"
                data-testid="input-new-desc-name"
              />
              <button
                type="submit"
                disabled={busy}
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
                data-testid="button-submit-new-desc"
              >
                <Plus size={14} /> Save to database
              </button>
            </form>
          </div>
        )}

        {/* Matrix Table */}
        <section
          className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-[0_7px_22px_rgba(40,53,58,.045)]"
          data-testid="panel-dropdown-table"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-muted/60 text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-20 min-w-[210px] border-b border-r border-border bg-muted/90 px-4 py-3 shadow-[2px_0_5px_rgba(0,0,0,0.03)] backdrop-blur-xs">
                    Description
                  </th>
                  {Array.from({ length: columnCount }).map((_, idx) => (
                    <th
                      key={idx}
                      className="min-w-[170px] border-b border-border/70 px-3 py-3 font-mono font-medium whitespace-nowrap"
                    >
                      {getColumnHeader(idx)}
                    </th>
                  ))}
                  <th className="min-w-[60px] border-b border-border/70 px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setCustomColumnCount((prev) => Math.max(prev, columnCount) + 1)}
                      className="grid size-6 place-items-center rounded bg-primary/15 text-primary hover:bg-primary/25"
                      title="Add column"
                    >
                      <Plus size={13} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="transition-colors hover:bg-muted/20" data-testid={`row-category-${cat.id}`}>
                    {/* Description column */}
                    <td className="sticky left-0 z-10 border-r border-border bg-card px-4 py-3.5 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                      {editingDescId === cat.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            type="text"
                            value={editingDescText}
                            onChange={(e) => setEditingDescText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveDescriptionName(cat.id);
                              if (e.key === "Escape") setEditingDescId(null);
                            }}
                            className="h-8 w-full rounded border border-input bg-background px-2 text-xs font-bold outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleSaveDescriptionName(cat.id)}
                            className="grid size-7 shrink-0 place-items-center rounded bg-primary text-primary-foreground disabled:opacity-50"
                            title="Save"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDescId(null)}
                            className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted"
                            title="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground">{cat.description}</span>
                          <div className="flex items-center gap-1 opacity-60 transition-opacity hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDescId(cat.id);
                                setEditingDescText(cat.description);
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              title="Edit description"
                              data-testid={`button-edit-desc-${cat.id}`}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDeleteDescription(cat.id, cat.description)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                              title="Delete description"
                              data-testid={`button-delete-desc-${cat.id}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Dropdown column cells */}
                    {Array.from({ length: columnCount }).map((_, colIdx) => {
                      const value = cat.options[colIdx];
                      const isEditing = editingCell?.catId === cat.id && editingCell?.colIdx === colIdx;

                      return (
                        <td key={colIdx} className="px-2.5 py-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                type="text"
                                value={editingCell.value}
                                onChange={(e) =>
                                  setEditingCell({ ...editingCell, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateOption(cat.id, colIdx, editingCell.value);
                                  }
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                onBlur={() => handleUpdateOption(cat.id, colIdx, editingCell.value)}
                                className="h-8 w-full rounded border border-primary bg-background px-2 text-xs outline-none"
                              />
                            </div>
                          ) : value ? (
                            <div
                              className="group flex items-center justify-between gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1.5 shadow-2xs hover:border-primary/40 hover:bg-muted/40"
                              data-testid={`cell-option-${cat.id}-${colIdx}`}
                            >
                              <span className="font-medium text-foreground truncate max-w-[130px]">{value}</span>
                              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingCell({ catId: cat.id, colIdx, value })
                                  }
                                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                                  title="Edit value"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDeleteOption(cat.id, colIdx)}
                                  className="rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                                  title="Remove option"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            </div>
                          ) : colIdx === cat.options.length ? (
                            /* First empty column: inline quick adder */
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                const val = window.prompt(`Add dropdown option for "${cat.description}":`);
                                if (val) handleAddOption(cat.id, val);
                              }}
                              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 py-1.5 text-[11px] font-medium text-muted-foreground/80 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors disabled:opacity-50"
                              title="Add option"
                            >
                              <Plus size={12} /> Add
                            </button>
                          ) : (
                            <span className="block text-center text-muted-foreground/30 font-mono select-none">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2 text-center" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredCategories.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching descriptions or dropdown values found in database.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
