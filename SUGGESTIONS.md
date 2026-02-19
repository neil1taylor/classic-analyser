# IBM Cloud Infrastructure Explorer
# Project Suggestions & Recommendations

---

| | |
|---|---|
| **Document Type** | Technical Recommendations |
| **Date** | January 28, 2025 |
| **Related Document** | IBM Cloud Infrastructure Explorer PRD v1.0 |
| **Purpose** | Guidance for development team on implementation considerations |

---

## Table of Contents

1. [Development Approach](#1-development-approach)
2. [API Challenges & Mitigations](#2-api-challenges--mitigations)
3. [User Experience Enhancements](#3-user-experience-enhancements)
4. [Technical Considerations](#4-technical-considerations)
5. [Testing Strategy](#5-testing-strategy)
6. [Future-Proofing for Phase 2](#6-future-proofing-for-phase-2)
7. [Deployment & Operations](#7-deployment--operations)
8. [Documentation Requirements](#8-documentation-requirements)
9. [Known Gotchas & Edge Cases](#9-known-gotchas--edge-cases)
10. [Competitive Differentiation Features](#10-competitive-differentiation-features)

---

## 1. Development Approach

### 1.1 Vertical Slice Implementation

Rather than building all resource types simultaneously, implement one complete end-to-end flow first. This approach validates the architecture before expanding scope.

**Recommended First Slice: Virtual Servers**

```
Phase 1A: Single Resource Type (Week 1-2)
├── API Key Entry & Validation
├── Virtual Server Collection (with pagination)
├── Data Table Display (with all table features)
├── XLSX Export (single worksheet)
└── Error Handling & Edge Cases

Phase 1B: Expand Resource Types (Week 3-4)
├── Bare Metal Servers
├── VLANs & Subnets
├── Storage (Block & File)
└── Summary Dashboard

Phase 1C: Complete Coverage (Week 5-6)
├── Remaining resource types
├── Relationship mapping
├── Multi-worksheet export
└── Polish & Performance
```

**Benefits of Vertical Slice Approach:**
- Proves architecture works end-to-end early
- Enables user feedback on core functionality quickly
- Identifies integration issues before full build-out
- Allows parallel workstreams once pattern is established

### 1.2 Monorepo Structure

Using a monorepo simplifies development when frontend and backend share TypeScript types.

**Recommended Structure:**

```
infrastructure-explorer/
├── packages/
│   ├── shared/                    # Shared code
│   │   ├── src/
│   │   │   ├── types/            # TypeScript interfaces for all resources
│   │   │   │   ├── virtual-server.ts
│   │   │   │   ├── bare-metal.ts
│   │   │   │   ├── vlan.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/        # API endpoints, field mappings
│   │   │   └── utils/            # Shared utilities
│   │   └── package.json
│   │
│   ├── frontend/                  # React application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── backend/                   # Express server
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   └── middleware/
│       └── package.json
│
├── package.json                   # Root workspace config
├── turbo.json                     # Turborepo config
└── Dockerfile
```

**Recommended Tooling:**
- **Turborepo** or **Nx** for monorepo management
- **pnpm** for efficient package management
- **TypeScript Project References** for type sharing

**Shared Types Example:**

```typescript
// packages/shared/src/types/virtual-server.ts
export interface VirtualServer {
  id: number;
  hostname: string;
  domain: string;
  fullyQualifiedDomainName: string;
  primaryIpAddress: string | null;
  primaryBackendIpAddress: string;
  maxCpu: number;
  maxMemory: number;
  status: VirtualServerStatus;
  powerState: PowerState;
  datacenter: Datacenter;
  operatingSystem: OperatingSystem | null;
  hourlyBillingFlag: boolean;
  createDate: string;
  billingItem: BillingItem | null;
  networkVlans: NetworkVlan[];
  tagReferences: TagReference[];
  notes: string | null;
}

export interface VirtualServerStatus {
  keyName: string;
  name: string;
}

export type PowerState = 'RUNNING' | 'HALTED' | 'PAUSED';
```

Both frontend and backend import from `@infrastructure-explorer/shared`, ensuring type consistency.

### 1.3 Feature Flags

Implement feature flags from the start to enable:
- Gradual rollout of new resource types
- A/B testing of UI variations
- Quick disable of problematic features without deployment

**Simple Implementation:**

```typescript
// packages/shared/src/constants/features.ts
export const FEATURES = {
  ENABLE_EVENT_LOG: false,        // High volume, enable later
  ENABLE_BILLING_DETAILS: true,
  ENABLE_RELATIONSHIP_VIEW: false, // Phase 1.5
  ENABLE_COST_SUMMARY: false,      // Phase 1.5
  MAX_CONCURRENT_API_CALLS: 10,
  COLLECTION_TIMEOUT_MS: 300000,   // 5 minutes
};
```

---

## 2. API Challenges & Mitigations

### 2.1 Pagination Handling

The SoftLayer API returns a maximum of 100 results per request by default. Accounts with large inventories require pagination.

**Challenge:**
- An account with 500 VSIs requires 5 sequential API calls
- Sequential calls significantly slow down collection
- Progress reporting becomes complex

**Recommended Solution: Parallel Pagination**

```typescript
// services/softlayer/paginator.ts
interface PaginationConfig {
  endpoint: string;
  objectMask: string;
  apiKey: string;
  pageSize?: number;
  maxConcurrent?: number;
}

async function paginatedFetch<T>(config: PaginationConfig): Promise<T[]> {
  const { endpoint, objectMask, apiKey, pageSize = 100, maxConcurrent = 5 } = config;
  
  // First, get total count
  const countResponse = await fetchCount(endpoint, apiKey);
  const totalCount = countResponse.count;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Generate page requests
  const pageRequests = Array.from({ length: totalPages }, (_, i) => ({
    offset: i * pageSize,
    limit: pageSize,
  }));
  
  // Fetch pages in parallel batches
  const results: T[] = [];
  for (let i = 0; i < pageRequests.length; i += maxConcurrent) {
    const batch = pageRequests.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(({ offset, limit }) =>
        fetchPage<T>(endpoint, objectMask, apiKey, offset, limit)
      )
    );
    results.push(...batchResults.flat());
    
    // Emit progress
    const progress = Math.min(100, Math.round(((i + batch.length) / totalPages) * 100));
    emitProgress({ resource: endpoint, progress, fetched: results.length, total: totalCount });
  }
  
  return results;
}
```

**Progress Reporting:**

```
Collecting Virtual Servers... 45/500 (Page 1 of 5)
Collecting Virtual Servers... 145/500 (Page 2 of 5)
Collecting Virtual Servers... 290/500 (Page 3 of 5)
...
```

### 2.2 Rate Limiting

The SoftLayer API enforces rate limits that vary by endpoint and account.

**Observed Limits:**
- Approximately 10-20 concurrent requests before throttling
- 503 Service Unavailable responses when exceeded
- Some endpoints (Event Log) are more restrictive

**Recommended Solution: Request Queue with Backoff**

```typescript
// services/softlayer/request-queue.ts
import PQueue from 'p-queue';

class SoftLayerRequestQueue {
  private queue: PQueue;
  private retryDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff
  
  constructor(concurrency: number = 10) {
    this.queue = new PQueue({ 
      concurrency,
      interval: 100,      // Minimum 100ms between requests
      intervalCap: 10,    // Max 10 requests per interval
    });
  }
  
  async request<T>(fn: () => Promise<T>, retries: number = 3): Promise<T> {
    return this.queue.add(async () => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          if (error.status === 503 && attempt < retries) {
            const delay = this.retryDelays[attempt] || 16000;
            console.log(`Rate limited, retrying in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
          throw error;
        }
      }
      throw new Error('Max retries exceeded');
    });
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const queue = new SoftLayerRequestQueue(10);
const vsis = await queue.request(() => fetchVirtualServers(apiKey));
```

**User Feedback During Rate Limiting:**

```
⚠️ API rate limit reached. Retrying in 4 seconds...
   This is normal for large accounts.
```

### 2.3 Object Mask Optimisation

Complex object masks with deep nesting can cause API timeouts.

**Problematic Pattern:**

```
mask[id,hostname,billingItem[orderItem[order[userRecord[customer]]]]]
```

**Recommended Approach: Split Deep Queries**

```typescript
// Instead of one deep query, use two shallow queries
async function getVirtualServersWithBilling(apiKey: string): Promise<VirtualServerWithBilling[]> {
  // Query 1: Core VSI data (fast)
  const vsis = await fetchVirtualServers(apiKey, 'mask[id,hostname,primaryIpAddress,...]');
  
  // Query 2: Billing data separately (can be slower)
  const billingItems = await fetchBillingItems(apiKey, 'mask[id,resourceTableId,recurringFee,...]');
  
  // Join in memory
  const billingByResourceId = new Map(billingItems.map(b => [b.resourceTableId, b]));
  
  return vsis.map(vsi => ({
    ...vsi,
    billingItem: billingByResourceId.get(vsi.id) || null,
  }));
}
```

**Benefits:**
- Faster individual queries
- Better error isolation (billing failure doesn't block core data)
- Enables "quick mode" that skips billing entirely

### 2.4 API Response Inconsistencies

The SoftLayer API has known inconsistencies to handle.

**Issue 1: Null vs Missing Fields**

```typescript
// Sometimes the API returns null, sometimes it omits the field entirely
interface ApiResponse {
  primaryIpAddress: string | null;  // Could be null
  notes?: string;                    // Could be missing entirely
}

// Defensive access pattern
const ip = vsi.primaryIpAddress ?? 'N/A';
const notes = vsi.notes ?? '';
```

**Issue 2: Date Format Variations**

```typescript
// SoftLayer returns dates in various formats
const dateFormats = [
  '2025-01-28T14:30:00-06:00',  // ISO with timezone
  '2025-01-28T14:30:00Z',       // ISO UTC
  '01/28/2025 14:30:00',        // US format
];

// Normalise all dates
import { parseISO, parse, isValid } from 'date-fns';

function normaliseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  // Try ISO format first
  let date = parseISO(dateStr);
  if (isValid(date)) return date;
  
  // Try US format
  date = parse(dateStr, 'MM/dd/yyyy HH:mm:ss', new Date());
  if (isValid(date)) return date;
  
  return null;
}
```

**Issue 3: Inconsistent Nested Objects**

```typescript
// Sometimes nested objects are populated, sometimes just IDs
interface VirtualServer {
  datacenter: Datacenter | { id: number };  // Could be either
}

// Handle both cases
const datacenterName = typeof vsi.datacenter === 'object' && 'name' in vsi.datacenter
  ? vsi.datacenter.name
  : `DC-${vsi.datacenter.id}`;
```

---

## 3. User Experience Enhancements

### 3.1 Collection Modes

Offer users a choice between speed and completeness.

**Quick Scan Mode:**
- Core fields only (hostname, IP, CPU, RAM, status)
- Skips billing data, deep relationships
- Completes in ~1 minute for most accounts
- Ideal for quick discovery during client meetings

**Full Scan Mode:**
- All available fields
- Includes billing, relationships, event history
- May take 5+ minutes for large accounts
- Ideal for detailed inventory and migration planning

**UI Implementation:**

```
┌─────────────────────────────────────────────────────────┐
│  Collection Mode                                        │
│                                                         │
│  ○ Quick Scan (~1 min)                                 │
│    Core resource details only                          │
│                                                         │
│  ● Full Scan (~5 min)                                  │
│    All details including billing and relationships     │
│                                                         │
│  [ Start Collection ]                                   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Incremental Table Loading

Don't wait for all data before showing results. Display each resource type as it completes.

**Loading Sequence:**

```
1. API Key Validated ✓
2. Account Info Loaded ✓
3. Collecting resources...

   ┌─────────────────────────────────────────┐
   │ Virtual Servers    ✓ 45 collected      │ ← Clickable, shows data
   │ Bare Metal         ✓ 8 collected       │ ← Clickable, shows data
   │ VLANs              ⟳ Collecting...     │ ← Disabled, shows spinner
   │ Subnets            ○ Pending           │ ← Disabled, greyed out
   │ Block Storage      ○ Pending           │
   │ File Storage       ○ Pending           │
   └─────────────────────────────────────────┘
```

**Benefits:**
- Users can start exploring immediately
- Perceived performance is much better
- Partial data is useful even if some resources fail

### 3.3 Global Search

Implement cross-resource search to find resources regardless of type.

**Search Scope:**
- All hostnames (VSI, Bare Metal)
- All IP addresses (public and private)
- All resource names (storage volumes, VLANs, etc.)
- All notes and tags
- Domain names

**UI:**

```
┌─────────────────────────────────────────────────────────┐
│  🔍 Search all resources...          [web-prod]        │
└─────────────────────────────────────────────────────────┘

Search Results for "web-prod" (7 matches):

┌─────────────────────────────────────────────────────────┐
│ Virtual Servers (3)                                     │
│   • web-prod-1 (10.1.1.5) - dal13                      │
│   • web-prod-2 (10.1.1.6) - dal13                      │
│   • web-prod-3 (10.1.1.7) - dal13                      │
├─────────────────────────────────────────────────────────┤
│ Block Storage (2)                                       │
│   • web-prod-data-vol1 (500GB) - dal13                 │
│   • web-prod-backup-vol1 (1TB) - dal13                 │
├─────────────────────────────────────────────────────────┤
│ DNS Records (2)                                         │
│   • web-prod.example.com → 169.xx.xx.xx                │
│   • web-prod-internal.example.com → 10.1.1.5           │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Relationship Visualisation

A visual diagram showing resource relationships is invaluable for migration planning.

**Simple Network View:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Network Topology: dal13                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │ Gateway: gw-01  │                                           │
│  │ 169.xx.xx.1     │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│     ┌─────┴─────┐                                              │
│     │           │                                              │
│  ┌──┴──┐     ┌──┴──┐                                          │
│  │VLAN │     │VLAN │                                          │
│  │1234 │     │1235 │                                          │
│  │Pub  │     │Priv │                                          │
│  └──┬──┘     └──┬──┘                                          │
│     │           │                                              │
│  ┌──┴───────────┴──┐                                          │
│  │   web-prod-1    │──── Block: vol-001 (500GB)               │
│  │   10.1.1.5      │──── Block: vol-002 (100GB)               │
│  └─────────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation Options:**
- **Simple:** Use Mermaid.js for declarative diagrams
- **Interactive:** Use D3.js or React Flow for draggable nodes
- **Recommendation:** Start with Mermaid, upgrade to React Flow if users need interaction

### 3.5 Column Presets

Pre-configured column sets for common use cases.

**Built-in Presets:**

| Preset | Columns Shown |
|--------|---------------|
| Essential | Hostname, IP, CPU, RAM, OS, DC |
| Networking | Hostname, Public IP, Private IP, VLANs, Subnet |
| Billing | Hostname, Monthly Cost, Billing Type, Create Date |
| Migration | Hostname, OS, CPU, RAM, Storage, Dependencies |
| All Fields | Every available column |

**UI:**

```
┌──────────────────────────────────────────────────────────┐
│ Columns: [ Essential ▼ ]  [ Customise... ]               │
├──────────────────────────────────────────────────────────┤
│   ☑ Hostname       ☑ CPU        ☐ Create Date           │
│   ☑ IP Address     ☑ RAM        ☐ Billing Item          │
│   ☑ Status         ☑ OS         ☐ Tags                  │
│   ☑ Datacenter     ☐ VLAN       ☐ Notes                 │
└──────────────────────────────────────────────────────────┘
```

### 3.6 Keyboard Shortcuts

Power users appreciate keyboard navigation.

| Shortcut | Action |
|----------|--------|
| `/` | Focus global search |
| `Ctrl+E` | Export current view |
| `Ctrl+R` | Refresh data |
| `Ctrl+1-9` | Switch to tab 1-9 |
| `Esc` | Close modal/dialog |
| `↑↓` | Navigate table rows |
| `Enter` | View row details |
| `Space` | Select/deselect row |

---

## 4. Technical Considerations

### 4.1 Server-Sent Events vs Alternatives

The PRD specifies SSE for progress updates. Consider the trade-offs.

**Server-Sent Events (SSE):**

| Pros | Cons |
|------|------|
| Simple to implement | One-way communication only |
| Built into browsers | Some proxies/load balancers buffer SSE |
| Auto-reconnection | Limited to ~6 connections per domain |
| Lightweight | Can be tricky with some CDNs |

**Alternative: Polling**

```typescript
// Client polls status endpoint
const pollStatus = async (jobId: string) => {
  while (true) {
    const response = await fetch(`/api/collect/status/${jobId}`);
    const status = await response.json();
    
    updateProgress(status);
    
    if (status.complete || status.error) break;
    
    await sleep(1000); // Poll every second
  }
};
```

| Pros | Cons |
|------|------|
| Works through any proxy | More HTTP overhead |
| Simple debugging | Slight delay in updates |
| No connection limits | More server load |

**Recommendation:** Start with SSE, but design the backend to support both. If SSE causes issues in production, switch to polling without major refactoring.

### 4.2 XLSX Generation Location

**Option A: Server-Side Generation (Current PRD)**

```typescript
// Backend generates XLSX and streams to client
app.post('/api/export', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  // ... populate worksheets
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  await workbook.xlsx.write(res);
});
```

| Pros | Cons |
|------|------|
| Works on any device | Server memory usage |
| Consistent output | Network transfer of full dataset |
| Can handle very large files | Longer request time |

**Option B: Client-Side Generation**

```typescript
// Frontend generates XLSX in browser
import * as XLSX from 'xlsx';

const exportToExcel = (data: CollectedData) => {
  const workbook = XLSX.utils.book_new();
  
  // Add worksheets
  XLSX.utils.book_append_sheet(workbook, 
    XLSX.utils.json_to_sheet(data.virtualServers), 
    'vVirtualServers'
  );
  // ... more worksheets
  
  XLSX.writeFile(workbook, filename);
};
```

| Pros | Cons |
|------|------|
| No server load | Browser memory limits |
| Faster for small datasets | Slower on mobile devices |
| Works offline (after collection) | Inconsistent across browsers |

**Recommendation:** Implement both. Default to client-side for datasets under 10,000 total rows, server-side for larger exports. Let users choose in settings.

### 4.3 Additional Export Formats

**CSV Export:**
- Trivial to implement
- Useful for scripting and data pipelines
- One file per resource type (ZIP archive)

**JSON Export:**
- Full fidelity data preservation
- Ideal for Phase 2 AI analysis input
- Includes metadata and relationships

**PDF Report:**
- Executive summary format
- Charts and graphs
- Useful for management presentations
- Consider for Phase 2

### 4.4 Caching Strategy

Even without persistent storage, strategic caching improves performance.

**In-Memory Cache (Per Request):**

```typescript
// Cache resolved relationships during a single collection
class CollectionCache {
  private vlanMap = new Map<number, Vlan>();
  private subnetMap = new Map<number, Subnet>();
  
  setVlans(vlans: Vlan[]) {
    vlans.forEach(v => this.vlanMap.set(v.id, v));
  }
  
  getVlan(id: number): Vlan | undefined {
    return this.vlanMap.get(id);
  }
  
  // Resolve VLAN reference to full object
  resolveVlanRef(ref: { id: number }): Vlan | { id: number } {
    return this.vlanMap.get(ref.id) || ref;
  }
}
```

**Browser Cache (Session):**

```typescript
// Store collected data in React Context
// Survives navigation but not page refresh
const DataContext = createContext<{
  collectedData: CollectedData | null;
  lastCollectionTime: Date | null;
  isStale: boolean;
}>({
  collectedData: null,
  lastCollectionTime: null,
  isStale: false,
});
```

### 4.5 Error Boundary Strategy

Graceful degradation when individual components fail.

```tsx
// Wrap each resource table in an error boundary
<ErrorBoundary fallback={<TableErrorFallback resource="Virtual Servers" />}>
  <VirtualServersTable data={data.virtualServers} />
</ErrorBoundary>

// Fallback UI
const TableErrorFallback = ({ resource }: { resource: string }) => (
  <InlineNotification
    kind="error"
    title={`Failed to display ${resource}`}
    subtitle="The data was collected but could not be rendered. Try exporting to XLSX."
  />
);
```

---

## 5. Testing Strategy

### 5.1 Mock SoftLayer Server

Create a mock server that returns realistic responses for development and testing.

**Mock Server Structure:**

```
mock-server/
├── data/
│   ├── small-account/          # ~50 resources
│   │   ├── virtual-guests.json
│   │   ├── hardware.json
│   │   └── ...
│   ├── medium-account/         # ~500 resources
│   └── large-account/          # ~5000 resources
├── server.ts                   # Express mock server
└── README.md
```

**Mock Server Implementation:**

```typescript
// mock-server/server.ts
import express from 'express';
import smallAccount from './data/small-account';

const app = express();

// Mock authentication
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Mock endpoints
app.get('/rest/v3.1/SoftLayer_Account/getVirtualGuests', (req, res) => {
  const offset = parseInt(req.query.offset as string) || 0;
  const limit = parseInt(req.query.limit as string) || 100;
  
  const data = smallAccount.virtualGuests.slice(offset, offset + limit);
  
  // Simulate latency
  setTimeout(() => res.json(data), 200);
});

// ... more endpoints

app.listen(3001, () => console.log('Mock SoftLayer API on port 3001'));
```

**Usage:**

```bash
# Development with mock server
SOFTLAYER_API_URL=http://localhost:3001 npm run dev

# CI/CD testing
npm run test:integration -- --mock-api
```

### 5.2 Test Data Generation

Generate realistic test data for various scenarios.

```typescript
// scripts/generate-test-data.ts
import { faker } from '@faker-js/faker';

function generateVirtualServer(index: number): VirtualServer {
  const datacenter = faker.helpers.arrayElement(['dal13', 'wdc07', 'lon06', 'tok05']);
  
  return {
    id: 10000000 + index,
    hostname: faker.helpers.arrayElement(['web', 'app', 'db', 'cache']) + 
              `-${faker.helpers.arrayElement(['prod', 'dev', 'staging'])}-${index}`,
    domain: 'example.com',
    primaryIpAddress: faker.datatype.boolean(0.8) ? faker.internet.ipv4() : null,
    primaryBackendIpAddress: `10.${faker.number.int({ min: 1, max: 254 })}.${faker.number.int({ min: 1, max: 254 })}.${faker.number.int({ min: 1, max: 254 })}`,
    maxCpu: faker.helpers.arrayElement([1, 2, 4, 8, 16]),
    maxMemory: faker.helpers.arrayElement([1024, 2048, 4096, 8192, 16384, 32768]),
    status: { keyName: 'ACTIVE', name: 'Active' },
    powerState: faker.helpers.arrayElement(['RUNNING', 'RUNNING', 'RUNNING', 'HALTED']),
    datacenter: { id: faker.number.int({ min: 1, max: 100 }), name: datacenter },
    // ... more fields
  };
}

// Generate datasets
const smallDataset = {
  virtualGuests: Array.from({ length: 50 }, (_, i) => generateVirtualServer(i)),
  // ... more resource types
};
```

### 5.3 Test Categories

**Unit Tests:**
- Data transformation functions
- Date normalisation
- Relationship resolution
- Export formatting

**Integration Tests:**
- API proxy endpoints (with mock SoftLayer)
- End-to-end collection flow
- XLSX generation and validation

**Component Tests:**
- DataTable rendering and interactions
- Filter and sort functionality
- Export dialog behaviour

**E2E Tests:**
- Full user journey with Playwright
- Cross-browser testing
- Performance benchmarks

### 5.4 XLSX Snapshot Testing

Verify export format consistency.

```typescript
// tests/export.test.ts
import * as XLSX from 'xlsx';

describe('XLSX Export', () => {
  it('should generate correct worksheet structure', async () => {
    const data = loadTestData('medium-account');
    const buffer = await generateExport(data);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Verify worksheets exist
    expect(workbook.SheetNames).toContain('Summary');
    expect(workbook.SheetNames).toContain('vVirtualServers');
    expect(workbook.SheetNames).toContain('vBareMetal');
    
    // Verify column headers
    const vsiSheet = workbook.Sheets['vVirtualServers'];
    const headers = XLSX.utils.sheet_to_json(vsiSheet, { header: 1 })[0];
    expect(headers).toEqual([
      'ID', 'Hostname', 'Domain', 'FQDN', 'Public IP', 'Private IP',
      // ... expected columns
    ]);
  });
  
  it('should match snapshot for known dataset', async () => {
    const data = loadTestData('snapshot-test');
    const buffer = await generateExport(data);
    
    // Compare against stored snapshot
    expect(buffer).toMatchSnapshot();
  });
});
```

### 5.5 Performance Testing

Ensure the application handles large accounts gracefully.

```typescript
// tests/performance.test.ts
describe('Performance', () => {
  it('should collect 1000 VSIs under 30 seconds', async () => {
    const start = Date.now();
    
    await collectVirtualServers(mockApiKey, { limit: 1000 });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000);
  });
  
  it('should render 5000 row table without blocking', async () => {
    const data = generateLargeDataset(5000);
    
    const { container } = render(<VirtualServersTable data={data} />);
    
    // Verify virtualized rendering (not all rows in DOM)
    const rows = container.querySelectorAll('tr[data-row]');
    expect(rows.length).toBeLessThan(100); // Only visible rows rendered
  });
  
  it('should generate XLSX for 10000 resources under 10 seconds', async () => {
    const data = generateLargeDataset(10000);
    const start = Date.now();
    
    await generateExport(data);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(10000);
  });
});
```

---

## 6. Future-Proofing for Phase 2

### 6.1 Data Export Format for AI Analysis

Design export format that can be consumed by Phase 2's watsonx.ai integration.

**Recommended JSON Export Structure:**

```json
{
  "metadata": {
    "exportVersion": "1.0",
    "collectionDate": "2025-01-28T14:30:00Z",
    "collectionMode": "full",
    "account": {
      "id": 123456,
      "name": "IBM Demo Account",
      "owner": "admin@ibm.com"
    },
    "resourceCounts": {
      "virtualServers": 45,
      "bareMetal": 8,
      "vlans": 12
    }
  },
  "resources": {
    "virtualServers": [...],
    "bareMetal": [...],
    "vlans": [...],
    "subnets": [...],
    "storage": {
      "block": [...],
      "file": [...],
      "object": [...]
    }
  },
  "relationships": {
    "vsiToVlan": [
      { "vsiId": 10000001, "vlanIds": [1234, 1235] },
      { "vsiId": 10000002, "vlanIds": [1234, 1235] }
    ],
    "vsiToStorage": [
      { "vsiId": 10000001, "storageIds": ["block-001", "block-002"] }
    ],
    "vlanToSubnet": [
      { "vlanId": 1234, "subnetIds": [5001, 5002, 5003] }
    ],
    "vlanToGateway": [
      { "vlanId": 1234, "gatewayId": 9001 }
    ]
  },
  "analysis": {
    "estimatedMonthlyCost": 12450.00,
    "resourcesByDatacenter": {
      "dal13": { "vsi": 30, "bareMetal": 5 },
      "wdc07": { "vsi": 15, "bareMetal": 3 }
    }
  }
}
```

**Benefits for Phase 2:**
- Complete data in one file
- Explicit relationships for dependency analysis
- Pre-calculated summaries reduce AI token usage
- Versioned format enables backward compatibility

### 6.2 Resource Tagging Analysis

Good tagging is essential for migration planning. Add analysis features that help users understand their tagging quality.

**Tagging Health Dashboard:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Tagging Analysis                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Overall Tag Coverage: 67%                                      │
│  ████████████████████░░░░░░░░░░                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Resources Missing Tags                                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • 15 Virtual Servers (33%)                              │   │
│  │ • 3 Bare Metal Servers (38%)                            │   │
│  │ • 8 Storage Volumes (40%)                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Common Tags                                              │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ environment: prod (23), dev (12), staging (8)           │   │
│  │ app: web (15), api (10), database (8)                   │   │
│  │ owner: team-alpha (20), team-beta (15)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠️ Inconsistent Tag Naming Detected:                          │
│     • "Environment" vs "environment" vs "env"                   │
│     • "costcenter" vs "cost-center" vs "CostCenter"            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 VPC Profile Mapping Preparation

Prepare mapping data that Phase 2 will use for migration recommendations.

**Classic to VPC Instance Profile Mapping:**

```typescript
// shared/constants/vpc-mappings.ts
export const CLASSIC_TO_VPC_PROFILES: ProfileMapping[] = [
  {
    classic: { cpu: 1, memory: 1024 },
    vpcProfiles: ['bx2-2x8'],  // Nearest available
    notes: 'VPC minimum is 2 vCPU',
  },
  {
    classic: { cpu: 2, memory: 4096 },
    vpcProfiles: ['bx2-2x8', 'cx2-2x4'],
    notes: 'Direct equivalent available',
  },
  {
    classic: { cpu: 4, memory: 8192 },
    vpcProfiles: ['bx2-4x16', 'cx2-4x8'],
    notes: 'Direct equivalent available',
  },
  // ... more mappings
];

export const OS_IMAGE_AVAILABILITY: ImageMapping[] = [
  {
    classicOs: 'CentOS 7.x',
    vpcAvailable: true,
    vpcImage: 'ibm-centos-7-9-minimal-amd64-x',
    notes: null,
  },
  {
    classicOs: 'Windows Server 2012 R2',
    vpcAvailable: false,
    vpcImage: null,
    notes: 'EOL - upgrade to Windows Server 2019 or 2022',
  },
  // ... more mappings
];
```

### 6.4 Extensible Plugin Architecture

Design the collection system to support future data sources.

```typescript
// services/collectors/collector.interface.ts
interface ResourceCollector<T> {
  resourceType: string;
  worksheetName: string;
  
  collect(apiKey: string, options: CollectionOptions): Promise<T[]>;
  transform(raw: unknown[]): T[];
  getColumnDefinitions(): ColumnDefinition[];
}

// services/collectors/virtual-server.collector.ts
class VirtualServerCollector implements ResourceCollector<VirtualServer> {
  resourceType = 'virtualServer';
  worksheetName = 'vVirtualServers';
  
  async collect(apiKey: string, options: CollectionOptions): Promise<VirtualServer[]> {
    // Implementation
  }
  
  // ...
}

// services/collectors/registry.ts
const collectorRegistry = new Map<string, ResourceCollector<unknown>>();

export function registerCollector(collector: ResourceCollector<unknown>) {
  collectorRegistry.set(collector.resourceType, collector);
}

export function getCollectors(): ResourceCollector<unknown>[] {
  return Array.from(collectorRegistry.values());
}

// Easy to add new collectors for Phase 2 or VPC support
registerCollector(new VirtualServerCollector());
registerCollector(new BareMetalCollector());
// Future: registerCollector(new VpcInstanceCollector());
```

---

## 7. Deployment & Operations

### 7.1 Health Check Endpoint

Implement comprehensive health checks for Code Engine.

```typescript
// routes/health.ts
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    softlayerApi: CheckResult;
    memory: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail';
  latency?: number;
  message?: string;
}

app.get('/health', async (req, res) => {
  const health: HealthStatus = {
    status: 'healthy',
    version: process.env.APP_VERSION || 'unknown',
    uptime: process.uptime(),
    checks: {
      softlayerApi: await checkSoftLayerConnectivity(),
      memory: checkMemoryUsage(),
    },
  };
  
  // Determine overall status
  const failedChecks = Object.values(health.checks).filter(c => c.status === 'fail');
  if (failedChecks.length > 0) {
    health.status = failedChecks.length === Object.keys(health.checks).length 
      ? 'unhealthy' 
      : 'degraded';
  }
  
  const httpStatus = health.status === 'unhealthy' ? 503 : 200;
  res.status(httpStatus).json(health);
});

async function checkSoftLayerConnectivity(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Just check if the API endpoint is reachable (no auth needed)
    const response = await fetch('https://api.softlayer.com/rest/v3.1/', {
      method: 'HEAD',
      timeout: 5000,
    });
    return {
      status: response.ok ? 'pass' : 'fail',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Cannot reach SoftLayer API',
    };
  }
}

function checkMemoryUsage(): CheckResult {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const percentUsed = (heapUsedMB / heapTotalMB) * 100;
  
  return {
    status: percentUsed < 90 ? 'pass' : 'fail',
    message: `${heapUsedMB}MB / ${heapTotalMB}MB (${percentUsed.toFixed(1)}%)`,
  };
}
```

### 7.2 Structured Logging

Implement structured logging for better observability.

```typescript
// utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'infrastructure-explorer',
    version: process.env.APP_VERSION,
  },
  transports: [
    new winston.transports.Console(),
  ],
});

