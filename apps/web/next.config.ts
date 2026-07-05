import type { NextConfig } from 'next';

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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
