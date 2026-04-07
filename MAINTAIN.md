# IBM Cloud Infrastructure Explorer
# Maintainability & Data Freshness Strategy

---

| | |
|---|---|
| **Document Type** | Technical Architecture & Operations |
| **Date** | January 28, 2025 |
| **Related Document** | IBM Cloud Infrastructure Explorer PRD v1.0 |
| **Purpose** | Strategies for keeping reference data current and maintaining long-term code quality |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Reference Data Categories](#2-reference-data-categories)
3. [VPC Instance Profile Management](#3-vpc-instance-profile-management)
4. [Pricing Data Management](#4-pricing-data-management)
5. [OS Image Catalogue Management](#5-os-image-catalogue-management)
6. [Datacenter & Region Management](#6-datacenter--region-management)
7. [Automated Data Refresh Pipeline](#7-automated-data-refresh-pipeline)
8. [Caching Strategy](#8-caching-strategy)
9. [Fallback & Resilience](#9-fallback--resilience)
10. [Versioning & Change Detection](#10-versioning--change-detection)
11. [Code Maintainability](#11-code-maintainability)
12. [Testing Strategy](#12-testing-strategy)
13. [Monitoring & Alerting](#13-monitoring--alerting)
14. [Operational Runbooks](#14-operational-runbooks)

---

## 1. Overview

### 1.1 The Challenge

IBM Cloud infrastructure offerings evolve continuously:
- New VPC instance profiles are added quarterly
- Pricing changes occur regularly
- New OS images are released monthly
- Datacenters are added or deprecated
- Feature parity between Classic and VPC improves over time

Hardcoding this data leads to:
- Stale recommendations
- Incorrect cost estimates
- Missing migration options
- Poor user experience
- Increased maintenance burden

### 1.2 Design Principles

| Principle | Description |
|-----------|-------------|
| **Single Source of Truth** | IBM Cloud APIs are authoritative; local data is a cache |
| **Graceful Degradation** | If live data unavailable, use cached data with warnings |
| **Transparency** | Always show data freshness timestamps to users |
| **Automation First** | Automated pipelines refresh data; manual updates for emergencies only |
| **Separation of Concerns** | Reference data separate from application code |

### 1.3 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Reference Data Architecture                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      IBM Cloud APIs                                  │  │
│   │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │  │
│   │  │ VPC API   │ │ Global    │ │ Catalog   │ │ BSS/Usage │           │  │
│   │  │ Profiles  │ │ Catalog   │ │ Images    │ │ Pricing   │           │  │
│   │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘           │  │
│   └────────┼─────────────┼─────────────┼─────────────┼───────────────────┘  │
│            │             │             │             │                      │
│            └─────────────┴──────┬──────┴─────────────┘                      │
│                                 │                                           │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                   Data Refresh Pipeline                              │  │
│   │                   (Scheduled - Daily/Weekly)                         │  │
│   │                                                                      │  │
│   │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐     │  │
│   │  │  Fetch    │──▶│ Validate  │──▶│ Transform │──▶│  Store    │     │  │
│   │  │  Data     │   │  Schema   │   │  & Enrich │   │  & Version│     │  │
│   │  └───────────┘   └───────────┘   └───────────┘   └───────────┘     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                     Reference Data Store                             │  │
│   │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │  │
│   │  │ Cloud Object    │  │ Git Repository  │  │ In-App Cache    │     │  │
│   │  │ Storage (COS)   │  │ (versioned JSON)│  │ (runtime)       │     │  │
│   │  │ [Primary]       │  │ [Backup/Audit]  │  │ [Performance]   │     │  │
│   │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
│                                 ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                Infrastructure Explorer                       │  │
│   │  Migration Analysis uses fresh reference data for:                  │  │
│   │  • Profile recommendations  • Cost estimates                        │  │
│   │  • OS compatibility         • Feature gap analysis                  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Reference Data Categories

### 2.1 Data Classification

| Category | Update Frequency | Source | Criticality |
|----------|------------------|--------|-------------|
| VPC Instance Profiles | Monthly | VPC API | High |
| Pricing | Weekly | Global Catalog / BSS | High |
| OS Images | Weekly | VPC Images API | Medium |
| Regions & Zones | Quarterly | Global Catalog | Medium |
| Feature Parity Matrix | Monthly | Manual + API | Medium |
| Classic-to-VPC Mappings | Quarterly | Derived | High |
| Storage Profiles | Quarterly | VPC API | Medium |
| Bare Metal Profiles | Quarterly | VPC API | Medium |

---

## 3. VPC Instance Profile Management

### 3.1 Profile Data Structure

```typescript
interface VPCInstanceProfile {
  name: string;                    // e.g., 'bx2-4x16'
  family: ProfileFamily;           // 'balanced', 'compute', 'memory', etc.
  architecture: 'amd64' | 's390x';
  vcpuCount: number;
  vcpuManufacturer: string;        // 'intel', 'amd'
  memoryGiB: number;
  bandwidthMbps: number;
  memoryToVcpuRatio: number;       // For workload matching
  supportedRegions: string[];
  maxNetworkInterfaces: number;
  maxVolumes: number;
  generation: 'gen2';
  status: 'current' | 'deprecated' | 'preview';
  fetchedAt: string;               // ISO timestamp
}

interface VPCProfileCatalog {
  version: string;                 // Semantic version
  generatedAt: string;             // ISO timestamp
  source: string;                  // API endpoint used
  profiles: VPCInstanceProfile[];
  families: ProfileFamily[];
  totalProfiles: number;
  regionsCovered: string[];
}
```

### 3.2 Fetching Profiles from VPC API

```typescript
import VpcV1 from '@ibm-cloud/vpc';

async function fetchVPCInstanceProfiles(apiKey: string): Promise<ProfileFetchResult> {
  const vpc = new VpcV1({
    authenticator: new IamAuthenticator({ apikey: apiKey }),
    serviceUrl: 'https://us-south.iaas.cloud.ibm.com/v1',
    version: '2024-01-01',
  });
  
  const response = await vpc.listInstanceProfiles();
  
  const profiles = response.result.profiles.map(profile => ({
    name: profile.name,
    family: parseProfileFamily(profile.name),
    vcpuCount: profile.vcpu_count?.value || 0,
    memoryGiB: profile.memory?.value || 0,
    bandwidthMbps: profile.bandwidth?.value || 0,
    // ... map other fields
  }));
  
  return { success: true, profiles, fetchedAt: new Date().toISOString() };
}

function parseProfileFamily(profileName: string): ProfileFamily {
  const prefix = profileName.split('-')[0];
  
  const families = {
    'bx2': { name: 'balanced', memoryRatio: '1:4', useCase: 'General-purpose' },
    'cx2': { name: 'compute', memoryRatio: '1:2', useCase: 'CPU-intensive' },
    'mx2': { name: 'memory', memoryRatio: '1:8', useCase: 'Memory-intensive' },
    'gx2': { name: 'gpu', memoryRatio: 'varies', useCase: 'AI/ML, graphics' },
    'ox2': { name: 'storage', memoryRatio: '1:4', useCase: 'High throughput storage' },
    'ux2': { name: 'ultra-high-memory', memoryRatio: '1:28', useCase: 'SAP HANA' },
  };
  
  return families[prefix] || { name: 'unknown', memoryRatio: 'unknown' };
}
```

### 3.3 Spreadsheet-Based Profile Import

In addition to the VPC API, profile data can be imported from IBM's Classic-to-VPC migration spreadsheets:

```bash
npm run import:mappings
```

This reads two XLSX files from the `mappings/` directory (not committed to git) and generates three JSON files in `src/services/migration/data/generated/` (committed to git):

| Generated File | Source Sheet(s) | Contents |
|----------------|-----------------|----------|
| `vpcProfileCatalog.json` | VPC VSI Price, VPC BM Price | 266 VSI + 42 BM profiles with hourly pricing |
| `bmMappings.json` | Aggregare Mapping V3 | 666 explicit Classic BM → VPC profile mappings |
| `storageMappings.json` | Block - Data, File - Data | Storage tier mappings, pricing, zone mappings |

The generated catalog is the primary source for `VPC_PROFILES` and `VPC_BARE_METAL_PROFILES` in `vpcProfiles.ts`. Hardcoded fallback arrays are used if the generated files are empty. Re-run the script when the spreadsheets are updated.

### 3.4 Profile Data Refresh Schedule

```typescript
import cron from 'node-cron';

// Run daily at 3 AM UTC
cron.schedule('0 3 * * *', async () => {
  console.log('Starting VPC profile refresh...');
  
  const fetchResult = await fetchVPCInstanceProfiles(API_KEY);
  if (!fetchResult.success) {
    await notifyError('Profile refresh failed', fetchResult.errors);
    return;
  }
  
  const previousCatalog = await getLatestProfileCatalog();
  const changes = detectChanges(previousCatalog, fetchResult.profiles);
  
  await storeProfileCatalog(fetchResult.profiles);
  
  if (changes.hasChanges) {
    await notifyChanges('VPC Profiles', changes);
  }
  
  console.log(`Profile refresh complete: ${changes.summary}`);
});
```

---

## 4. Pricing Data Management

### 4.1 Pricing Data Structure

```typescript
interface VPCPricing {
  version: string;
  generatedAt: string;
  currency: string;                // 'USD'
  
  compute: {
    instances: InstancePricing[];
    bareMetal: BareMetalPricing[];
  };
  
  storage: {
    blockStorage: StorageTierPricing[];
    fileStorage: StorageTierPricing[];
  };
  
  network: {
    floatingIPs: FloatingIPPricing;
    vpnGateway: VPNGatewayPricing;
    loadBalancers: LoadBalancerPricing;
  };
}

interface InstancePricing {
  profileName: string;
  region: string;
  hourlyRate: number;
  monthlyEstimate: number;         // hourlyRate * 730
  reservedPricing?: {
    oneYear: { hourlyRate: number; discount: number };
    threeYear: { hourlyRate: number; discount: number };
  };
  effectiveDate: string;
}
```

### 4.2 Fetching Pricing Data

```typescript
import { GlobalCatalogV1 } from '@ibm-cloud/platform-services';

async function fetchVPCPricing(apiKey: string): Promise<PricingFetchResult> {
  const catalogClient = new GlobalCatalogV1({
    authenticator: new IamAuthenticator({ apikey: apiKey }),
  });
  
  // Fetch VPC service pricing from Global Catalog
  const vpcPricing = await catalogClient.getPricing({ id: 'is.instance' });
  const storagePricing = await catalogClient.getPricing({ id: 'is.volume' });
  
  return {
    success: true,
    pricing: {
      compute: parseInstancePricing(vpcPricing),
      storage: parseStoragePricing(storagePricing),
      // ... other categories
    },
  };
}
```

### 4.3 Pricing Refresh Schedule

```typescript
// Run weekly on Sunday at 2 AM UTC
cron.schedule('0 2 * * 0', async () => {
  console.log('Starting pricing refresh...');
  
  const fetchResult = await fetchVPCPricing(API_KEY);
  const previousPricing = await getLatestPricing();
  const changes = detectPricingChanges(previousPricing, fetchResult.pricing);
  
  await storePricing(fetchResult.pricing);
  
  if (changes.significantChanges.length > 0) {
    await notifyPricingChanges(changes);
  }
});
```

### 4.4 Pricing Change Detection

```typescript
interface PricingChange {
  type: 'increase' | 'decrease' | 'new' | 'removed';
  resource: string;
  region: string;
  previousPrice?: number;
  newPrice?: number;
  changePercent?: number;
}

function detectPricingChanges(previous: VPCPricing, current: VPCPricing): PricingChangeReport {
  const changes: PricingChange[] = [];
  
  for (const curr of current.compute.instances) {
    const prev = previous.compute.instances.find(
      p => p.profileName === curr.profileName && p.region === curr.region
    );
    
    if (!prev) {
      changes.push({ type: 'new', resource: curr.profileName, region: curr.region, newPrice: curr.hourlyRate });
    } else if (prev.hourlyRate !== curr.hourlyRate) {
      const changePercent = ((curr.hourlyRate - prev.hourlyRate) / prev.hourlyRate) * 100;
      changes.push({
        type: changePercent > 0 ? 'increase' : 'decrease',
        resource: curr.profileName,
        region: curr.region,
        previousPrice: prev.hourlyRate,
        newPrice: curr.hourlyRate,
        changePercent,
      });
    }
  }
  
  const significantChanges = changes.filter(c => Math.abs(c.changePercent || 0) > 5);
  
  return { hasChanges: changes.length > 0, changes, significantChanges };
}
```

---

## 5. OS Image Catalogue Management

### 5.1 Image Data Structure

```typescript
interface VPCImage {
  id: string;
  name: string;
  displayName: string;
  operatingSystem: {
    name: string;                  // 'Red Hat Enterprise Linux'
    family: string;                // 'Red Hat'
    version: string;               // '8.8'
    architecture: string;          // 'amd64'
  };
  visibility: 'public' | 'private';
  status: 'available' | 'deprecated';
  classicEquivalent?: string[];    // Classic OS names that map to this
  regions: string[];
  fetchedAt: string;
}
```

### 5.2 Classic to VPC OS Mapping

```typescript
const OS_COMPATIBILITY_MAP = [
  {
    classicOS: 'RHEL 8.x',
    classicOSKeyName: 'REDHAT_8_64',
    vpcCompatible: true,
    vpcImagePattern: 'ibm-redhat-8-*',
    upgradeRequired: false,
    notes: 'Direct migration supported',
  },
  {
    classicOS: 'CentOS 8.x',
    classicOSKeyName: 'CENTOS_8_64',
    vpcCompatible: false,
    upgradeRequired: true,
    upgradeTarget: 'RHEL 8 or Rocky Linux 8',
    eolDate: '2021-12-31',
    notes: 'CentOS 8 is EOL - must upgrade before migration',
  },
  {
    classicOS: 'Windows Server 2012 R2',
    classicOSKeyName: 'WIN_2012-STD-R2_64',
    vpcCompatible: false,
    upgradeRequired: true,
    upgradeTarget: 'Windows Server 2019 or 2022',
    eolDate: '2023-10-10',
    notes: 'Windows 2012 R2 is EOL - must upgrade before migration',
  },
  // ... more mappings
];
```

---

## 6. Datacenter & Region Management

### 6.1 Region Data Structure

```typescript
interface IBMCloudRegion {
  id: string;                      // 'us-south'
  name: string;                    // 'Dallas'
  displayName: string;             // 'US South (Dallas)'
  geography: string;               // 'North America'
  zones: VPCZone[];
  classicDatacenters: string[];    // ['dal09', 'dal10', 'dal12', 'dal13']
  vpcEndpoint: string;
  status: 'active' | 'planned' | 'deprecated';
}

const IBM_CLOUD_REGIONS: IBMCloudRegion[] = [
  {
    id: 'us-south',
    name: 'Dallas',
    displayName: 'US South (Dallas)',
    geography: 'North America',
    zones: [
      { name: 'us-south-1', nearestClassicDC: 'dal10' },
      { name: 'us-south-2', nearestClassicDC: 'dal12' },
      { name: 'us-south-3', nearestClassicDC: 'dal13' },
    ],
    classicDatacenters: ['dal09', 'dal10', 'dal12', 'dal13'],
    vpcEndpoint: 'https://us-south.iaas.cloud.ibm.com',
    status: 'active',
  },
  // ... other regions
];

// Classic DCs without direct VPC equivalent
const CLASSIC_ONLY_DATACENTERS = [
  { dc: 'ams03', suggestedVPC: 'eu-de', notes: 'Migrate to Frankfurt' },
  { dc: 'che01', suggestedVPC: 'in-che', notes: 'VPC coming soon' },
  { dc: 'mex01', suggestedVPC: 'us-south', notes: 'Migrate to Dallas' },
  { dc: 'sng01', suggestedVPC: 'jp-tok', notes: 'Migrate to Tokyo' },
];
```

---

## 7. Automated Data Refresh Pipeline

### 7.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Data Refresh Pipeline                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Scheduler (cron)                                                          │
│   ├── Profiles:  Daily at 3:00 AM UTC                                      │
│   ├── Pricing:   Weekly on Sunday at 2:00 AM UTC                           │
│   ├── Images:    Daily at 4:00 AM UTC                                      │
│   └── Regions:   Monthly on 1st at 5:00 AM UTC                             │
│                                                                             │
│   Pipeline Steps:                                                           │
│   1. Fetch from IBM Cloud APIs                                             │
│   2. Validate schema and data completeness                                 │
│   3. Transform and enrich data                                             │
│   4. Compare with previous version                                         │
│   5. Store in COS (primary) and Git (backup)                              │
│   6. Update in-memory cache                                                │
│   7. Notify on significant changes                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Pipeline Implementation

```typescript
class RefreshPipeline {
  private config: PipelineConfig;
  
  constructor(config: PipelineConfig) {
    this.config = config;
  }
  
  start() {
    // Profile refresh - daily at 3 AM
    cron.schedule('0 3 * * *', () => this.refreshProfiles());
    
    // Pricing refresh - weekly on Sunday at 2 AM
    cron.schedule('0 2 * * 0', () => this.refreshPricing());
    
    // Image refresh - daily at 4 AM
    cron.schedule('0 4 * * *', () => this.refreshImages());
    
    // Run initial refresh on startup if data is stale
    this.runInitialRefreshIfNeeded();
  }
  
  async refreshProfiles(): Promise<RefreshResult> {
    console.log('Starting profile refresh...');
    
    // Fetch from API
    const fetchResult = await fetchVPCInstanceProfiles(this.config.apiKey);
    if (!fetchResult.success) {
      await this.notifyError('profiles', fetchResult.errors);
      return { success: false, error: fetchResult.errors.join(', ') };
    }
    
    // Validate
    const validation = validateProfiles(fetchResult.profiles);
    if (!validation.valid) {
      await this.notifyError('profiles', validation.errors);
      return { success: false, error: 'Validation failed' };
    }
    
    // Compare with previous
    const previous = await this.storage.getProfiles();
    const changes = detectChanges(previous, fetchResult.profiles);
    
    // Store
    await this.storage.storeProfiles(fetchResult.profiles);
    
    // Notify
    if (changes.hasChanges) {
      await this.notifyChanges('profiles', changes);
    }
    
    return { success: true, changes };
  }
}
```

### 7.3 Pipeline Configuration

```typescript
const PIPELINE_CONFIG = {
  profiles: {
    schedule: '0 3 * * *',        // Daily at 3:00 AM UTC
    enabled: true,
  },
  pricing: {
    schedule: '0 2 * * 0',        // Weekly on Sunday at 2:00 AM UTC
    enabled: true,
  },
  images: {
    schedule: '0 4 * * *',        // Daily at 4:00 AM UTC
    enabled: true,
  },
  regions: {
    schedule: '0 5 1 * *',        // Monthly on 1st at 5:00 AM UTC
    enabled: true,
  },
  
  storage: {
    cosBucket: process.env.REFERENCE_DATA_BUCKET,
    cosEndpoint: process.env.COS_ENDPOINT,
  },
  
  notifications: {
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    emailRecipients: process.env.ALERT_EMAILS?.split(','),
  },
};
```

---

## 8. Caching Strategy

### 8.1 Multi-Layer Cache

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Caching Architecture                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   L1: In-Memory Cache (Node.js process)                                    │
│   • Fastest access (~1ms)                                                  │
│   • TTL: 5 minutes                                                         │
│   • Cleared on restart                                                     │
│                                                                             │
│   L2: Redis Cache (Shared) - Optional                                      │
│   • Fast access (~5ms)                                                     │
│   • TTL: 1 hour                                                            │
│   • Shared across instances                                                │
│                                                                             │
│   L3: Cloud Object Storage (Persistent)                                    │
│   • Slower access (~50-100ms)                                              │
│   • No TTL (versioned)                                                     │
│   • Authoritative source                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Cache Implementation

```typescript
import NodeCache from 'node-cache';

class ReferenceDataCache {
  private cache: NodeCache;
  private storage: COSStorage;
  
  constructor(storage: COSStorage) {
    this.cache = new NodeCache({ stdTTL: 300, maxKeys: 100 });
    this.storage = storage;
  }
  
  async getProfiles(): Promise<VPCProfileCatalog> {
    // Check L1 cache
    const cached = this.cache.get<VPCProfileCatalog>('profiles');
    if (cached) return cached;
    
    // Fetch from COS
    const profiles = await this.storage.getProfiles();
    
    // Store in L1
    this.cache.set('profiles', profiles);
    
    return profiles;
  }
  
  invalidate(key: string): void {
    this.cache.del(key);
  }
}
```

---

## 9. Fallback & Resilience

### 9.1 Fallback Strategy

```typescript
async function getProfilesWithFallback(): Promise<VPCProfileCatalog> {
  // Try primary source (COS)
  try {
    const profiles = await fetchFromCOS('profiles/current.json');
    if (isValid(profiles)) return profiles;
  } catch (error) {
    console.warn('Primary source failed:', error.message);
  }
  
  // Try backup source (Git repo or bundled)
  try {
    const profiles = await fetchFromGit('data/profiles.json');
    if (isValid(profiles)) {
      console.warn('Using backup data from Git');
      return profiles;
    }
  } catch (error) {
    console.warn('Backup source failed:', error.message);
  }
  
  // Use bundled fallback data (always available)
  console.warn('Using bundled fallback data');
  return BUNDLED_PROFILES;
}
```

### 9.2 Data Freshness Indicator

```typescript
interface DataFreshness {
  dataType: string;
  lastUpdated: Date;
  age: string;              // Human-readable: "2 hours ago"
  status: 'fresh' | 'stale' | 'warning';
  source: 'live' | 'cached' | 'fallback';
}

function assessFreshness(catalog: VPCProfileCatalog): DataFreshness {
  const lastUpdated = new Date(catalog.generatedAt);
  const ageMs = Date.now() - lastUpdated.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  
  let status: DataFreshness['status'];
  if (ageHours < 24) status = 'fresh';
  else if (ageHours < 72) status = 'warning';
  else status = 'stale';
  
  return {
    dataType: 'profiles',
    lastUpdated,
    age: formatAge(ageMs),
    status,
    source: 'cached',
  };
}
```

### 9.3 UI Data Freshness Display

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Reference Data Status                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VPC Profiles    ● Fresh     Updated 2 hours ago                     │   │
│  │ Pricing         ● Fresh     Updated 3 days ago                      │   │
│  │ OS Images       ◐ Warning   Updated 4 days ago                      │   │
│  │ Regions         ● Fresh     Updated 15 days ago                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ⚠️ Some data may be outdated. Cost estimates may not reflect latest        │
│     pricing. [Refresh Now]                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Versioning & Change Detection

### 10.1 Semantic Versioning for Data

```typescript
// Data versions follow semantic versioning:
// MAJOR.MINOR.PATCH
//
// MAJOR: Breaking schema changes
// MINOR: New data added (new profiles, etc.)
// PATCH: Data corrections/updates

function incrementVersion(current: string, changeType: 'major' | 'minor' | 'patch'): string {
  const [major, minor, patch] = current.split('.').map(Number);
  
  switch (changeType) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
  }
}
```

### 10.2 Change Detection

```typescript
interface ProfileChanges {
  hasChanges: boolean;
  added: string[];
  removed: string[];
  modified: string[];
  summary: string;
}

function detectProfileChanges(previous: VPCProfileCatalog, current: VPCProfileCatalog): ProfileChanges {
  const prevNames = new Set(previous?.profiles.map(p => p.name) || []);
  const currNames = new Set(current.profiles.map(p => p.name));
  
  const added = current.profiles.filter(p => !prevNames.has(p.name)).map(p => p.name);
  const removed = (previous?.profiles || []).filter(p => !currNames.has(p.name)).map(p => p.name);
  const modified = current.profiles
    .filter(curr => {
      const prev = previous?.profiles.find(p => p.name === curr.name);
      return prev && hasChanged(prev, curr);
    })
    .map(p => p.name);
  
  return {
    hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0,
    added,
    removed,
    modified,
    summary: `+${added.length} added, -${removed.length} removed, ~${modified.length} modified`,
  };
}
```

### 10.3 Change Notifications

```typescript
async function notifyChanges(dataType: string, changes: ProfileChanges): Promise<void> {
  const message = {
    text: `📊 *Reference Data Update: ${dataType}*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${dataType}* reference data has been updated:\n` +
                `• Added: ${changes.added.length} items\n` +
                `• Removed: ${changes.removed.length} items\n` +
                `• Modified: ${changes.modified.length} items`,
        },
      },
    ],
  };
  
  if (changes.added.length > 0) {
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*New:* ${changes.added.slice(0, 5).join(', ')}${changes.added.length > 5 ? '...' : ''}`,
      },
    });
  }
  
  await sendSlackNotification(SLACK_WEBHOOK, message);
}
```

---

## 11. Code Maintainability

### 11.1 Project Structure

```
infrastructure-explorer/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       └── types/
│   │           ├── vpc-profiles.ts
│   │           ├── pricing.ts
│   │           ├── os-images.ts
│   │           └── regions.ts
│   │
│   └── backend/
│       └── src/
│           ├── services/
│           │   └── reference-data/
│           │       ├── index.ts           # Main service
│           │       ├── cache.ts           # Caching layer
│           │       ├── fetchers/          # API fetchers
│           │       │   ├── profiles.ts
│           │       │   ├── pricing.ts
│           │       │   └── images.ts
│           │       ├── storage/           # Storage adapters
│           │       │   └── cos.ts
│           │       ├── validators/        # Data validation
│           │       │   └── schema.ts
│           │       └── pipeline/          # Refresh pipeline
│           │           └── scheduler.ts
│           │
│           └── data/
│               ├── fallback/              # Bundled fallback data
│               │   ├── profiles.json
│               │   └── pricing.json
│               └── static/                # Rarely changing data
│                   ├── regions.ts
│                   └── os-compatibility.ts
```

### 11.2 Dependency Injection

```typescript
interface ReferenceDataService {
  getProfiles(): Promise<VPCProfileCatalog>;
  getPricing(): Promise<VPCPricing>;
  getImages(): Promise<OSImageCatalog>;
  getRegions(): Promise<RegionCatalog>;
  refresh(dataType: string): Promise<RefreshResult>;
  getFreshness(): Promise<Record<string, DataFreshness>>;
}

// Allows easy mocking in tests
export function createReferenceDataService(config: ReferenceDataConfig): ReferenceDataService {
  const cache = new ReferenceDataCache();
  const storage = new COSStorage(config.cos);
  const pipeline = new RefreshPipeline(config.pipeline);
  
  return {
    getProfiles: () => cache.getProfiles(),
    getPricing: () => cache.getPricing(),
    getImages: () => cache.getImages(),
    getRegions: () => cache.getRegions(),
    refresh: (type) => pipeline.refresh(type),
    getFreshness: () => cache.getFreshness(),
  };
}
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

```typescript
describe('Profile Mapping', () => {
  it('should map 4 vCPU / 16GB to bx2-4x16', () => {
    const classic = { cpu: 4, memory: 16384 };
    const result = mapToVPCProfile(classic);
    expect(result.primary.name).toBe('bx2-4x16');
  });
  
  it('should recommend memory family for high memory ratio', () => {
    const classic = { cpu: 4, memory: 32768 };
    const result = mapToVPCProfile(classic);
    expect(result.recommendedFamily).toBe('memory');
  });
  
  it('should handle edge case of 1 vCPU', () => {
    const classic = { cpu: 1, memory: 1024 };
    const result = mapToVPCProfile(classic);
    expect(result.primary.vcpuCount).toBeGreaterThanOrEqual(2);
    expect(result.notes).toContain('VPC minimum');
  });
});

describe('Change Detection', () => {
  it('should detect added profiles', () => {
    const previous = { profiles: [{ name: 'bx2-2x8' }] };
    const current = { profiles: [{ name: 'bx2-2x8' }, { name: 'bx2-4x16' }] };
    
    const changes = detectProfileChanges(previous, current);
    expect(changes.added).toContain('bx2-4x16');
  });
});
```

### 12.2 Integration Tests

```typescript
describe('Refresh Pipeline', () => {
  it('should fetch profiles from VPC API', async () => {
    const result = await fetchVPCInstanceProfiles(TEST_API_KEY);
    expect(result.success).toBe(true);
    expect(result.profiles.length).toBeGreaterThan(10);
  });
  
  it('should validate fetched profiles', async () => {
    const result = await fetchVPCInstanceProfiles(TEST_API_KEY);
    const validation = validateProfiles(result.profiles);
    expect(validation.valid).toBe(true);
  });
});
```

### 12.3 Mock Data for Development

```typescript
// tests/fixtures/mock-profiles.ts
export const MOCK_PROFILES: VPCInstanceProfile[] = [
  {
    name: 'bx2-2x8',
    family: { name: 'balanced', prefix: 'bx2' },
    vcpuCount: 2,
    memoryGiB: 8,
    bandwidthMbps: 4000,
    // ...
  },
  // ... more mock profiles
];
```

---

## 13. Monitoring & Alerting

### 13.1 Metrics to Track

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Profile data age | > 48 hours | Warning |
| Pricing data age | > 14 days | Warning |
| Refresh failures | 3 consecutive | Critical |
| Profile count drop | > 20% | Critical |
| API errors | > 5/hour | Warning |
| Cache hit rate | < 80% | Warning |

### 13.2 Health Check Endpoint

```typescript
app.get('/health/reference-data', async (req, res) => {
  const freshness = await referenceDataService.getFreshness();
  
  const issues = Object.entries(freshness)
    .filter(([_, f]) => f.status !== 'fresh')
    .map(([type, f]) => `${type}: ${f.status} (${f.age} old)`);
  
  const status = issues.length === 0 ? 'healthy' : 'degraded';
  
  res.json({
    status,
    freshness,
    issues,
    lastRefresh: {
      profiles: freshness.profiles?.lastUpdated,
      pricing: freshness.pricing?.lastUpdated,
      images: freshness.images?.lastUpdated,
    },
  });
});
```

### 13.3 Alerting Integration

```typescript
async function checkDataHealth(): Promise<void> {
  const freshness = await referenceDataService.getFreshness();
  
  for (const [dataType, status] of Object.entries(freshness)) {
    if (status.status === 'stale') {
      await sendAlert({
        severity: 'warning',
        title: `Stale reference data: ${dataType}`,
        message: `${dataType} data is ${status.age} old. Last updated: ${status.lastUpdated}`,
        actions: ['Check refresh pipeline logs', 'Verify API connectivity', 'Manual refresh'],
      });
    }
  }
}

// Run health check every hour
cron.schedule('0 * * * *', checkDataHealth);
```

---

## 14. Operational Runbooks

### 14.1 Manual Refresh

```bash
# Force refresh all reference data
curl -X POST https://api.infrastructure-explorer.example.com/admin/refresh-all \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Refresh specific data type
curl -X POST https://api.infrastructure-explorer.example.com/admin/refresh/profiles \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check refresh status
curl https://api.infrastructure-explorer.example.com/health/reference-data \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 14.2 Troubleshooting Stale Data

| Issue | Check | Resolution |
|-------|-------|------------|
| Refresh not running | Check cron job logs | Restart scheduler |
| API fetch failing | Check API key validity | Rotate API key |
| COS storage failing | Check COS connectivity | Verify credentials |
| Data validation failing | Check API response | Update validation rules |

### 14.3 Adding New Profile Family

1. Update `parseProfileFamily()` function with new prefix
2. Add mapping rules for Classic-to-VPC
3. Update validation to expect new family
4. Add tests for new profiles
5. Deploy and verify
6. Monitor for issues

### 14.4 Emergency Fallback

If all automated sources fail:

```bash
# 1. Download latest data manually from IBM Cloud
ibmcloud is instance-profiles --output json > profiles.json

# 2. Upload to COS
ibmcloud cos put-object \
  --bucket infrastructure-explorer-reference-data \
  --key profiles/current.json \
  --body profiles.json

# 3. Invalidate cache
curl -X POST https://api.infrastructure-explorer.example.com/admin/cache/invalidate \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Summary

This maintainability strategy ensures:

| Aspect | Approach |
|--------|----------|
| **Fresh Data** | Automated pipelines keep profiles, pricing, and images current |
| **Resilience** | Multi-layer caching and fallbacks prevent failures |
| **Transparency** | Users see data freshness indicators |
| **Auditability** | Version history and changelogs track all changes |
| **Testability** | Comprehensive tests validate data integrity |
| **Operability** | Monitoring, alerts, and runbooks for operations |

**Key Refresh Schedules:**

| Data Type | Frequency | Time (UTC) |
|-----------|-----------|------------|
| VPC Instance Profiles | Daily | 3:00 AM |
| Pricing | Weekly | Sunday 2:00 AM |
| OS Images | Daily | 4:00 AM |
| Regions | Monthly | 1st at 5:00 AM |

---

**Document End**