// Sanitize sensitive data
export function logRequest(req: Request, context: object = {}) {
  logger.info('API Request', {
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    // NEVER log: authorization, x-api-key, or body containing credentials
    ...context,
  });
}

export function logCollection(resource: string, count: number, durationMs: number) {
  logger.info('Resource Collection Complete', {
    resource,
    count,
    durationMs,
    itemsPerSecond: count / (durationMs / 1000),
  });
}

export function logError(error: Error, context: object = {}) {
  logger.error('Error', {
    message: error.message,
    stack: error.stack,
    // NEVER log API keys or credentials
    ...context,
  });
}
```

### 7.3 Usage Analytics (Privacy-Respecting)

Capture anonymous metrics to guide development priorities.

**Metrics to Track:**

| Metric | Purpose |
|--------|---------|
| Collections per day | Usage volume |
| Average collection time | Performance baseline |
| Resources per collection | Typical account size |
| Most viewed resource types | Feature prioritisation |
| Export frequency | Feature usage |
| Error rate by endpoint | Reliability monitoring |
| Browser/OS distribution | Compatibility priorities |

**Implementation:**

```typescript
// services/analytics.ts
interface AnalyticsEvent {
  event: string;
  properties: Record<string, string | number | boolean>;
  timestamp: string;
}

