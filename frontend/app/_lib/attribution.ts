/** First-touch marketing attribution (UTM + referrer). */

export interface AttributionPayload {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  landing_path?: string;
}

const STORAGE_KEY = "thynkk_attribution_v1";

function hostFromReferrer(ref: string): string {
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || host === "thynkk.co" || host === "localhost" || host === "127.0.0.1") {
      return "";
    }
    return host;
  } catch {
    return "";
  }
}

function readStored(): AttributionPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AttributionPayload;
  } catch {
    return null;
  }
}

function writeStored(payload: AttributionPayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Capture first-touch UTM + referrer once per browser. Safe to call on every page load. */
export function captureAttribution(): AttributionPayload {
  if (typeof window === "undefined") return {};

  const existing = readStored();
  if (existing?.utm_source || existing?.referrer || existing?.landing_path) {
    return existing;
  }

  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get("utm_source")?.trim() || undefined;
  const utm_medium = params.get("utm_medium")?.trim() || undefined;
  const utm_campaign = params.get("utm_campaign")?.trim() || undefined;
  const referrer = hostFromReferrer(document.referrer) || undefined;
  const landing_path = `${window.location.pathname}${window.location.search}`.slice(0, 500);

  const payload: AttributionPayload = {
    utm_source,
    utm_medium,
    utm_campaign,
    referrer,
    landing_path,
  };

  // Only persist when we have something useful (or at least landing path)
  writeStored(payload);
  return payload;
}

/** Return stored first-touch attribution for API payloads. */
export function getAttribution(): AttributionPayload {
  if (typeof window === "undefined") return {};
  const stored = readStored();
  if (stored) return stored;
  return captureAttribution();
}

/** Source string for waitlist (prefer UTM, then referrer host, else fallback). */
export function waitlistSource(fallback = "homepage"): string {
  const a = getAttribution();
  if (a.utm_source) return a.utm_source.slice(0, 64);
  if (a.referrer) return a.referrer.slice(0, 64);
  return fallback;
}
