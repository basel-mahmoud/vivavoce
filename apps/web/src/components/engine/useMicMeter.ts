'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Samples the examiners' glass faces take (faceMaterial WAVE_SAMPLES). */
export const FACE_SAMPLES = 32;
/** Envelope history for the paper waveform: about 1.6 s at HISTORY_HZ. */
export const HISTORY = 48;
const HISTORY_HZ = 30;

export interface Meter {
  /** 0..1 with VU ballistics: fast attack, slow release. */
  level: number;
  /** The level over the last moments, oldest first, 0..1 (the paper waveform). */
  history: Float32Array;
  /** -1..1 for the listening faces: the history under a voice-like carrier. */
  wave: Float32Array;
  /** 'mic': a real microphone. 'voice': driven by speech results (the mic is busy recognising). */
  source: 'mic' | 'voice' | 'off';
}

export type MicResult = 'granted' | 'denied' | 'unavailable';

interface Live {
  stream: MediaStream | null;
  ctx: AudioContext | null;
  analyser: AnalyserNode | null;
  frame: number;
}

/**
 * The candidate's voice as numbers, for the paper waveform and the five listening faces.
 *
 * Nothing is recorded or sent anywhere: the stream is analysed locally, frame by frame, and closed
 * on stop. Where the microphone is busy with speech recognition (phones), `startVoice()` drives
 * the same meter from recognition results instead, so the faces still move with the answer.
 * Readers take `meter.current` every frame or `subscribe()` for a per-frame callback: no React
 * state changes per frame.
 */
export function useMicMeter() {
  const meter = useRef<Meter>({
    level: 0,
    history: new Float32Array(HISTORY),
    wave: new Float32Array(FACE_SAMPLES),
    source: 'off',
  });
  const live = useRef<Live | null>(null);
  const listeners = useRef(new Set<(m: Meter) => void>());
  const kick = useRef(0);

  const loop = useCallback((analyser: AnalyserNode | null) => {
    const m = meter.current;
    const data = analyser ? new Float32Array(analyser.fftSize) : null;
    let last = performance.now();
    let acc = 0;
    let t = 0;
    const tick = (now: number) => {
      const l = live.current;
      if (!l) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      let target: number;
      if (analyser && data) {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i]! * data[i]!;
        target = Math.min(1, Math.sqrt(sum / data.length) * 5);
      } else {
        // speech results arrive in bursts: each one kicks a syllable-ish envelope that decays
        kick.current *= Math.exp(-dt / 0.22);
        target = kick.current * (0.5 + 0.5 * Math.abs(Math.sin(t * 15.7) * Math.sin(t * 4.9 + 1)));
      }
      // ballistics: about 60 ms attack, 300 ms release
      const rate = target > m.level ? 1 - Math.exp(-dt / 0.06) : 1 - Math.exp(-dt / 0.3);
      m.level += (target - m.level) * rate;

      acc += dt;
      while (acc >= 1 / HISTORY_HZ) {
        acc -= 1 / HISTORY_HZ;
        m.history.copyWithin(0, 1);
        m.history[HISTORY - 1] = m.level;
      }

      // the faces: the recent envelope, newest at the centre, under a speech-like carrier
      const w = m.wave;
      for (let j = 0; j < FACE_SAMPLES; j++) {
        const x = j / (FACE_SAMPLES - 1);
        const age = Math.round(Math.abs(x - 0.5) * 2 * (HISTORY - 1) * 0.6);
        const amp = m.history[HISTORY - 1 - age]! * Math.sin(Math.PI * x);
        w[j] = Math.max(-1, Math.min(1, amp * 1.35 * (0.62 * Math.sin(j * 1.7 + t * 23) + 0.38 * Math.sin(j * 0.63 - t * 11))));
      }

      listeners.current.forEach((fn) => fn(m));
      l.frame = requestAnimationFrame(tick);
    };
    return requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    const l = live.current;
    live.current = null;
    kick.current = 0;
    const m = meter.current;
    m.source = 'off';
    m.level = 0;
    if (!l) return;
    cancelAnimationFrame(l.frame);
    l.stream?.getTracks().forEach((t) => t.stop());
    void l.ctx?.close().catch(() => undefined);
  }, []);

  /** Open the microphone (this is what asks for permission). */
  const start = useCallback(async (): Promise<MicResult> => {
    if (live.current?.stream) return 'granted';
    stop();
    if (!navigator.mediaDevices?.getUserMedia) return 'unavailable';
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable';
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      stream.getTracks().forEach((t) => t.stop());
      return 'unavailable';
    }
    const ctx = new Ctx();
    void ctx.resume().catch(() => undefined);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.5;
    ctx.createMediaStreamSource(stream).connect(analyser);
    meter.current.history.fill(0);
    meter.current.source = 'mic';
    live.current = { stream, ctx, analyser, frame: 0 };
    live.current.frame = loop(analyser);
    return 'granted';
  }, [loop, stop]);

  /** Drive the meter from speech results instead of the microphone. */
  const startVoice = useCallback(() => {
    if (live.current) return;
    meter.current.history.fill(0);
    meter.current.source = 'voice';
    live.current = { stream: null, ctx: null, analyser: null, frame: 0 };
    live.current.frame = loop(null);
  }, [loop]);

  /** A burst of recognised speech (voice source only). */
  const pulse = useCallback((strength = 1) => {
    kick.current = Math.max(kick.current, Math.min(1, strength));
  }, []);

  const subscribe = useCallback((fn: (m: Meter) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  useEffect(() => stop, [stop]);

  return { meter, start, startVoice, pulse, stop, subscribe };
}