class Analytics {
  private buffer: AnalyticsEvent[] = [];
  
  track(event: string, properties: Record<string, string | number | boolean> = {}) {
    this.buffer.push({
      event,
      properties: {
        ...properties,
        // Add common properties
        appVersion: process.env.APP_VERSION,
      },
      timestamp: new Date().toISOString(),
    });
    
    // Flush periodically or when buffer is full
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const events = [...this.buffer];
    this.buffer = [];
    
    // Send to analytics endpoint (could be IBM Log Analysis, etc.)
    await this.sendEvents(events);
  }
}

// Usage
analytics.track('collection_started', { mode: 'full' });
analytics.track('collection_completed', { 
  duration_ms: 45000, 
  resource_count: 150,
});
analytics.track('export_requested', { format: 'xlsx', scope: 'all' });
```

### 7.4 Version Display

Show application version in UI and include in exports.

**UI Footer:**

```
IBM Cloud Infrastructure Explorer v1.2.3 | © 2025 IBM
```

**XLSX Summary Sheet:**

```
┌─────────────────────────────────────────────┐
│ IBM Cloud Classic Infrastructure Export     │
├─────────────────────────────────────────────┤
│ Generated: 2025-01-28 14:30:00 UTC         │
│ Tool Version: 1.2.3                         │
│ Account: IBM Demo Account (123456)          │
│ Collection Mode: Full Scan                  │
│                                             │
│ Resource Counts:                            │
│   Virtual Servers: 45                       │
│   Bare Metal: 8                             │
│   VLANs: 12                                 │
│   ...                                       │
└─────────────────────────────────────────────┘
```

**Build-Time Version Injection:**

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
```

