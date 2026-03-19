import relationshipData from '../data/classicRelationships.json';
import displayNameData from '../data/classicDisplayNames.json';

export interface Relationship {
  parentType: string;
  childType: string;
  parentField: string;
  childField: string;
  label: string;
}

const RELATIONSHIP_DEFINITIONS: Relationship[] = relationshipData;

export interface RelationshipInstance {
  parentType: string;
  childType: string;
  parentId: string | number;
  childIds: (string | number)[];
  label: string;
}

export function buildRelationships(
  collectedData: Record<string, unknown[]>
): RelationshipInstance[] {
  const instances: RelationshipInstance[] = [];

  for (const def of RELATIONSHIP_DEFINITIONS) {
    const parentItems = collectedData[def.parentType];
    const childItems = collectedData[def.childType];

    if (!parentItems?.length || !childItems?.length) continue;

    for (const parent of parentItems) {
      const parentRecord = parent as Record<string, unknown>;
      const parentValue = getNestedValue(parentRecord, def.parentField);
      if (parentValue === null || parentValue === undefined) continue;

      const matchingChildIds: (string | number)[] = [];
      for (const child of childItems) {
        const childRecord = child as Record<string, unknown>;
        const childValue = getNestedValue(childRecord, def.childField);
        if (childValue !== null && childValue !== undefined && String(childValue) === String(parentValue)) {
          const childId = getNestedValue(childRecord, 'id');
          if (childId !== null && childId !== undefined) {
            matchingChildIds.push(childId as string | number);
          }
        }
      }

      if (matchingChildIds.length > 0) {
        instances.push({
          parentType: def.parentType,
          childType: def.childType,
          parentId: parentValue as string | number,
          childIds: matchingChildIds,
          label: def.label,
        });
      }
    }
  }

  return instances;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Mapping from server-side display type names (used in vRelationships worksheet)
 * to frontend resource keys.
 */
const DISPLAY_NAME_TO_RESOURCE_KEY: Record<string, string> = displayNameData;

const RESOURCE_KEY_TO_DISPLAY_NAME: Record<string, string> = {};
for (const [display, key] of Object.entries(DISPLAY_NAME_TO_RESOURCE_KEY)) {
  RESOURCE_KEY_TO_DISPLAY_NAME[key] = display;
}

interface ImportedRelationshipRow {
  parentType: string;
  parentId: number | string;
  parentName: string;
  childType: string;
  childId: number | string;
  childName: string;
  relationshipField: string;
}

/**
 * Build relationship results from the imported vRelationships data.
 * Used as a fallback when on-the-fly computation can't find matches
 * (because join fields are missing from imported/flattened data).
 */
function getRelatedFromImported(
  resourceKey: string,
  row: Record<string, unknown>,
  importedRelationships: unknown[],
): { relationType: string; label: string; items: { id: string | number; displayName: string }[] }[] {
  const rowId = row.id;
  if (rowId === null || rowId === undefined) return [];

  const displayName = RESOURCE_KEY_TO_DISPLAY_NAME[resourceKey];
  if (!displayName) return [];

  const rowIdStr = String(rowId);
  const results: { relationType: string; label: string; items: { id: string | number; displayName: string }[] }[] = [];

  // Group: current row is the parent → find children
  const childGroups = new Map<string, { id: string | number; displayName: string }[]>();
  // Group: current row is the child → find parents
  const parentGroups = new Map<string, { id: string | number; displayName: string }[]>();

  for (const rel of importedRelationships) {
    const r = rel as ImportedRelationshipRow;

    if (r.parentType === displayName && String(r.parentId) === rowIdStr) {
      const childKey = r.childType;
      const group = childGroups.get(childKey) ?? [];
      group.push({ id: r.childId, displayName: r.childName || String(r.childId) });
      childGroups.set(childKey, group);
    } else if (r.childType === displayName && String(r.childId) === rowIdStr) {
      const parentKey = r.parentType;
      const group = parentGroups.get(parentKey) ?? [];
      group.push({ id: r.parentId, displayName: r.parentName || String(r.parentId) });
      parentGroups.set(parentKey, group);
    }
  }

  for (const [childDisplayType, items] of childGroups) {
    results.push({
      relationType: 'children',
      label: `${displayName} has ${childDisplayType}s`,
      items,
    });
  }

  for (const [parentDisplayType, items] of parentGroups) {
    results.push({
      relationType: 'parents',
      label: `${parentDisplayType} has ${displayName}s`,
      items,
    });
  }

  return results;
}

export function getRelatedResources(
  resourceKey: string,
  row: Record<string, unknown>,
  collectedData: Record<string, unknown[]>,
): { relationType: string; label: string; items: { id: string | number; displayName: string }[] }[] {
  const results: { relationType: string; label: string; items: { id: string | number; displayName: string }[] }[] = [];

  for (const def of RELATIONSHIP_DEFINITIONS) {
    if (def.parentType === resourceKey) {
      // Current row is the parent — find children
      const parentValue = getNestedValue(row, def.parentField);
      if (parentValue === null || parentValue === undefined) continue;

      const childItems = collectedData[def.childType];
      if (!childItems?.length) continue;

      const matched: { id: string | number; displayName: string }[] = [];
      for (const child of childItems) {
        const childRecord = child as Record<string, unknown>;
        const childValue = getNestedValue(childRecord, def.childField);
        if (childValue !== null && childValue !== undefined && String(childValue) === String(parentValue)) {
          const id = (getNestedValue(childRecord, 'id') ?? '') as string | number;
          const displayName = String(
            getNestedValue(childRecord, 'hostname') ??
            getNestedValue(childRecord, 'name') ??
            getNestedValue(childRecord, 'label') ??
            id
          );
          matched.push({ id, displayName });
        }
      }

      if (matched.length > 0) {
        results.push({ relationType: 'children', label: def.label, items: matched });
      }
    } else if (def.childType === resourceKey) {
      // Current row is the child — find parents
      const childValue = getNestedValue(row, def.childField);
      if (childValue === null || childValue === undefined) continue;

      const parentItems = collectedData[def.parentType];
      if (!parentItems?.length) continue;

      const matched: { id: string | number; displayName: string }[] = [];
      for (const parent of parentItems) {
        const parentRecord = parent as Record<string, unknown>;
        const parentValue = getNestedValue(parentRecord, def.parentField);
        if (parentValue !== null && parentValue !== undefined && String(parentValue) === String(childValue)) {
          const id = (getNestedValue(parentRecord, 'id') ?? '') as string | number;
          const displayName = String(
            getNestedValue(parentRecord, 'hostname') ??
            getNestedValue(parentRecord, 'name') ??
            getNestedValue(parentRecord, 'label') ??
            id
          );
          matched.push({ id, displayName });
        }
      }

      if (matched.length > 0) {
        results.push({ relationType: 'parents', label: def.label, items: matched });
      }
    }
  }

  // Fallback: supplement with imported vRelationships data for relationships
  // that the on-the-fly computation couldn't find (missing join fields in flattened data)
  const importedRelationships = collectedData['relationships'];
  if (importedRelationships?.length) {
    const imported = getRelatedFromImported(resourceKey, row, importedRelationships);

    // Only add imported relationships that weren't already found by on-the-fly computation.
    // Build a set of "relationType:label" keys from existing results for dedup.
    const existingLabels = new Set(results.map((r) => `${r.relationType}:${r.label}`));
    for (const imp of imported) {
      if (!existingLabels.has(`${imp.relationType}:${imp.label}`)) {
        results.push(imp);
      }
    }
  }

  return results;
}

export { RELATIONSHIP_DEFINITIONS };
