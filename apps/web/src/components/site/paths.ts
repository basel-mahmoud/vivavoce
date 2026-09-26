import { site } from '@/lib/site';

/** A nav item is current on its own page and on anything filed under it. */
export function isCurrent(pathname: string | null | undefined, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Every page a lost visitor might have meant, from the nav and the footer. */
export const KNOWN_PATHS: readonly string[] = Array.from(
  new Set([
    '/',
    ...site.nav.map((n) => n.href),
    ...Object.values(site.footer).flatMap((group) => group.map((l) => l.href)),
    '/faq',
  ]),
);

/** Levenshtein distance, two rows at a time. */
export function editDistance(a: string, b: string) {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = row;
  }
  return prev[b.length]!;
}

/** Tidy a requested path for comparing: lower case, no query, no trailing slash. */
export function normalizePath(path: string) {
  const bare = path.split(/[?#]/)[0]!.toLowerCase().replace(/\/+$/, '');
  return bare === '' ? '/' : bare;
}

/**
 * The page the visitor probably meant, the way an examiner corrects a
 * misspelling in the margin: close enough to be a typo (or a known page
 * with extra path after it), never a wild guess. Null when nothing is close.
 */
export function suggestPath(requested: string, known: readonly string[] = KNOWN_PATHS): string | null {
  const path = normalizePath(requested);
  if (path === '/' || known.includes(path)) return null;
  // /features/extra, /faq/anything: the section they were in.
  const parent = known
    .filter((k) => k !== '/' && path.startsWith(`${k}/`))
    .sort((x, y) => y.length - x.length)[0];
  if (parent) return parent;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const k of known) {
    if (k === '/') continue;
    const d = editDistance(path, k);
    // Allow about one slip in four characters, and at least one.
    const allowed = Math.max(1, Math.floor(k.length / 4));
    if (d <= allowed && d < bestScore) {
      best = k;
      bestScore = d;
    }
  }
  return best;
}