### 7.5 Graceful Shutdown

Handle Code Engine scale-down gracefully.

```typescript
// index.ts
const server = app.listen(PORT);

// Track in-flight requests
let activeRequests = 0;
app.use((req, res, next) => {
  activeRequests++;
  res.on('finish', () => activeRequests--);
  next();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown');
  
  // Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Wait for in-flight requests (max 30 seconds)
  const shutdownStart = Date.now();
  while (activeRequests > 0 && Date.now() - shutdownStart < 30000) {
    logger.info(`Waiting for ${activeRequests} active requests...`);
    await sleep(1000);
  }
  
  logger.info('Shutdown complete');
  process.exit(0);
});
```

---

## 8. Documentation Requirements

### 8.1 API Key Permissions Guide

Create clear documentation on required IBM Cloud permissions.

**Required Classic Infrastructure Permissions:**

| Permission Category | Specific Permissions | Purpose |
|---------------------|----------------------|---------|
| Account | View Account Summary | Basic account info |
| Devices | View Virtual Server Details | VSI inventory |
| Devices | View Hardware Details | Bare metal inventory |
| Network | View Network Details | VLANs, subnets, gateways |
| Network | View Firewall Details | Firewall rules |
| Storage | View Storage Details | Block/File/Object storage |
| Services | View DNS Details | DNS domains and records |
| Account | View Billing | Cost information (optional) |

