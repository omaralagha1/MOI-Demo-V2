/** Per-browser "recently used services" convenience. Not authoritative and safe to lose. */
const KEY = 'kms-recent-services';

export function readRecentServices(): string[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(0, 4) : []; }
  catch { return []; }
}

export function rememberService(slug: string) {
  try { localStorage.setItem(KEY, JSON.stringify([slug, ...readRecentServices().filter(item => item !== slug)].slice(0, 4))); }
  catch { /* storage unavailable */ }
}
