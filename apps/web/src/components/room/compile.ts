import * as THREE from 'three';

/**
 * Compile an object's shader programs ahead of its first frame, in the variant that frame will use:
 * through the post chain (into a linear, un-tone-mapped render target) or straight to the screen.
 * A program compiled in the other variant would be thrown away and compiled again, on the main
 * thread, mid-frame. Where the GPU compiles in parallel (KHR_parallel_shader_compile, most desktop
 * browsers), the returned promise waits for it without blocking the page; elsewhere the programs
 * compile when first drawn, as they would have anyway.
 */
export function precompile(
  gl: THREE.WebGLRenderer,
  object: THREE.Object3D,
  camera: THREE.Camera,
  scene: THREE.Scene,
  viaComposer: boolean,
): Promise<unknown> {
  const previous = gl.getRenderTarget();
  const target = viaComposer ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null;
  gl.setRenderTarget(target);
  let done: Promise<unknown>;
  try {
    done = gl.compileAsync(object, camera, object === scene ? null : scene);
  } finally {
    gl.setRenderTarget(previous);
  }
  return done.finally(() => target?.dispose());
}