**API Key Creation Steps:**

```markdown
## Creating an API Key for Infrastructure Explorer

1. Log in to IBM Cloud Console (https://cloud.ibm.com)
2. Navigate to **Manage** → **Access (IAM)** → **API keys**
3. Click **Create an IBM Cloud API key**
4. Enter a name: `infrastructure-explorer-readonly`
5. Click **Create**
6. **Important:** Copy and save the API key immediately (it won't be shown again)

### Verifying Permissions

Your API key inherits your user's Classic Infrastructure permissions.
To verify you have the required permissions:

1. Navigate to **Manage** → **Access (IAM)** → **Users**
2. Click on your username
3. Select the **Classic infrastructure** tab
4. Verify the permissions listed above are enabled

### Minimal Permission Set

If you need to request specific permissions from your administrator:

- Account: View Account Summary
- Devices: View Virtual Server Details, View Hardware Details  
- Network: View Network Details
- Storage: View Storage Details

Note: Without billing permissions, cost data will not be collected.
```

### 8.2 User Guide Outline

**Table of Contents:**

1. Introduction
   - What is Infrastructure Explorer?
   - Who should use this tool?
   - Requirements
   
2. Getting Started
   - Creating an API Key
   - Connecting to Your Account
   - Understanding the Dashboard
   
