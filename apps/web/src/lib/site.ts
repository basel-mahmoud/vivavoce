import type { Metadata } from 'next';

/**
 * Where the site is served from: canonical links, social cards, the sitemap
 * and robots all hang off it. NEXT_PUBLIC_APP_URL wins; on Vercel without it,
 * the project's production domain (then the deployment's own URL); only a
 * local build falls back to localhost.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return 'http://localhost:3000';
}

/** Central site config used across metadata, nav, footer, and JSON-LD. */
export const site = {
  name: 'VivaVoce',
  tagline: 'Say it out loud before it counts.',
  description:
    'VivaVoce is a voice-first study sparring app. It asks real exam questions, listens to your spoken answer, and marks it on correctness, clarity, structure, conciseness, and confidence, so you can rehearse vivas, interviews, and presentations until they feel familiar.',
  url: resolveSiteUrl(),
  email: 'hello@vivavoce.app',
  nav: [
    { label: 'Features', href: '/features' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Use cases', href: '/use-cases' },
    { label: 'FAQ', href: '/faq' },
  ],
  footer: {
    Product: [
      { label: 'Features', href: '/features' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Use cases', href: '/use-cases' },
      { label: 'Get early access', href: '/waitlist' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
    Company: [
      { label: 'Contact', href: '/contact' },
      { label: 'Accessibility', href: '/legal/accessibility' },
    ],
    Legal: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
} as const;

/**
 * A page's metadata with its own canonical address and social card URL.
 * Next replaces (does not merge) nested objects like openGraph, so every page
 * gets the whole set from here rather than half of it from the layout.
 */
export function pageMeta({
  title,
  description,
  path,
  index = true,
}: {
  /** The page's own title; the layout adds " · VivaVoce". Omit on the home page. */
  title?: string;
  description: string;
  /** The page's path from the root: '/', '/features'. */
  path: string;
  /** false keeps the page out of search results (example-only pages). */
  index?: boolean;
}): Metadata {
  const social = title ? `${title} · ${site.name}` : `${site.name}. ${site.tagline}`;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: site.name,
      title: social,
      description,
      url: path,
    },
    twitter: { card: 'summary_large_image', title: social, description },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}
