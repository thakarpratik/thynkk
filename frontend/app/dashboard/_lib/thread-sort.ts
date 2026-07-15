import type { GrowthThread } from "../_types";

export type ThreadSort = "latest" | "match";

/** Parse Serper-style dates into a timestamp (ms). Unknown → 0. */
export function threadDateMs(dateStr: string | undefined): number {
  const raw = (dateStr || "").trim();
  if (!raw) return 0;

  const now = Date.now();
  const lower = raw.toLowerCase();
  const rel = lower.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    const dayMs = 86400000;
    const mult: Record<string, number> = {
      second: 1000,
      minute: 60000,
      hour: 3600000,
      day: dayMs,
      week: 7 * dayMs,
      month: 30 * dayMs,
      year: 365 * dayMs,
    };
    return now - n * (mult[unit] || dayMs);
  }

  const abs = Date.parse(raw);
  return Number.isFinite(abs) ? abs : 0;
}

export function sortThreads(threads: GrowthThread[], sort: ThreadSort): GrowthThread[] {
  const list = [...threads];
  if (sort === "latest") {
    list.sort((a, b) => {
      const da = threadDateMs(a.date);
      const db = threadDateMs(b.date);
      if (db !== da) return db - da;
      return b.relevanceScore - a.relevanceScore;
    });
  } else {
    list.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return threadDateMs(b.date) - threadDateMs(a.date);
    });
  }
  return list;
}
