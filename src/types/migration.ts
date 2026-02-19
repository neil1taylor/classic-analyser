// ── Migration Analysis Types ──────────────────────────────────────────────

export type MigrationStatus = 'ready' | 'needs-work' | 'blocked' | 'not-applicable';
export type ComplexityCategory = 'Low' | 'Medium' | 'High' | 'Very High';
export type ProfileFamily = 'balanced' | 'compute' | 'memory' | 'very-high-memory' | 'ultra-high-memory';
export type OSEffort = 'none' | 'minimal' | 'moderate' | 'significant';
export type StorageMigrationStrategy = 'snapshot' | 'replication' | 'application-level';
export type NetworkComplexity = 'low' | 'medium' | 'high' | 'very-high';

// ── User Preferences ─────────────────────────────────────────────────────

export interface MigrationPreferences {
  targetRegion: string;
  budgetConstraint?: number;
  excludeResources: string[];
}

export const DEFAULT_PREFERENCES: MigrationPreferences = {
  targetRegion: 'us-south',
  excludeResources: [],
};

// ── VPC Profile Reference ────────────────────────────────────────────────

export interface VPCProfile {
  name: string;
  family: ProfileFamily;
  vcpu: number;
  memory: number;       // GB
  bandwidth: number;    // Gbps
  estimatedCost: number; // $/month
}

// ── OS Compatibility ─────────────────────────────────────────────────────

export interface OSCompatibility {
  classicOS: string;
  pattern: RegExp;
  vpcAvailable: boolean;
  vpcImage: string | null;
  upgradeRequired: boolean;
  upgradeTarget?: string;
  effort: OSEffort;
  notes: string;
}

// ── Datacenter Mapping ───────────────────────────────────────────────────

export interface DatacenterMapping {
  classicDCs: string[];
  vpcRegion: string;
  vpcZones: string[];
  available: boolean;
  notes?: string;
}

// ── Feature Gap ──────────────────────────────────────────────────────────

export interface FeatureGapDefinition {
  classicFeature: string;
  vpcStatus: 'available' | 'partial' | 'not-available';
  workaround: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectionKey?: string;
  detectionField?: string;
}

// ── Storage Tier ─────────────────────────────────────────────────────────

export interface StorageTierMapping {
  classicTier: string;
  classicIOPS: string;
  vpcProfile: string;
  vpcIOPS: string;
  notes: string;
}

// ── VPC Cost Estimates ───────────────────────────────────────────────────

export interface VPCCostEstimate {
  resource: string;
  unit: string;
  monthlyCost: number;
}

// ── Compute Assessment ───────────────────────────────────────────────────

export interface VSIMigration {
  id: number;
  hostname: string;
  datacenter: string;
  cpu: number;
  memoryMB: number;
  os: string;
  currentFee: number;
  isEstimatedCost?: boolean;
  noBillingItem?: boolean;
  status: MigrationStatus;
  recommendedProfile: VPCProfile | null;
  alternativeProfiles: VPCProfile[];
  osCompatible: boolean;
  osUpgradeTarget?: string;
  notes: string[];
}

export interface BareMetalMigration {
  id: number;
  hostname: string;
  datacenter: string;
  cores: number;
  memoryGB: number;
  os: string;
  currentFee: number;
  status: MigrationStatus;
  migrationPath: 'vpc-bare-metal' | 'vpc-vsi' | 'not-migratable' | 'powervs' | 'powervs-sap';
  recommendedProfile?: VPCProfile | null;
  notes: string[];
}

export interface ComputeAssessment {
  totalInstances: number;
  vsiMigrations: VSIMigration[];
  bareMetalMigrations: BareMetalMigration[];
  summary: {
    readyToMigrate: number;
    needsWork: number;
    blocked: number;
  };
  score: number;
  recommendations: string[];
}

// ── Network Assessment ───────────────────────────────────────────────────

export interface SubnetRecommendation {
  classicVlanId: number;
  classicVlanNumber: number;
  classicVlanName: string;
  networkSpace: string;
  datacenter: string;
  vpcSubnetCIDR: string;
  vpcSubnetName: string;
  vpcZone: string;
}

export interface FirewallTranslation {
  classicId: number;
  classicType: string;
  vlanNumber: number;
  ruleCount: number;
  autoTranslatable: number;
  manualReview: number;
  notes: string[];
}

export interface GatewayAssessment {
  id: number;
  name: string;
  canUseNativeVPC: boolean;
  requiresAppliance: boolean;
  recommendation: string;
  notes: string[];
}

export interface LoadBalancerMapping {
  classicId: number;
  classicName: string;
  classicType: string;
  vpcType: 'application' | 'network';
  notes: string[];
}

export interface VPNAssessment {
  id: number;
  name: string;
  canMigrateToVPCVPN: boolean;
  notes: string[];
}

export interface NetworkAssessment {
  vlanAnalysis: {
    totalVlans: number;
    publicVlans: number;
    privateVlans: number;
    recommendedVPCSubnets: SubnetRecommendation[];
  };
  gatewayAnalysis: {
    gatewaysFound: number;
    canUseNativeVPC: number;
    requiresAppliance: number;
    assessments: GatewayAssessment[];
  };
  firewallAnalysis: {
    totalFirewalls: number;
    totalRules: number;
    autoTranslatable: number;
    manualReview: number;
    translations: FirewallTranslation[];
  };
  loadBalancerAnalysis: {
    totalLBs: number;
    mappings: LoadBalancerMapping[];
  };
  vpnAnalysis: {
    totalTunnels: number;
    canMigrate: number;
    assessments: VPNAssessment[];
  };
  score: number;
  complexity: NetworkComplexity;
  recommendations: string[];
}

