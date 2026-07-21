import type { SaturationReport, ValidationResult } from "./types";

const BASE =
  typeof window !== "undefined"
    ? "/api/backend"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

export class SaturationApiError extends Error {
  status: number;
  payload: Record<string, unknown>;

  constructor(status: number, payload: Record<string, unknown>) {
    const msg =
      typeof payload.message === "string"
        ? payload.message
        : typeof payload.detail === "string"
          ? payload.detail
          : "Request failed";
    super(msg);
    this.status = status;
    this.payload = payload;
  }
}

async function parseError(res: Response): Promise<SaturationApiError> {
  let payload: Record<string, unknown> = {};
  try {
    const data = await res.json();
    if (data && typeof data === "object") {
      if (data.detail && typeof data.detail === "object") {
        payload = data.detail as Record<string, unknown>;
      } else {
        payload = data as Record<string, unknown>;
      }
    }
  } catch {
    payload = { message: res.statusText || "Request failed" };
  }
  return new SaturationApiError(res.status, payload);
}

export async function validateSaturationInput(
  input: string,
  confirmBroadTheme = false
): Promise<ValidationResult> {
  const res = await fetch(`${BASE}/saturation/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, confirm_broad_theme: confirmBroadTheme }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function scoreSaturation(
  input: string,
  confirmBroadTheme = false
): Promise<SaturationReport> {
  const res = await fetch(`${BASE}/saturation/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, confirm_broad_theme: confirmBroadTheme }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}