3. Collecting Data
   - Quick Scan vs Full Scan
   - Understanding Progress Indicators
   - Handling Errors
   
4. Exploring Your Infrastructure
   - Navigating Resource Tables
   - Sorting and Filtering
   - Searching Across Resources
   - Understanding Relationships
   
5. Exporting Data
   - XLSX Export
   - Understanding Worksheets
   - Filtered Exports
   
6. Troubleshooting
   - Common Errors
   - Permission Issues
   - Large Account Handling
   
7. FAQ

### 8.3 Video Walkthrough Script

**3-Minute Demo Video Outline:**

```
[0:00-0:15] Introduction
- "IBM Cloud Infrastructure Explorer gives you complete 
   visibility into your Classic infrastructure in minutes"

[0:15-0:45] Connect to Account
- Show API key entry
- Explain security (key not stored)
- Show account validation

[0:45-1:30] Data Collection
- Click "Collect Data"
- Show progress indicator
- Highlight live table population
- "In under 2 minutes, you have a complete inventory"

[1:30-2:15] Explore Data
- Show table navigation
- Demonstrate filtering ("show me all VSIs in dal13")
- Demonstrate sorting
- Quick global search demo

[2:15-2:45] Export
- Click Export
- Show Excel file opening
- Highlight multiple worksheets
- "Share with stakeholders or use for migration planning"

[2:45-3:00] Closing
- Mention Phase 2 (AI migration analysis)
- Call to action
```

---

## 9. Known Gotchas & Edge Cases

### 9.1 Bare Metal Server Data Volume

Bare metal API responses include detailed hardware component information that can be very large.

**Problem:**
- A single bare metal server response can be 50-100KB
- An account with 100 bare metal servers could generate 5-10MB of data
- Object mask with full hardware details can timeout

**Mitigation:**

```typescript
// Use a lighter object mask for initial collection
const BARE_METAL_LITE_MASK = `mask[
  id,hostname,domain,fullyQualifiedDomainName,
  primaryIpAddress,primaryBackendIpAddress,
  processorPhysicalCoreAmount,memoryCapacity,
  datacenter[name],provisionDate,
  billingItem[recurringFee],
  networkVlans[id,vlanNumber]
]`;

// Fetch full hardware details only on demand (detail view)
const BARE_METAL_FULL_MASK = `mask[
  ...all fields including hardDrives, networkComponents, etc...
]`;
```

