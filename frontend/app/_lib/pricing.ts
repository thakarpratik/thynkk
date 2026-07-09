/** Single source of truth for plan limits shown in UI (must match backend PAID_SCAN_LIMIT). */
export const PRO_PRICE_USD = 19;
export const PRO_SCANS_PER_MONTH = 10;
export const FREE_SCANS_LIFETIME = 1;

export const PRO_SCANS_LABEL = `${PRO_SCANS_PER_MONTH} site scans per month`;
export const PRO_PRICE_LABEL = `$${PRO_PRICE_USD}/mo`;

export const PRO_FEATURE_LIST = [
  PRO_SCANS_LABEL,
  "All ranked threads in every report",
  "Full copy-ready reply drafts",
  "All post ideas with full outlines",
  "Promo-risk scoring per thread",
  "Priority scan processing",
] as const;

export const FREE_FEATURE_LIST = [
  `${FREE_SCANS_LIFETIME} site scan (lifetime)`,
  "Top 3 Reddit threads to join",
  "Reply draft preview (first 120 chars)",
  "1 post idea with outline teaser",
  "Communities to watch",
] as const;