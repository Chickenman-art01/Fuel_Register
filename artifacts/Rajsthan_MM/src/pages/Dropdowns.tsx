import { useMemo, useState } from "react";
import {
  Edit3,
  ListPlus,
  Plus,
  RotateCcw,
  Search,
  Sliders,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  defaultDropdownCategories,
  loadDropdownCategories,
  saveDropdownCategories,
  type DropdownCategory,
} from "@/lib/dropdown-store";

function getColumnHeader(index: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = (index + 1) % 100;
  const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  return `${index + 1}${suffix} Dropdown`;
}

export default function Dropdowns() {
  const [categories, setCategories] = useState<DropdownCategory[]>(() => loadDropdownCategories());
  const [search, setSearch] = useState("");
  const [customColumnCount, setCustomColumnCount] = useState<number>(13);
  const [newDescModal, setNewDescModal] = useState(false);
  const [newDescName, setNewDescName] = useState("");
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [editingDescText, setEditingDescText] = useState("");
  const [editingCell, setEditingCell] = useState<{ catId: string; colIdx: number; value: string } | null>(null);

  const updateAndSave = (next: DropdownCategory[]) => {
    setCategories(next);
    saveDropdownCategories(next);
  };

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

  const handleAddDescription = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDescName.trim();
    if (!trimmed) return;
    const newCat: DropdownCategory = {
      id: `desc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: trimmed,
      options: [],
    };
    updateAndSave([...categories, newCat]);
    setNewDescName("");
    setNewDescModal(false);
  };

  const handleDeleteDescription = (id: string, name: string) => {
    if (!window.confirm(`Delete description "${name}" and all its dropdown values?`)) return;
    updateAndSave(categories.filter((c) => c.id !== id));
  };

  const handleSaveDescriptionName = (id: string) => {
    const trimmed = editingDescText.trim();
    if (!trimmed) return;
    updateAndSave(
      categories.map((c) => (c.id === id ? { ...c, description: trimmed } : c))
    );
    setEditingDescId(null);
  };

  const handleAddOption = (catId: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    updateAndSave(
      categories.map((c) => {
        if (c.id !== catId) return c;
        if (c.options.includes(trimmed)) return c;
        return { ...c, options: [...c.options, trimmed] };
      })
    );
  };

  const handleUpdateOption = (catId: string, index: number, value: string) => {
    const trimmed = value.trim();
    updateAndSave(
      categories.map((c) => {
        if (c.id !== catId) return c;
        const nextOpts = [...c.options];
        if (!trimmed) {
          nextOpts.splice(index, 1);
        } else {
          nextOpts[index] = trimmed;
        }
        return { ...c, options: nextOpts };
      })
    );
    setEditingCell(null);
  };

  const handleDeleteOption = (catId: string, index: number) => {
    updateAndSave(
      categories.map((c) => {
        if (c.id !== catId) return c;
        const nextOpts = [...c.options];
        nextOpts.splice(index, 1);
        return { ...c, options: nextOpts };
      })
    );
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Reset all dropdown descriptions and options to system defaults?")) return;
    updateAndSave(defaultDropdownCategories);
    setCustomColumnCount(13);
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
              <span className="font-bold text-foreground">{totalValues}</span> values
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Reset to default options"
              data-testid="button-reset-defaults"
            >
              <RotateCcw size={14} /> Reset defaults
            </button>
          </div>
        </div>

        {/* Action controls */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setNewDescModal(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-[0_3px_0_hsl(34_84%_32%)] hover:bg-primary/90"
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
                className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground"
                data-testid="button-submit-new-desc"
              >
                <Plus size={14} /> Save description
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
                            onClick={() => handleSaveDescriptionName(cat.id)}
                            className="grid size-7 shrink-0 place-items-center rounded bg-primary text-primary-foreground"
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
                              onClick={() => handleDeleteDescription(cat.id, cat.description)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
                                  onClick={() => handleDeleteOption(cat.id, colIdx)}
                                  className="rounded p-0.5 text-muted-foreground hover:text-destructive"
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
                              onClick={() => {
                                const val = window.prompt(`Add dropdown option for "${cat.description}":`);
                                if (val) handleAddOption(cat.id, val);
                              }}
                              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border/70 py-1.5 text-[11px] font-medium text-muted-foreground/80 hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
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

          {filteredCategories.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching descriptions or dropdown values found.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
