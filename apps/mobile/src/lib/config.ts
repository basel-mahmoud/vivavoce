/** Runtime config from EXPO_PUBLIC_* env (embedded at build time). */
const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export const config = {
  apiUrl,
  clerkPublishableKey,
} as const;

/** When Clerk isn't configured we run a guided demo so the app is still usable. */
export const isAuthConfigured = clerkPublishableKey.length > 0;
