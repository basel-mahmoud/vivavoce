import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Stable download URL for the Android beta. The actual artifact URL rotates
 * with every EAS build, so it lives in an env var: update APK_DOWNLOAD_URL in
 * Vercel and the link on the site keeps working. Falls back to the waitlist
 * when no build is published.
 */
export async function GET() {
  const url = process.env.APK_DOWNLOAD_URL;
  redirect(url && url.startsWith('https://') ? url : '/waitlist');
}