### 9.2 Gateway Appliance Inconsistencies

Network gateways (Vyatta, Juniper vSRX, AT&T) return different data structures.

**Problem:**
- Vyatta returns configuration in one format
- vSRX returns configuration differently
- Some fields exist for one type but not others

**Mitigation:**

```typescript
interface NormalisedGateway {
  id: number;
  name: string;
  type: 'VYATTA' | 'VSRX' | 'AT&T' | 'UNKNOWN';
  publicIp: string | null;
  privateIp: string | null;
  status: string;
  members: GatewayMember[];
  insideVlanCount: number;
  // ... normalised fields
}

function normaliseGateway(raw: unknown): NormalisedGateway {
  // Detect gateway type and normalise accordingly
  const type = detectGatewayType(raw);
  
  switch (type) {
    case 'VYATTA':
      return normaliseVyatta(raw);
    case 'VSRX':
      return normaliseVsrx(raw);
    default:
      return normaliseGeneric(raw);
  }
}
```

### 9.3 Cancelled/Deprovisioned Resources

The API sometimes returns resources that have been cancelled but not fully removed.

**Problem:**
- Cancelled VSIs may appear with status 'DISCONNECTED' or 'CANCELLED'
- Some cancelled resources have null billing items
- Creates confusion in inventory counts

**Mitigation:**

```typescript
// Filter out cancelled resources by default
function filterActiveResources<T extends { status?: { keyName?: string } }>(
  resources: T[]
): T[] {
  const cancelledStatuses = ['CANCELLED', 'DISCONNECTED', 'PENDING_RECLAIM'];
  
  return resources.filter(r => {
    const status = r.status?.keyName?.toUpperCase();
    return !status || !cancelledStatuses.includes(status);
  });
}

// But allow users to see them if needed
const includeInactive = req.query.includeInactive === 'true';
const resources = includeInactive 
  ? allResources 
  : filterActiveResources(allResources);
```

**UI Option:**

```
☐ Include cancelled/inactive resources
```

### 9.4 Time Zone Handling

SoftLayer returns timestamps in various formats and time zones.

