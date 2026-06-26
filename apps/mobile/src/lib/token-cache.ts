import * as SecureStore from 'expo-secure-store';

/** Matches Clerk Expo's TokenCache contract without depending on its internal
 *  module path (which moves between versions). */
interface TokenCache {
  getToken: (key: string) => Promise<string | undefined | null>;
  saveToken: (key: string, token: string) => Promise<void>;
  clearToken?: (key: string) => void;
}

/**
 * Clerk token cache backed by the OS secure enclave / keystore (expo-secure-store)
 * rather than AsyncStorage, so session tokens are encrypted at rest on device.
 */
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* ignore write failures; Clerk will re-auth */
    }
  },
};
