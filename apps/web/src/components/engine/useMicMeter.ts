'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * A live microphone meter with VU-style ballistics: fast attack, slow
 * release, so the needle (here: a waveform and a ring) moves like an
 * instrument instead of flickering with every sample.
 *
 * Draws straight to a canvas and writes the ring's transform directly: no
 * React state per frame. Nothing is recorded or sent anywhere; the stream is
 * only analysed locally and closed on stop.
 */
export function useMicMeter() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const live = useRef<{
    stream: MediaStream;
    ctx: AudioContext;
    analyser: AnalyserNode;
    frame: number;
  } | null>(null);

  const stop = useCallback(() => {
    const l = live.current;
    live.current = null;
    if (!l) return;
    cancelAnimationFrame(l.frame);
    l.stream.getTracks().forEach((t) => t.stop());
    void l.ctx.close();
    if (ring.current) ring.current.style.transform = 'scale(1)';
    const c = canvas.current;
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);
  }, []);

  /** Returns false when no meter could start (no permission, no API). The caller carries on. */
  const start = useCallback(async (): Promise<boolean> => {
    if (live.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      let level = 0;
      let last = performance.now();

      const draw = (now: number) => {
        const l = live.current;
        if (!l) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
        const rms = Math.min(1, Math.sqrt(sum / data.length) * 4.5);
        // Ballistics: ~60ms attack, ~300ms release.
        const rate = rms > level ? 1 - Math.exp(-dt / 0.06) : 1 - Math.exp(-dt / 0.3);
        level += (rms - level) * rate;

        if (ring.current) ring.current.style.transform = `scale(${(1 + level * 0.9).toFixed(3)})`;

        const c = canvas.current;
        const g = c?.getContext('2d');
        if (c && g) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const w = c.clientWidth;
          const h = c.clientHeight;
          if (c.width !== Math.round(w * dpr)) c.width = Math.round(w * dpr);
          if (c.height !== Math.round(h * dpr)) c.height = Math.round(h * dpr);
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          g.clearRect(0, 0, w, h);
          g.lineWidth = 2;
          g.lineJoin = 'round';
          g.strokeStyle = level > 0.55 ? '#FF4D26' : 'rgba(251,250,248,0.85)';
          g.beginPath();
          const step = Math.max(1, Math.floor(data.length / w));
          for (let x = 0, i = 0; x < w && i < data.length; x++, i += step) {
            const y = h / 2 + data[i]! * h * 1.6;
            if (x === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        }
        l.frame = requestAnimationFrame(draw);
      };

      live.current = { stream, ctx, analyser, frame: requestAnimationFrame(draw) };
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { canvas, ring, start, stop };
}
