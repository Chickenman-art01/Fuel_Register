export interface DropdownCategory {
  id: string;
  description: string;
  options: string[];
}

export const defaultDropdownCategories: DropdownCategory[] = [
  {
    id: "vehicle-type",
    description: "Vehicle Type",
    options: [
      "JCB",
      "Dumper",
      "Trailor",
      "Car",
      "Excavator",
      "Tanker",
      "Tractor",
      "Loader",
      "Hydra Crane",
      "Forklift",
      "Other Vehicle",
      "Truck",
      "Tata Yodha",
    ],
  },
  {
    id: "maintenance-status",
    description: "Maintenance Status",
    options: [
      "Active (Running)",
      "Under Maintenance",
      "Breakdown",
      "Not installed",
    ],
  },
  {
    id: "permit-type",
    description: "Permit Type",
    options: [
      "State Permit",
      "National Permit",
      "Mines Internal Only",
      "Not Applicable (Private)",
    ],
  },
  {
    id: "gps-status",
    description: "GPS Status",
    options: [
      "Installed (Working)",
      "Not Working / Issue",
      "No GPS Installed",
    ],
  },
  {
    id: "camera-status",
    description: "Camera Status",
    options: [
      "Installed (Working)",
      "Not Working / Issue",
      "No Camera Installed",
    ],
  },
];

const STORAGE_KEY = "rajsthan_mm_dropdown_categories";

export function loadDropdownCategories(): DropdownCategory[] {
  if (typeof window === "undefined") return defaultDropdownCategories;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDropdownCategories;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fallback
  }
  return defaultDropdownCategories;
}

export function saveDropdownCategories(categories: DropdownCategory[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent("rajsthan_dropdowns_changed", { detail: categories }));
  } catch {
    // ignore
  }
}
