import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { site } from '@/lib/site';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  axes: ['wdth'],
  display: 'swap',
});
// Marks only (a few digits per screen): not worth a preload on every page.
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['500', '700'],
  display: 'swap',
  preload: false,
});

// Pages set their own canonical and social URL (pageMeta in lib/site.ts);
// these are the defaults for anything that does not, such as the 404.
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}. ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    'oral exam practice',
    'viva preparation',
    'interview practice',
    'speaking coach',
    'voice study app',
    'presentation rehearsal',
  ],
  authors: [{ name: 'Basel Mahmoud' }],
  openGraph: {
    type: 'website',
    title: `${site.name}. ${site.tagline}`,
    description: site.description,
    siteName: site.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name}. ${site.tagline}`,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3F5F8' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0E14' },
  ],
};

/**
 * The document. Clerk is not here: only the dashboard signs anyone in, so
 * its provider (and its scripts) load there and nowhere else.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${jetbrains.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-cobalt focus:px-4 focus:py-2 focus:font-bold focus:text-paper"
        >
          Skip to content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
