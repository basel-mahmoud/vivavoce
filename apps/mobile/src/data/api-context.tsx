import { createContext, useContext, useMemo } from 'react';
import { createApi, type Api } from '@/lib/api';

const ApiContext = createContext<Api | null>(null);

/**
 * Provides the typed backend client with a token getter. Clerk hook usage is
 * isolated to the bridge in the root layout, so screens depend only on this
 * context and stay testable without an auth provider.
 */
export function ApiProvider({
  getToken,
  children,
}: {
  getToken: () => Promise<string | null>;
  children: React.ReactNode;
}) {
  const api = useMemo(() => createApi(getToken), [getToken]);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): Api | null {
  return useContext(ApiContext);
}
