type RawItem = Record<string, unknown>;

function transformServiceInstance(raw: RawItem): RawItem {
  return {
    name: raw.name,
    guid: raw.guid,
    _serviceType: raw._serviceType,
    _serviceCategory: raw._serviceCategory,
    state: raw.state,
    location: raw._location ?? raw.location ?? '',
    _resourceGroupName: raw._resourceGroupName ?? raw.resource_group_id,
    type: raw.type,
    resource_id: raw.resource_id,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    crn: raw.crn,
  };
}

const PLATFORM_TRANSFORMERS: Record<string, (raw: RawItem) => RawItem> = {
  serviceInstances: transformServiceInstance,
};

export function transformPlatformItems(resourceKey: string, items: unknown[]): unknown[] {
  const transformer = PLATFORM_TRANSFORMERS[resourceKey];
  if (!transformer) return items;
  return items.map((item) => transformer(item as RawItem));
}
