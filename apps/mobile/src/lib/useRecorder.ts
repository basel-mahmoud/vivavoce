import { useCallback, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

export interface CapturedAudio {
  base64: string;
  mimeType: string;
  durationMs: number;
}

export type PermissionState = 'unknown' | 'granted' | 'denied';

/**
 * Real device audio capture (expo-audio). Records to .m4a, then reads the file
 * as base64 so the backend can transcribe it via Gemini. Returns null from
 * stop() on any failure (no permission, simulator without mic, empty take) so
 * the session can fall back gracefully rather than dead-end.
 */
export function useRecorder() {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const state = useAudioRecorderState(recorder, 100);
  const [permission, setPermission] = useState<PermissionState>('unknown');

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const res = await requestRecordingPermissionsAsync();
    setPermission(res.granted ? 'granted' : 'denied');
    return res.granted;
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const ok = await ensurePermission();
      if (!ok) return false;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch {
      return false;
    }
  }, [recorder, ensurePermission]);

  const stop = useCallback(async (): Promise<CapturedAudio | null> => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const durationMs = Math.max(0, Math.round((state.durationMillis ?? 0)));
      if (!uri) return null;
      const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
      if (!base64) return null;
      return { base64, mimeType: 'audio/mp4', durationMs };
    } catch {
      return null;
    }
  }, [recorder, state.durationMillis]);

  return {
    start,
    stop,
    permission,
    isRecording: state.isRecording,
    durationMs: state.durationMillis ?? 0,
    metering: state.metering,
  };
}
