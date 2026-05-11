/**
 * Validates Amazon / Kindle-style affiliate product URLs (HTTPS + host allowlist).
 * Extend via NEXT_PUBLIC_AMAZON_AFFILIATE_HOST_ALLOWLIST (comma-separated hostnames).
 */

const DEFAULT_AMAZON_AFFILIATE_HOSTS = [
  "amazon.com",
  "amazon.co.uk",
  "amazon.de",
  "amazon.fr",
  "amazon.ca",
  "amazon.com.au",
  "amazon.es",
  "amazon.it",
  "amazon.nl",
  "amazon.co.jp",
  "amazon.in",
  "amazon.com.mx",
  "amazon.com.br",
  "amzn.to",
  "amzn.eu",
] as const;

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

function hostMatchesAllowEntry(host: string, allowed: string): boolean {
  const h = normalizeHost(host);
  const a = normalizeHost(allowed);
  if (!h || !a) return false;
  if (h === a) return true;
  return h.endsWith(`.${a}`);
}

export function getAmazonAffiliateHostAllowlist(): string[] {
  const raw = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_HOST_ALLOWLIST;
  const extra =
    typeof raw === "string"
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  return [
    ...new Set([
      ...DEFAULT_AMAZON_AFFILIATE_HOSTS.map((h) => h.toLowerCase()),
      ...extra.map((h) => h.toLowerCase()),
    ]),
  ];
}

export function isHttpsUrl(urlString: string): boolean {
  const t = urlString.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isAmazonAffiliateProductUrl(urlString: string): boolean {
  const t = urlString.trim();
  if (!t) return false;
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const allowlist = getAmazonAffiliateHostAllowlist();
  return allowlist.some((allowed) =>
    hostMatchesAllowEntry(url.hostname, allowed),
  );
}
