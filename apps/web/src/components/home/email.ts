/** The same shape the browser's email input checks: enough to catch a typo before the stub goes. */
export function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
