const BASE =
  typeof window !== "undefined"
    ? "/api/backend"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

export interface WaitlistStats {
  display_count: number;
  signups: number;
  invites_sent_this_week: number;
  next_batch_label: string;
}

export interface WaitlistJoinResult {
  email: string;
  position: number;
  display_count: number;
  already_joined: boolean;
  message: string;
}

export async function fetchWaitlistStats(): Promise<WaitlistStats | null> {
  try {
    const res = await fetch(`${BASE}/waitlist/stats`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function joinWaitlist(email: string, source = "homepage"): Promise<WaitlistJoinResult> {
  // Prefer explicit source, but enrichment happens in WaitlistForm via waitlistSource()
  const res = await fetch(`${BASE}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, source }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ")
          : detail?.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as WaitlistJoinResult;
}

export async function admitWaitlist(email: string): Promise<void> {
  await fetch(`${BASE}/waitlist/admit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }).catch(() => null);
}

const WAITLIST_EMAIL_KEY = "thynkk_waitlist_email";

export function storeWaitlistEmail(email: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(WAITLIST_EMAIL_KEY, email);
  }
}

export function getWaitlistEmail(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(WAITLIST_EMAIL_KEY);
}