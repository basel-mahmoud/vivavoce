/**
 * The font gate: type that moves on arrival (the home page's promise) waits for the display face,
 * so it never plays on the fallback face and then jumps when Archivo swaps in. Inline in the root
 * layout, it runs while the page is parsed, before the first paint, and sets two custom properties
 * that animated type reads:
 *   --vv-type-play  `paused` while the face is on its way (the first frame holds);
 *   --vv-type-skip  a large negative delay once the face is late, so the settled frame shows.
 * The face arriving within `wait` ms lifts the gate and the entrance plays. Without script, fonts
 * support or with reduced motion it sets nothing: CSS alone decides (it plays, or it is still).
 *
 * Only the first family of a stack is loaded: a metric fallback such as `local(Arial)` fails on
 * systems without that font (Android, Linux), and one failed face rejects the whole load.
 */
export function fontGateScript(stack: string, wait = 800) {
  const family = stack.split(',')[0]!.trim();
  return `(function(f,w){try{var d=document,s;if(!d.fonts||matchMedia('(prefers-reduced-motion: reduce)').matches)return;s=d.createElement('style');s.textContent=':root{--vv-type-play:paused}';d.head.appendChild(s);var open=function(late){if(!s)return;if(late)s.textContent=':root{--vv-type-skip:-60s}';else s.remove();s=null;};setTimeout(function(){open(true)},w);d.fonts.load('900 1em '+f).then(function(){open(false)},function(){open(true)});}catch(e){}})(${JSON.stringify(family).replace(/</g, '\\u003c')},${Math.round(wait)});`;
}