// ── Storage Assessment ───────────────────────────────────────────────────

export interface BlockVolumeAssessment {
  id: number;
  username: string;
  capacityGB: number;
  iops: number;
  tier: string;
  vpcProfile: string;
  vpcIOPS: string;
  currentFee: number;
  strategy: StorageMigrationStrategy;
  notes: string[];
}

export interface FileVolumeAssessment {
  id: number;
  username: string;
  capacityGB: number;
  currentFee: number;
  notes: string[];
}

export interface StorageAssessment {
  blockStorage: {
    totalVolumes: number;
    totalCapacityGB: number;
    volumeAssessments: BlockVolumeAssessment[];
  };
  fileStorage: {
    totalVolumes: number;
    totalCapacityGB: number;
    volumeAssessments: FileVolumeAssessment[];
  };
  objectStorage: {
    totalAccounts: number;
    migrationRequired: boolean;
    notes: string[];
  };
  score: number;
  recommendations: string[];
}

// ── Security Assessment ──────────────────────────────────────────────────

export interface SecurityAssessment {
  securityGroups: {
    existingGroups: number;
    existingRules: number;
    vpcGroupsNeeded: number;
    notes: string[];
  };
  certificates: {
    total: number;
    expiringSoon: number;
    expired: number;
    notes: string[];
  };
  sshKeys: {
    total: number;
    notes: string[];
  };
  score: number;
  recommendations: string[];
}

// ── Feature Gap ──────────────────────────────────────────────────────────

export interface FeatureGap {
  feature: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected: boolean;
  affectedResources: number;
  workaround: string;
  notes: string;
}

// ── Dependency Graph ─────────────────────────────────────────────────────

export interface DependencyNode {
  id: string;
  type: string;
  label: string;
  datacenter: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

// ── Complexity Score ─────────────────────────────────────────────────────

export interface DimensionScore {
  score: number;      // 0-100 (100 = easiest)
  label: string;
  findings: string[];
}

export interface ComplexityScore {
  overall: number;
  category: ComplexityCategory;
  dimensions: {
    compute: DimensionScore;
    network: DimensionScore;
    storage: DimensionScore;
    security: DimensionScore;
    features: DimensionScore;
  };
}

// ── Cost Analysis ────────────────────────────────────────────────────────

export interface CostAnalysis {
  classicMonthlyCost: number;
  vpcMonthlyCost: number;
  monthlyDifference: number;
  percentageChange: number;
  breakEvenMonths: number;
  threeYearSavings: number;
  costByCategory: {
    compute: { classic: number; vpc: number };
    storage: { classic: number; vpc: number };
    network: { classic: number; vpc: number };
  };
}

// ── Migration Wave ───────────────────────────────────────────────────────

export interface MigrationWaveResource {
  id: string;
  type: string;
  name: string;
  datacenter: string;
}

export interface MigrationWave {
  waveNumber: number;
  name: string;
  description: string;
  resources: MigrationWaveResource[];
  prerequisites: string[];
  estimatedDuration: string;
  rollbackPlan: string;
  validationSteps: string[];
}

// ── Full Analysis Output ─────────────────────────────────────────────────

export interface MigrationAnalysisOutput {
  timestamp: string;
  preferences: MigrationPreferences;
  computeAssessment: ComputeAssessment;
  networkAssessment: NetworkAssessment;
  storageAssessment: StorageAssessment;
  securityAssessment: SecurityAssessment;
  featureGaps: FeatureGap[];
  dependencyGraph: DependencyGraph;
  complexityScore: ComplexityScore;
  costAnalysis: CostAnalysis;
  migrationWaves: MigrationWave[];
  prereqChecks: PreReqCheckResults;
}

// ── Context State ────────────────────────────────────────────────────────

export type MigrationAnalysisStatus = 'idle' | 'running' | 'complete' | 'error';

// ── Dynamic VPC Pricing ─────────────────────────────────────────────────

export interface VPCPricingData {
  generatedAt: string;
  region: string;
  source?: 'live-catalog' | 'fallback-file';
  profiles: Record<string, { monthlyCost: number }>;
  bareMetalProfiles?: Record<string, { monthlyCost: number }>;
  storage: {
    'block-general': number;
    'block-5iops': number;
    'block-10iops': number;
    file: number;
  };
  network: {
    'floating-ip': number;
    'vpn-gateway': number;
    'load-balancer': number;
  };
}

// ── Pre-Requisite Checks ────────────────────────────────────────────────

export type CheckSeverity = 'blocker' | 'warning' | 'info' | 'unknown' | 'passed';

export interface AffectedResource {
  id: number | string;
  hostname: string;
  detail?: string;
}

export interface PreRequisiteCheck {
  id: string;
  name: string;
  category: 'compute' | 'storage' | 'network' | 'security';
  description: string;
  threshold?: string;
  docsUrl: string;
  remediationSteps: string[];
}

export interface CheckResult {
  check: PreRequisiteCheck;
  severity: CheckSeverity;
  affectedCount: number;
  totalChecked: number;
  affectedResources: AffectedResource[];
}

export interface PreReqCheckResults {
  compute: CheckResult[];
  storage: CheckResult[];
  network: CheckResult[];
  security: CheckResult[];
}
