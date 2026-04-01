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
  region_id?: string;
  // Computed fields added during collection
  _serviceType?: string;
  _serviceCategory?: string;
  _resourceGroupName?: string;
  _location?: string;
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
/**
 * Known IBM Cloud services keyed by CRN service name (the canonical identifier).
 * CRN format: crn:v1:bluemix:public:<service-name>:<region>:...
 */
export const KNOWN_SERVICES: Record<string, { name: string; category: string }> = {
  // Storage
  'cloud-object-storage': { name: 'Cloud Object Storage', category: 'Storage' },

  // Security
  'kms': { name: 'Key Protect', category: 'Security' },
  'secrets-manager': { name: 'Secrets Manager', category: 'Security' },
  'compliance': { name: 'Security and Compliance Center', category: 'Security' },
  'hs-crypto': { name: 'Hyper Protect Crypto Services', category: 'Security' },
  'appid': { name: 'App ID', category: 'Security' },

  // Compute
  'containers-kubernetes': { name: 'Kubernetes Service', category: 'Compute' },
  'openshift': { name: 'Red Hat OpenShift', category: 'Compute' },
  'codeengine': { name: 'Code Engine', category: 'Compute' },
  'functions': { name: 'Functions', category: 'Compute' },
  'satellite': { name: 'Satellite', category: 'Compute' },

  // Databases
  'dashdb-for-transactions': { name: 'Db2', category: 'Database' },
  'databases-for-postgresql': { name: 'Databases for PostgreSQL', category: 'Database' },
  'databases-for-mongodb': { name: 'Databases for MongoDB', category: 'Database' },
  'databases-for-redis': { name: 'Databases for Redis', category: 'Database' },
  'databases-for-mysql': { name: 'Databases for MySQL', category: 'Database' },
  'databases-for-elasticsearch': { name: 'Databases for Elasticsearch', category: 'Database' },
  'databases-for-etcd': { name: 'Databases for etcd', category: 'Database' },
  'databases-for-enterprisedb': { name: 'Databases for EnterpriseDB', category: 'Database' },
  'messages-for-rabbitmq': { name: 'Messages for RabbitMQ', category: 'Database' },
  'dashdb': { name: 'Db2 Warehouse', category: 'Database' },
  'cloudantnosqldb': { name: 'Cloudant', category: 'Database' },

  // Integration
  'messagehub': { name: 'Event Streams', category: 'Integration' },
  'mqcloud': { name: 'MQ', category: 'Integration' },
  'api-gateway': { name: 'API Gateway', category: 'Integration' },
  'event-notifications': { name: 'Event Notifications', category: 'Integration' },

  // AI
  'pm-20': { name: 'Watson Machine Learning', category: 'AI' },
  'data-science-experience': { name: 'Watson Studio', category: 'AI' },
  'conversation': { name: 'Watson Assistant', category: 'AI' },
  'discovery': { name: 'Watson Discovery', category: 'AI' },
  'natural-language-understanding': { name: 'Natural Language Understanding', category: 'AI' },
  'speech-to-text': { name: 'Speech to Text', category: 'AI' },
  'text-to-speech': { name: 'Text to Speech', category: 'AI' },
  'language-translator': { name: 'Language Translator', category: 'AI' },
  'aiopenscale': { name: 'Watson OpenScale', category: 'AI' },
  'watsonx': { name: 'watsonx.ai', category: 'AI' },

  // Observability
  'logdnaat': { name: 'Activity Tracker', category: 'Observability' },
  'logdna': { name: 'Log Analysis', category: 'Observability' },
  'sysdig-monitor': { name: 'Monitoring', category: 'Observability' },
  'logs': { name: 'Cloud Logs', category: 'Observability' },
  'atracker': { name: 'Activity Tracker Event Routing', category: 'Observability' },

  // Networking
  'internet-svcs': { name: 'Internet Services (CIS)', category: 'Networking' },
  'dns-svcs': { name: 'DNS Services', category: 'Networking' },

  // Developer Tools
  'continuous-delivery': { name: 'Continuous Delivery', category: 'Developer Tools' },
  'toolchain': { name: 'Toolchain', category: 'Developer Tools' },
  'container-registry': { name: 'Container Registry', category: 'Developer Tools' },
  'schematics': { name: 'Schematics', category: 'Developer Tools' },
  'cd-tekton-pipeline': { name: 'Tekton Pipeline', category: 'Developer Tools' },
  'project': { name: 'Projects', category: 'Developer Tools' },

  // VMware
  'vmware-solutions': { name: 'VMware Solutions', category: 'Compute' },

  // Observability (additional)
  'sysdig-secure': { name: 'Security and Compliance Monitoring', category: 'Observability' },

  // Management
  'resource-controller': { name: 'Resource Controller', category: 'Management' },
  'globalcatalog-collection': { name: 'Global Catalog', category: 'Management' },
  'iam-identity': { name: 'IAM Identity', category: 'Management' },
  'context-based-restrictions': { name: 'Context-based Restrictions', category: 'Management' },
};
