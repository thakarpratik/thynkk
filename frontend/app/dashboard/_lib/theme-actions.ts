import type { Theme } from "../_types";

const SAVED_THEMES_KEY = "thynkk_saved_themes";
const MAX_SAVED = 20;

export interface SavedTheme {
  id: string;
  scanQuery: string;
  savedAt: string;
  theme: Theme;
}

function redditUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `https://www.reddit.com${url.startsWith("/") ? url : `/${url}`}`;
}

export function formatThemeShareText(theme: Theme, scanQuery: string, rank: number): string {
  const lines = [
    `${theme.name} — Thynkk pain point #${rank}`,
    `Scan: ${scanQuery}`,
    "",
    theme.summary,
  ];

  if (theme.opportunity) {
    lines.push("", `Opportunity: ${theme.opportunity}`);
  }

  if (theme.verdict && theme.verdict !== "Unknown") {
    lines.push(`Verdict: ${theme.verdict}`);
  }

  if (theme.quotes[0]) {
    lines.push("", `"${theme.quotes[0].text}"`, redditUrl(theme.quotes[0].url));
  }

  lines.push("", "Analyzed with Thynkk — https://thynkk.co");
  return lines.join("\n");
}

export function loadSavedThemes(): SavedTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_THEMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTheme[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTheme(theme: Theme, scanQuery: string): SavedTheme[] {
  const id = `${scanQuery}::${theme.name}`;
  const entry: SavedTheme = {
    id,
    scanQuery,
    savedAt: new Date().toISOString(),
    theme,
  };
  const next = [entry, ...loadSavedThemes().filter((s) => s.id !== id)].slice(0, MAX_SAVED);
  localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(next));
  return next;
}

export function isThemeSaved(theme: Theme, scanQuery: string): boolean {
  const id = `${scanQuery}::${theme.name}`;
  return loadSavedThemes().some((s) => s.id === id);
}

export async function shareThemeText(text: string, title: string): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
    }
  }

  await navigator.clipboard.writeText(text);
  return "copied";
}