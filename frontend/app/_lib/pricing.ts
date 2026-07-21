/** Single source of truth for plan limits (must match backend CREDITS_PER_PACK). */
export const PACK_PRICE_USD = 19;
export const PACK_SCANS = 3;
export const FREE_SCANS_LIFETIME = 1;

export const PACK_NAME = "Launch Pack";
export const PACK_PRICE_LABEL = `$${PACK_PRICE_USD} one-time`;
export const PACK_SCANS_LABEL = `${PACK_SCANS} full site scans`;
export const PACK_PER_SCAN = `~$${(PACK_PRICE_USD / PACK_SCANS).toFixed(2)} per scan`;

export const PACK_FEATURE_LIST = [
  PACK_SCANS_LABEL,
  "All ranked threads in every report",
  "Full copy-ready reply drafts",
  "All post ideas with copy-ready drafts",
  "Promo-risk scoring per thread",
  "Re-read old reports anytime — free",
] as const;

/** Free = 1 complete report (same depth as paid), then buy packs for more. */
export const FREE_FEATURE_LIST = [
  `${FREE_SCANS_LIFETIME} full site scan (lifetime)`,
  "All ranked Reddit threads",
  "Full copy-ready reply drafts",
  "All post ideas with drafts",
  "Promo-risk scores + communities",
] as const;

// Legacy aliases
export const PRO_PRICE_USD = PACK_PRICE_USD;
export const PRO_SCANS_PER_MONTH = PACK_SCANS;
export const PRO_PRICE_LABEL = PACK_PRICE_LABEL;
export const PRO_SCANS_LABEL = PACK_SCANS_LABEL;
export const PRO_FEATURE_LIST = PACK_FEATURE_LIST;
