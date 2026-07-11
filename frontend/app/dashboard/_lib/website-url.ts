/** Client-side website URL checks (mirrors backend growth_scans.normalize_website_url). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const HOST_RE =
  /^(?:localhost|(\d{1,3}\.){3}\d{1,3}|([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})$/i;

export function normalizeWebsiteUrl(raw: string): string {
  const value = raw.trim();
  if (!value) {
    throw new Error("Enter a website URL (e.g. https://yourproduct.com).");
  }

  // Bare email or "name@domain" without a path
  if (EMAIL_RE.test(value) || (value.includes("@") && !value.includes("://") && !value.includes("/"))) {
    throw new Error("That looks like an email. Enter a website URL instead.");
  }

  const withScheme =
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;

  // https://user@host is almost always an accidental email (e.g. https://ipcwit@gmail.com)
  const afterScheme = withScheme.replace(/^https?:\/\//i, "");
  if (afterScheme.includes("@") && !afterScheme.split("@")[0].includes("/")) {
    throw new Error("That looks like an email. Enter a website URL instead.");
  }

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error("Enter a valid website URL (e.g. yourproduct.com).");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL must start with http:// or https://");
  }

  if (parsed.username || parsed.password) {
    throw new Error("That looks like an email. Enter a website URL instead.");
  }

  const host = (parsed.hostname || "").toLowerCase();
  if (!host) {
    throw new Error("Enter a website URL with a domain (e.g. yourproduct.com).");
  }

  if (!HOST_RE.test(host)) {
    throw new Error(
      "Enter a valid website domain (e.g. yourproduct.com), not an email or random text.",
    );
  }

  const path = parsed.pathname === "/" ? "" : parsed.pathname;
  const search = parsed.search || "";
  return `${parsed.protocol}//${host}${path}${search}`;
}

export function isValidWebsiteUrl(raw: string): boolean {
  try {
    normalizeWebsiteUrl(raw);
    return true;
  } catch {
    return false;
  }
}