**Problem:**
- Some dates are in Central Time (SoftLayer's default)
- Some dates are in UTC
- Some dates include timezone offset, some don't

**Mitigation:**

```typescript
import { parseISO, parse, isValid, formatISO } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

function normaliseTimestamp(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  // Try ISO format first (with timezone)
  let date = parseISO(dateStr);
  if (isValid(date)) {
    return formatISO(date);
  }
  
  // Try ISO without timezone (assume UTC)
  date = parse(dateStr, "yyyy-MM-dd'T'HH:mm:ss", new Date());
  if (isValid(date)) {
    return formatISO(date);
  }
  
  // Try US format (assume Central Time - SoftLayer default)
  date = parse(dateStr, 'MM/dd/yyyy HH:mm:ss', new Date());
  if (isValid(date)) {
    // Convert from Central to UTC
    const utcDate = zonedTimeToUtc(date, 'America/Chicago');
    return formatISO(utcDate);
  }
  
  // Return original if unparseable
  console.warn(`Could not parse date: ${dateStr}`);
  return dateStr;
}
```

### 9.5 Large Event Log Handling

The Event Log can contain millions of entries for active accounts.

**Problem:**
- Fetching all events is impractical
- API can timeout on large requests
- Users rarely need historical events

**Mitigation:**

```typescript
// Limit event log to recent entries
const EVENT_LOG_DEFAULTS = {
  maxDays: 30,
  maxRecords: 1000,
};

async function collectEventLog(apiKey: string, options = EVENT_LOG_DEFAULTS) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - options.maxDays);
  
  const filter = {
    eventCreateDate: {
      operation: 'greaterThanDate',
      options: [{ name: 'date', value: [thirtyDaysAgo.toISOString()] }],
    },
  };
  
  return fetchWithFilter(
    'SoftLayer_Event_Log/getAllObjects',
    apiKey,
    { filter, limit: options.maxRecords }
  );
}
```

**UI Warning:**

```
ℹ️ Event Log limited to last 30 days (1,000 most recent entries)
```

### 9.6 Private Network Only VSIs

Some VSIs have no public IP address.

**Problem:**
- `primaryIpAddress` is null
- Users might think data is missing
- Sorting/filtering by IP can cause issues

**Mitigation:**

```typescript
// Handle null IPs gracefully
const publicIp = vsi.primaryIpAddress ?? 'Private Only';

// In table, show indicator
<TableCell>
  {vsi.primaryIpAddress || (
    <Tag type="cool-gray" size="sm">Private Only</Tag>
  )}
</TableCell>
```

### 9.7 Unicode in Resource Names

Some customers use unicode characters in hostnames and notes.

**Problem:**
- Unicode can cause issues in CSV export
- Some characters render poorly in Excel
- Search/filter may not work correctly

**Mitigation:**

```typescript
// Sanitise for export while preserving for display
function sanitiseForExport(text: string | null): string {
  if (!text) return '';
  
  // Replace common problematic characters
  return text
    .replace(/[\u2018\u2019]/g, "'")  // Smart quotes to regular
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')  // En/em dash to hyphen
    .replace(/[^\x00-\x7F]/g, '?');   // Replace other non-ASCII
}

// Or use UTF-8 BOM for Excel compatibility
function generateCsvWithBom(data: unknown[]): Buffer {
  const csv = Papa.unparse(data);
  const bom = '\uFEFF';
  return Buffer.from(bom + csv, 'utf-8');
}
```

---

## 10. Competitive Differentiation Features

### 10.1 Cost Summary Dashboard

Aggregate billing data to show spending overview.

**Cost Summary View:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Monthly Cost Summary                      Total: $12,450.00    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  By Resource Type                    By Datacenter              │
│  ┌─────────────────────────────┐    ┌─────────────────────────┐│
│  │ ████████████ VSIs    $6,200 │    │ ██████████ dal13 $7,500 ││
│  │ ████████     BM      $3,800 │    │ ██████    wdc07  $3,200 ││
│  │ ████         Storage $1,500 │    │ ███       lon06  $1,750 ││
│  │ ██           Network   $950 │    │                         ││
│  └─────────────────────────────┘    └─────────────────────────┘│
│                                                                 │
│  Top 10 Most Expensive Resources                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. db-prod-1 (Bare Metal)      $1,200/mo                │   │
│  │ 2. db-prod-2 (Bare Metal)      $1,200/mo                │   │
│  │ 3. app-cluster-1 (VSI 16x64)     $450/mo                │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
interface CostSummary {
  totalMonthlyCost: number;
  byResourceType: Record<string, number>;
  byDatacenter: Record<string, number>;
  topResources: { name: string; type: string; cost: number }[];
}

function calculateCostSummary(data: CollectedData): CostSummary {
  const allResources = [
    ...data.virtualServers.map(r => ({ ...r, type: 'VSI' })),
    ...data.bareMetal.map(r => ({ ...r, type: 'Bare Metal' })),
    ...data.blockStorage.map(r => ({ ...r, type: 'Block Storage' })),
    ...data.fileStorage.map(r => ({ ...r, type: 'File Storage' })),
  ];
  
  const withCost = allResources
    .map(r => ({
      name: r.hostname || r.username,
      type: r.type,
      datacenter: r.datacenter?.name || 'Unknown',
      cost: r.billingItem?.recurringFee || 0,
    }))
    .filter(r => r.cost > 0);
  
  return {
    totalMonthlyCost: withCost.reduce((sum, r) => sum + r.cost, 0),
    byResourceType: groupAndSum(withCost, 'type'),
    byDatacenter: groupAndSum(withCost, 'datacenter'),
    topResources: withCost.sort((a, b) => b.cost - a.cost).slice(0, 10),
  };
}
```

### 10.2 Stale Resource Detection

Identify resources that may be unused and candidates for cleanup.

**Stale Resource Indicators:**

| Resource Type | Stale Indicator |
|---------------|-----------------|
| VSI | Powered off > 30 days |
| VSI | No network activity (if available) |
| Bare Metal | Powered off > 30 days |
| Block Storage | Not attached to any compute |
| File Storage | Not attached to any compute |
| Portable Subnet | No IPs in use |
| Security Group | No bound interfaces |
| SSL Certificate | Expired |
| SSH Key | Never used (no associated servers) |

**Stale Resources View:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Potentially Unused Resources                                │
│     Review these resources for possible cleanup                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Powered Off > 30 Days (3 resources, $450/mo potential savings) │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ test-server-1    VSI    Powered off 45 days   $150/mo │   │
│  │ ☐ old-dev-server   VSI    Powered off 90 days   $200/mo │   │
│  │ ☐ backup-test      VSI    Powered off 60 days   $100/mo │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Unattached Storage (2 volumes, $200/mo potential savings)      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ orphan-vol-1     Block  500GB  No hosts       $100/mo │   │
│  │ ☐ old-backup-vol   File   1TB    No hosts       $100/mo │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Expired Certificates (2)                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ *.example.com           Expired 2024-12-01            │   │
│  │ ☐ api.example.com         Expired 2024-11-15            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Total Potential Monthly Savings: $650                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.3 Export Comparison (Diff)

Allow users to compare current inventory against a previous export.

**Use Cases:**
- "What changed since last month?"
- "Which resources were added/removed?"
- "Track infrastructure drift over time"

**Comparison View:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Infrastructure Changes                                         │
│  Comparing: Current  vs  Export from 2024-12-28                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Summary                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Added:     +12 resources                                │   │
│  │ Removed:    -3 resources                                │   │
│  │ Modified:   +8 resources                                │   │
│  │ Unchanged: 142 resources                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Added Resources                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ + web-prod-4      VSI        dal13      2025-01-15     │   │
│  │ + web-prod-5      VSI        dal13      2025-01-15     │   │
│  │ + new-storage-1   Block      dal13      2025-01-20     │   │
│  │ ...                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Removed Resources                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ - old-test-1      VSI        wdc07      (was $150/mo)  │   │
│  │ - temp-storage    Block      wdc07      (was $50/mo)   │   │
│  │ ...                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Modified Resources                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ~ app-prod-1      CPU: 4→8   RAM: 8GB→16GB             │   │
│  │ ~ db-prod-1       Storage: +500GB attached              │   │
│  │ ...                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [ Export Diff Report ]                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
interface DiffResult {
  added: Resource[];
  removed: Resource[];
  modified: { current: Resource; previous: Resource; changes: string[] }[];
  unchanged: Resource[];
}

function compareExports(current: CollectedData, previous: CollectedData): DiffResult {
  const currentById = new Map(current.virtualServers.map(r => [r.id, r]));
  const previousById = new Map(previous.virtualServers.map(r => [r.id, r]));
  
  const added = current.virtualServers.filter(r => !previousById.has(r.id));
  const removed = previous.virtualServers.filter(r => !currentById.has(r.id));
  
  const modified = current.virtualServers
    .filter(r => previousById.has(r.id))
    .map(curr => {
      const prev = previousById.get(curr.id)!;
      const changes = detectChanges(curr, prev);
      return changes.length > 0 ? { current: curr, previous: prev, changes } : null;
    })
    .filter(Boolean);
  
  // ... repeat for other resource types
  
  return { added, removed, modified, unchanged };
}

function detectChanges(current: Resource, previous: Resource): string[] {
  const changes: string[] = [];
  
  if (current.maxCpu !== previous.maxCpu) {
    changes.push(`CPU: ${previous.maxCpu}→${current.maxCpu}`);
  }
  if (current.maxMemory !== previous.maxMemory) {
    changes.push(`RAM: ${formatMemory(previous.maxMemory)}→${formatMemory(current.maxMemory)}`);
  }
  if (current.powerState !== previous.powerState) {
    changes.push(`Power: ${previous.powerState}→${current.powerState}`);
  }
  // ... more comparisons
  
  return changes;
}
```

### 10.4 Quick Actions

Provide shortcuts to common IBM Cloud console actions.

**Quick Action Links:**

```
┌─────────────────────────────────────────────────────────────────┐
│  web-prod-1                                    [ Actions ▼ ]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Quick Actions:                                                 │
│  • View in IBM Cloud Console →                                  │
│  • Open KVM Console →                                          │
│  • View Bandwidth Graph →                                       │
│  • View Billing Details →                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
function getConsoleUrl(resource: Resource): string {
  const baseUrl = 'https://cloud.ibm.com';
  
  switch (resource.type) {
    case 'virtualServer':
      return `${baseUrl}/gen1/infrastructure/virtual-server/${resource.id}/details`;
    case 'bareMetal':
      return `${baseUrl}/gen1/infrastructure/bare-metal/${resource.id}/details`;
    case 'vlan':
      return `${baseUrl}/classic/network/vlans/${resource.id}`;
    // ... more resource types
  }
}
```

---

## Summary

These suggestions are organised by implementation priority:

**Phase 1 (MVP) Priorities:**
1. Vertical slice development approach
2. Pagination and rate limiting handling
3. Incremental table loading
4. Mock SoftLayer server for testing
5. Health check endpoint

**Phase 1.5 (Post-MVP) Priorities:**
1. Cost summary dashboard
2. Global search
3. Column presets
4. Stale resource detection
5. Export comparison

**Phase 2 (AI Integration) Priorities:**
1. JSON export format for AI consumption
2. Tagging analysis
3. VPC profile mapping data
4. Relationship visualisation

**Ongoing Considerations:**
1. Structured logging and analytics
2. Comprehensive documentation
3. Performance testing with large accounts
4. Edge case handling

---

**Document End**