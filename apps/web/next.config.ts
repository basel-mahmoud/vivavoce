import type { NextConfig } from 'next';
import assetVersions from './src/lib/asset-versions.json';

/**
 * Security headers applied to every response. CSP is intentionally strict;
 * `'unsafe-inline'` on styles is required by Next's runtime style injection,
 * and Clerk + Vercel Analytics origins are explicitly allow-listed.
 */
// React's dev build needs eval() for debugging; production never does, so we
// only loosen script-src outside production.
const devEval = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";

const ContentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval} https://*.clerk.accounts.dev https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.neon.tech https://generativelanguage.googleapis.com https://va.vercel-scripts.com",
  "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Microphone is allowed on our own origin (the live demo's Speak feature and
  // future voice capture use it); camera and geolocation stay fully disabled.
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/**
 * The public folders the pages reference through `asset()` (src/lib/assets.ts), which adds each
 * folder's content version as `?v=`: those URLs change whenever a file does, so browsers and the CDN
 * keep them for a year without asking again. A request without the version (an old link) gets an
 * hour, refreshed in the background. Everything else in public/ keeps the platform default.
 */
const LONG_CACHE = 'public, max-age=31536000, immutable';
const SHORT_CACHE = 'public, max-age=3600, stale-while-revalidate=86400';
const assetHeaders = Object.keys(assetVersions).flatMap((folder) => [
  { source: `/${folder}/:file*`, headers: [{ key: 'Cache-Control', value: SHORT_CACHE }] },
  {
    source: `/${folder}/:file*`,
    has: [{ type: 'query' as const, key: 'v' }],
    headers: [{ key: 'Cache-Control', value: LONG_CACHE }],
  },
]);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Next 16 keeps Turbopack's cache on disk between production builds, and Vercel restores it
    // from the previous deployment. A build restored that way shipped CSS without a stylesheet
    // newly @imported by globals.css (the nav, footer and inner pages lost their styles), while a
    // clean build of the same commit was correct. Production builds start clean instead.
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    // later entries win for the same header, so the versioned rule comes last
    return [{ source: '/:path*', headers: securityHeaders }, ...assetHeaders];
  },
};

export default nextConfig;
