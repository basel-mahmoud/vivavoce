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
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['500', '700'],
  display: 'swap',
});

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
    url: site.url,
    siteName: site.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name}. ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#FF4D26',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${jetbrains.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:font-bold focus:text-paper"
        >
          Skip to content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
