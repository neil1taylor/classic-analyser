// Platform Services types — Resource Controller API

export interface ServiceInstance {
  id: string;
  guid: string;
  crn: string;
  name: string;
  resource_group_id: string;
  resource_plan_id: string;
  type: string;
  state: string;
  location: string;
  resource_id: string;
  created_at: string;
  updated_at: string;
  extensions?: Record<string, unknown>;
  // Computed fields added during collection
  _serviceType?: string;
  _serviceCategory?: string;
  _resourceGroupName?: string;
  [key: string]: unknown;
}

export interface ResourceGroup {
  id: string;
  name: string;
  crn: string;
  state: string;
  account_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlatformCollectionError {
  resourceType: string;
  message: string;
  statusCode?: number;
}

/**
 * Known IBM Cloud service resource IDs mapped to display-friendly names and categories.
 * The resource_id field in Resource Controller responses identifies the service type.
 */
export const KNOWN_SERVICES: Record<string, { name: string; category: string }> = {
  // Storage
  'dff97f5c-bc5e-4455-b470-411c3edbe49c': { name: 'Cloud Object Storage', category: 'Storage' },

  // Security
  '4c6fb6f2-d26a-4461-a1f2-93d79b1ca37b': { name: 'Key Protect', category: 'Security' },
  '0fef69bd-2a49-4ab0-9e03-19c6cf23606d': { name: 'Secrets Manager', category: 'Security' },
  '2c829832-ce73-470f-9492-a26e43bc0286': { name: 'Security and Compliance Center', category: 'Security' },

  // Compute
  '8eee2b62-c498-4e0d-a498-1e7ee9e1cc89': { name: 'Kubernetes Service', category: 'Compute' },
  'cfbebac6-df3e-4ac8-9c6e-74a0d36bd0c0': { name: 'Red Hat OpenShift', category: 'Compute' },
  '7045626d-55e3-4418-be11-683a26dbc1e5': { name: 'Code Engine', category: 'Compute' },
  '20c54bbf-82be-44c3-8c80-3c0f80cc5681': { name: 'Functions', category: 'Compute' },

  // Databases
  'dashdb-for-transactions': { name: 'Db2', category: 'Database' },
  '8c9c96dc-1611-4acf-9862-6fff0ccc3fa0': { name: 'Databases for PostgreSQL', category: 'Database' },
  '95f89e39-4ddc-4050-aadc-e720b544e2f1': { name: 'Databases for MongoDB', category: 'Database' },
  'd10c0cf8-e7cd-4ff8-903c-cdb1ee87e44e': { name: 'Databases for Redis', category: 'Database' },
  '1f27ed2c-0070-4001-a26a-45990fe53f7c': { name: 'Databases for MySQL', category: 'Database' },
  'b6207e9f-2581-47ad-afc5-f44970fea72c': { name: 'Databases for Elasticsearch', category: 'Database' },
  '46221dd7-f4ee-4fb1-9c5d-ba5cf3fd5a5b': { name: 'Databases for etcd', category: 'Database' },

  // Integration
  'd3e49a0e-b3b1-4b15-84ad-bc7d1dfd97b3': { name: 'Event Streams', category: 'Integration' },
  '8b5b2df5-66c9-4b13-b538-0cf6e1722b59': { name: 'MQ', category: 'Integration' },

  // AI
  '51c53b72-918f-4869-b834-2d99eb28422a': { name: 'Watson Machine Learning', category: 'AI' },
  '5c4b9c4c-b45a-4a3a-8a5d-8e6e6a0c4f2c': { name: 'Watson Studio', category: 'AI' },
  'cb3d7879-0590-4fad-94a8-e1f50f0cf815': { name: 'watsonx.ai', category: 'AI' },

  // Observability
  '9a4aa400-e7c9-4006-9700-877f2ff48219': { name: 'Activity Tracker', category: 'Observability' },
  'dae1b909-dce0-4d1c-a1c6-1d3b4f49febc': { name: 'Log Analysis', category: 'Observability' },
  '090c2740-7614-4fbb-ba07-c51401b67028': { name: 'Monitoring', category: 'Observability' },
  '35b7992c-e049-41ec-b0ba-62b4e0e7be6c': { name: 'Cloud Logs', category: 'Observability' },

  // Networking
  '739bfab6-99f2-4825-a4e3-e67b1c3ec66e': { name: 'Internet Services', category: 'Networking' },
  'b4ed8a30-936f-11e9-b289-1d079699cbe5': { name: 'DNS Services', category: 'Networking' },

  // Developer Tools
  '7a4d68b0-9c22-11e8-98d0-529269fb1459': { name: 'Continuous Delivery', category: 'Developer Tools' },
  '0b83d0c2-f7a0-4bc3-a5f2-8f3146c264f5': { name: 'Toolchain', category: 'Developer Tools' },
  '61df9260-6e19-462d-8e7a-a44de80c7e03': { name: 'Container Registry', category: 'Developer Tools' },
};
