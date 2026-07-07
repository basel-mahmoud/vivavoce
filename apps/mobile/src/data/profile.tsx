import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import type { Api, ProfilePatch } from '@/lib/api';
import { goalFromFormats, type StudyLevelKey } from '@/data/content';

/** Device timezone (Hermes ships full Intl); falls back to UTC if unavailable. */
function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export type Goal = 'viva' | 'interview' | 'language' | 'presentation' | 'oral_exam';
export type Level = 'intro' | 'intermediate' | 'advanced' | 'expert';

export interface Profile {
  displayName: string | null;
  goal: Goal | null;
  level: Level;
  /** Field-of-study key (see content.fields). Stored as text server-side. */
  fieldOfStudy: string | null;
  studyLevel: StudyLevelKey | null;
  examFormats: string[];
  /** Subject keys (see content.subjects). */
  subjects: string[];
  // Consent flags gate on-device mic use; kept local, never a calibration input.
  consentAudio: boolean;
  consentAI: boolean;
  onboarded: boolean;
}

const DEFAULT: Profile = {
  displayName: null,
  goal: null,
  level: 'intermediate',
  fieldOfStudy: null,
  studyLevel: null,
  examFormats: [],
  subjects: [],
  consentAudio: false,
  consentAI: false,
  onboarded: false,
};

const KEY = 'vv-profile';

interface Ctx {
  profile: Profile;
  ready: boolean;
  /** True while a server sync is in flight (first load after sign-in). */
  syncing: boolean;
  /** true = signed in, false = signed out, null = demo/local (no Clerk). */
  signedIn: boolean | null;
  update: (patch: Partial<Profile>) => void;
  refresh: () => Promise<void>;
  reset: () => void;
}

const ProfileContext = createContext<Ctx | null>(null);

/** Map the local Profile onto the server contract (consent stays local). */
function toPatch(p: Profile): ProfilePatch {
  return {
    displayName: p.displayName ?? undefined,
    goal: p.examFormats.length ? goalFromFormats(p.examFormats) : p.goal ?? undefined,
    level: p.level,
    fieldOfStudy: p.fieldOfStudy,
    studyLevel: p.studyLevel,
    examFormats: p.examFormats,
    subjectKeys: p.subjects,
    timezone: deviceTimezone(),
    onboarded: p.onboarded || undefined,
  };
}

/**
 * Backend-backed profile. A SecureStore cache paints instantly and keeps the app
 * usable offline; when signed in, the server (GET /api/v1/me) is the source of
 * truth and every change is pushed with PATCH. `signedIn === null` is demo/local
 * mode (no Clerk configured), where the profile lives only on the device.
 */
export function ProfileProvider({
  api,
  signedIn,
  children,
}: {
  api: Api | null;
  signedIn: boolean | null;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // State (not a ref!) so the reconcile effect re-runs when the cache lands —
  // a ref here caused an unfixable race: Clerk restoring the session faster
  // than SecureStore loads left `ready` false forever (infinite boot spinner).
  const [cacheReady, setCacheReady] = useState(false);
  const hadCache = useRef(false);
  const latest = useRef<Profile>(DEFAULT);
  latest.current = profile;

  const persistLocal = useCallback((next: Profile) => {
    setProfile(next);
    SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // 1. Instant paint from the on-device cache (runs exactly once).
  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((raw) => {
        if (raw) {
          hadCache.current = true;
          const cached = { ...DEFAULT, ...(JSON.parse(raw) as Partial<Profile>) };
          setProfile(cached);
          latest.current = cached;
        }
      })
      .catch(() => {})
      .finally(() => setCacheReady(true));
  }, []);

  const pullServer = useCallback(async () => {
    if (!api) return;
    setSyncing(true);
    try {
      const res = await api.getMe();
      if (res.ok) {
        const u = res.data.user;
        const merged: Profile = {
          ...latest.current,
          displayName: u.displayName ?? latest.current.displayName,
          goal: (u.goal as Goal | null) ?? latest.current.goal,
          level: (u.level as Level) ?? latest.current.level,
          fieldOfStudy: u.fieldOfStudy ?? latest.current.fieldOfStudy,
          studyLevel: (u.studyLevel as StudyLevelKey | null) ?? latest.current.studyLevel,
          examFormats: u.examFormats?.length ? u.examFormats : latest.current.examFormats,
          subjects: u.subjectKeys?.length ? u.subjectKeys : latest.current.subjects,
          onboarded: u.onboarded,
        };
        persistLocal(merged);
      }
    } catch {
      // Offline or transient — the cache already painted; try again next launch.
    } finally {
      setSyncing(false);
      setReady(true);
    }
  }, [api, persistLocal]);

  // 2. Reconcile once BOTH signals have landed (cache loaded + auth resolved).
  useEffect(() => {
    if (!cacheReady) return;
    if (signedIn === true) {
      // Reopen path: a cached profile paints instantly and the server sync
      // happens in the background. Fresh installs (no cache) wait for the
      // server so routing uses the account's real onboarded state —
      // pullServer's finally sets ready either way, even offline.
      if (hadCache.current) setReady(true);
      void pullServer();
    } else {
      // Signed out or demo mode: the device cache is the source of truth.
      setReady(true);
    }
  }, [cacheReady, signedIn, pullServer]);

  const update = useCallback(
    (patch: Partial<Profile>) => {
      const next = { ...latest.current, ...patch };
      persistLocal(next);
      if (signedIn === true && api) {
        // Push calibration to the server; local stays authoritative on failure.
        api.updateMe(toPatch(next)).catch(() => {});
      }
    },
    [api, signedIn, persistLocal],
  );

  const reset = useCallback(() => persistLocal(DEFAULT), [persistLocal]);

  const value = useMemo(
    () => ({ profile, ready, syncing, signedIn, update, refresh: pullServer, reset }),
    [profile, ready, syncing, signedIn, update, pullServer, reset],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
