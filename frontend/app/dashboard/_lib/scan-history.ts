import type { Theme } from "../_types";

const STORAGE_KEY = "thynkk_scan_history";
const MAX_ENTRIES = 5;

export interface ScanHistoryEntry {
  id: string;
  query: string;
  scannedAt: string;
  themeCount: number;
  totalThemes: number;
  topTheme: string;
  fromCache: boolean;
  themes: Theme[];
}

export function loadScanHistory(): ScanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

export function mergeScanHistories(
  local: ScanHistoryEntry[],
  remote: ScanHistoryEntry[],
): ScanHistoryEntry[] {
  const byKey = new Map<string, ScanHistoryEntry>();
  for (const entry of [...local, ...remote]) {
    const key = entry.id || entry.query;
    const existing = byKey.get(key);
    if (!existing || new Date(entry.scannedAt) > new Date(existing.scannedAt)) {
      byKey.set(key, entry);
    }
  }
  return [...byKey.values()]
    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
    .slice(0, MAX_ENTRIES);
}

export function saveScanToHistory(entry: Omit<ScanHistoryEntry, "id" | "scannedAt"> & { id?: string }) {
  if (typeof window === "undefined") return;
  const history = loadScanHistory().filter((h) => h.query !== entry.query);
  const newEntry: ScanHistoryEntry = {
    id: entry.id ?? crypto.randomUUID(),
    scannedAt: new Date().toISOString(),
    query: entry.query,
    themeCount: entry.themeCount,
    totalThemes: entry.totalThemes,
    topTheme: entry.topTheme,
    fromCache: entry.fromCache,
    themes: entry.themes,
  };
  const next = [newEntry, ...history].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearScanHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}