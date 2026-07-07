import { Directory, File, Paths } from 'expo-file-system';
import type { Api } from './api';

/**
 * Offline answer queue (PRODUCT.md: "record locally, queue upload").
 * Failed submissions persist to app-private storage and flush when the app
 * comes back online/foreground. Server-side idempotency (clientAnswerKey)
 * makes re-submission safe; files are named by that key so enqueueing is
 * idempotent too. Bounded: 20 items max, 7-day expiry.
 */
export interface QueuedAnswer {
  sessionId: string;
  clientAnswerKey: string;
  questionPrompt: string;
  transcript?: string;
  audioBase64?: string;
  audioMimeType?: string;
  durationMs?: number;
  queuedAt: number;
}

const MAX_ITEMS = 20;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function dir(): Directory {
  const d = new Directory(Paths.document, 'answer-queue');
  try {
    d.create({ intermediates: true, idempotent: true });
  } catch {
    /* already exists */
  }
  return d;
}

export function enqueueAnswer(item: QueuedAnswer): boolean {
  try {
    const d = dir();
    const existing = d.list().filter((e): e is File => e instanceof File);
    if (existing.length >= MAX_ITEMS) return false; // bounded, oldest wins
    const f = new File(d, `${item.clientAnswerKey}.json`);
    f.write(JSON.stringify(item));
    return true;
  } catch {
    return false;
  }
}

export function queuedCount(): number {
  try {
    return dir().list().filter((e) => e instanceof File).length;
  } catch {
    return 0;
  }
}

/**
 * Try to submit everything in the queue. Deletes items the server accepted or
 * permanently rejected (validation/permission — poisoned items must not loop
 * forever); keeps items that failed on network for the next flush.
 */
export async function flushQueue(api: Api): Promise<{ sent: number; kept: number }> {
  let sent = 0;
  let kept = 0;
  let files: File[] = [];
  try {
    files = dir().list().filter((e): e is File => e instanceof File);
  } catch {
    return { sent, kept };
  }

  for (const f of files) {
    let item: QueuedAnswer | null = null;
    try {
      item = JSON.parse(await f.text()) as QueuedAnswer;
    } catch {
      try { f.delete(); } catch { /* unreadable — drop */ }
      continue;
    }

    if (Date.now() - item.queuedAt > MAX_AGE_MS) {
      try { f.delete(); } catch { /* expired */ }
      continue;
    }

    const res = await api.submitAnswer({
      sessionId: item.sessionId,
      clientAnswerKey: item.clientAnswerKey,
      questionPrompt: item.questionPrompt,
      transcript: item.transcript,
      audioBase64: item.audioBase64,
      audioMimeType: item.audioMimeType,
      durationMs: item.durationMs,
    });

    if (res.ok || (res.error.code !== 'network' && res.error.code !== 'rate_limited')) {
      // Accepted, or permanently rejected — either way it leaves the queue.
      if (res.ok) sent += 1;
      try { f.delete(); } catch { /* done with it */ }
    } else {
      kept += 1; // still offline / throttled — try again next flush
    }
  }
  return { sent, kept };
}
