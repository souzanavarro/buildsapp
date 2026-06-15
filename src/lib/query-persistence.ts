import { Preferences } from '@capacitor/preferences';
import { Persister, PersistedClient } from '@tanstack/query-persist-client-core';

/**
 * Persister for TanStack Query using Capacitor Preferences.
 * This ensures data persists across app restarts on mobile devices
 * even if localStorage is cleared by the OS.
 */
export const createCapacitorPersister = (): Persister => {
  return {
    persistClient: async (client: PersistedClient) => {
      await Preferences.set({
        key: 'TANSTACK_QUERY_OFFLINE_CACHE',
        value: JSON.stringify(client),
      });
    },
    restoreClient: async () => {
      const { value } = await Preferences.get({
        key: 'TANSTACK_QUERY_OFFLINE_CACHE',
      });
      if (value) {
        return JSON.parse(value) as PersistedClient;
      }
      return undefined;
    },
    removeClient: async () => {
      await Preferences.remove({
        key: 'TANSTACK_QUERY_OFFLINE_CACHE',
      });
    },
  };
};

