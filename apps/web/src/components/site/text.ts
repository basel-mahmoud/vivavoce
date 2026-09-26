/** Split an answer around its key phrase (first occurrence), if it has one. */
export function splitAnswer(a: string, key?: string): [string, string, string] | null {
  if (!key) return null;
  const at = a.indexOf(key);
  if (at < 0) return null;
  return [a.slice(0, at), key, a.slice(at + key.length)];
}
