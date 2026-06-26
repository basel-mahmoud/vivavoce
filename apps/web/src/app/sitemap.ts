import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/features',
    '/how-it-works',
    '/use-cases',
    '/faq',
    '/contact',
    '/waitlist',
    '/privacy',
    '/terms',
    '/legal/accessibility',
  ];
  const now = new Date();
  return routes.map((path) => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/waitlist' ? 0.9 : 0.7,
  }));
}
