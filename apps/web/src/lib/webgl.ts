let cached: boolean | null = null;

/**
 * Whether this browser gives the page a WebGL context. Asked once per page and remembered: making a
 * context is not free (tens of milliseconds, far more in a software renderer), so ask outside
 * hydration (an effect) where possible. The probe's context is handed straight back, since browsers
 * cap live contexts and the room and the engine's stage each need one.
 */
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    cached = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
