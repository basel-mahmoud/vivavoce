import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

export type Goal = 'viva' | 'interview' | 'language' | 'presentation' | 'oral_exam';
export type Level = 'intro' | 'intermediate' | 'advanced' | 'expert';

export interface Profile {
  goal: Goal | null;
  level: Level;
  subjects: string[];
  consentAudio: boolean;
  consentAI: boolean;
  onboarded: boolean;
}

const DEFAULT: Profile = {
  goal: null,
  level: 'intermediate',
  subjects: [],
  consentAudio: false,
  consentAI: false,
  onboarded: false,
};

const KEY = 'vv-profile';

interface Ctx {
  profile: Profile;
  ready: boolean;
  update: (patch: Partial<Profile>) => void;
  reset: () => void;
}

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((raw) => {
        if (raw) setProfile({ ...DEFAULT, ...(JSON.parse(raw) as Partial<Profile>) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: Profile) => {
    setProfile(next);
    SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const update = useCallback(
    (patch: Partial<Profile>) => persist({ ...profile, ...patch }),
    [profile, persist],
  );
  const reset = useCallback(() => persist(DEFAULT), [persist]);

  const value = useMemo(
    () => ({ profile, ready, update, reset }),
    [profile, ready, update, reset],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
