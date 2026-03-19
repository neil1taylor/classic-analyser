// Domain preferences persistence — preferred domain tab, last page per domain
import { useLocalPreferences } from './useLocalPreferences';
import type { InfrastructureDomain } from '@/contexts/AuthContext';

interface DomainPrefs {
  preferredDomain: InfrastructureDomain | null;
  lastPagePerDomain: Record<string, string>;
}

const DEFAULT_DOMAIN_PREFS: DomainPrefs = {
  preferredDomain: null,
  lastPagePerDomain: {},
};

export function useDomainPreferences(accountId?: string, accountName?: string) {
  const { data, persist, reset } = useLocalPreferences<DomainPrefs>({
    storageKey: 'ibm-explorer-domain-prefs',
    version: 1,
    defaultValue: DEFAULT_DOMAIN_PREFS,
    accountId,
    accountName,
  });

  const setPreferredDomain = (domain: InfrastructureDomain) => {
    persist({ ...data, preferredDomain: domain });
  };

  const setLastPage = (domain: InfrastructureDomain, path: string) => {
    persist({ ...data, lastPagePerDomain: { ...data.lastPagePerDomain, [domain]: path } });
  };

  return {
    preferredDomain: data.preferredDomain,
    lastPagePerDomain: data.lastPagePerDomain,
    setPreferredDomain,
    setLastPage,
    resetDomainPreferences: reset,
  };
}
