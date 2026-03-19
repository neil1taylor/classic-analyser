// Collection preferences persistence — resource type selection, concurrency settings
import { useLocalPreferences } from './useLocalPreferences';

interface CollectionPrefs {
  excludedResourceTypes: string[];
  concurrency: number;
}

const DEFAULT_COLLECTION_PREFS: CollectionPrefs = {
  excludedResourceTypes: [],
  concurrency: 10,
};

export function useCollectionPreferences(accountId?: string, accountName?: string) {
  const { data, persist, reset } = useLocalPreferences<CollectionPrefs>({
    storageKey: 'ibm-explorer-collection-prefs',
    version: 1,
    defaultValue: DEFAULT_COLLECTION_PREFS,
    accountId,
    accountName,
  });

  return { collectionPreferences: data, setCollectionPreferences: persist, resetCollectionPreferences: reset };
}
