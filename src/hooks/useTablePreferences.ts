// Table preferences persistence — column visibility, sort, filter presets per table
import { useLocalPreferences } from './useLocalPreferences';

interface TablePrefs {
  hiddenColumns: Record<string, string[]>;
  sortState: Record<string, { column: string; direction: 'asc' | 'desc' }>;
}

const DEFAULT_TABLE_PREFS: TablePrefs = {
  hiddenColumns: {},
  sortState: {},
};

export function useTablePreferences(accountId?: string, accountName?: string) {
  const { data, persist, reset } = useLocalPreferences<TablePrefs>({
    storageKey: 'ibm-explorer-table-prefs',
    version: 1,
    defaultValue: DEFAULT_TABLE_PREFS,
    accountId,
    accountName,
  });

  const setHiddenColumns = (tableKey: string, columns: string[]) => {
    persist({ ...data, hiddenColumns: { ...data.hiddenColumns, [tableKey]: columns } });
  };

  const setSortState = (tableKey: string, column: string, direction: 'asc' | 'desc') => {
    persist({ ...data, sortState: { ...data.sortState, [tableKey]: { column, direction } } });
  };

  return {
    hiddenColumns: data.hiddenColumns,
    sortState: data.sortState,
    setHiddenColumns,
    setSortState,
    resetTablePreferences: reset,
  };
}
