import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';

/**
 * The examiner's voice (on-device TTS via expo-speech — free, offline).
 * Preference persists across launches; default ON: this is a voice-first app,
 * and hearing the question is the closest thing to the real room.
 */
const KEY = 'vv-voice-examiner';

export async function getVoiceEnabled(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function setVoiceEnabled(on: boolean): void {
  SecureStore.setItemAsync(KEY, on ? '1' : '0').catch(() => {});
}

/** Read a question aloud, replacing anything currently being spoken. */
export function speak(text: string): void {
  try {
    Speech.stop();
    Speech.speak(text, { language: 'en', rate: 0.98, pitch: 1.0 });
  } catch {
    /* TTS unavailable — silent examiner, no crash */
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    /* nothing to stop */
  }
}
