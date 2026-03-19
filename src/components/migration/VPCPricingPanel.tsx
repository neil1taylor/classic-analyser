import React, { useMemo, useState } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  Dropdown,
  Tile,
} from '@carbon/react';
import type { VPCPricingData } from '@/types/migration';
import { VPC_PROFILES } from '@/services/migration/data/vpcProfiles';

interface Props {
  pricing: VPCPricingData;
}

const FAMILY_OPTIONS = [
  { id: 'all', text: 'All Families' },
  { id: 'balanced', text: 'Balanced' },
  { id: 'compute', text: 'Compute' },
  { id: 'memory', text: 'Memory' },
  { id: 'very-high-memory', text: 'Very High Memory' },
  { id: 'ultra-high-memory', text: 'Ultra High Memory' },
];

const STORAGE_LABELS: Record<string, string> = {
  'block-general': 'Block Storage — General Purpose (3 IOPS/GB)',
  'block-5iops': 'Block Storage — 5 IOPS/GB',
  'block-10iops': 'Block Storage — 10 IOPS/GB',
  'file': 'File Storage',
};

const NETWORK_LABELS: Record<string, string> = {
  'floating-ip': 'Floating IP',
  'vpn-gateway': 'VPN Gateway',
  'load-balancer': 'Application Load Balancer',
};

const fmt = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PROFILE_HEADERS = [
  { key: 'name', header: 'Profile Name' },
  { key: 'family', header: 'Family' },
  { key: 'vcpu', header: 'vCPUs' },
  { key: 'memory', header: 'Memory (GB)' },
  { key: 'bandwidth', header: 'Bandwidth (Gbps)' },
  { key: 'monthlyCost', header: 'Monthly Cost ($)' },
];

const VPCPricingPanel: React.FC<Props> = ({ pricing }) => {
  const [familyFilter, setFamilyFilter] = useState('all');

  // Merge VPC_PROFILES specs with pricing data
  const profileRows = useMemo(() => {
    return VPC_PROFILES
      .filter((p) => familyFilter === 'all' || p.family === familyFilter)
      .map((p) => {
        const cost = pricing.profiles[p.name]?.monthlyCost ?? 0;
        return {
          id: p.name,
          name: p.name,
          family: p.family,
          vcpu: p.vcpu,
          memory: p.memory,
          bandwidth: p.bandwidth,
          monthlyCost: cost > 0 ? fmt(cost) : '—',
        };
      });
  }, [pricing, familyFilter]);

  // Storage rows
  const storageRows = useMemo(() => {
    return Object.entries(pricing.storage).map(([key, cost]) => ({
      id: key,
      tier: STORAGE_LABELS[key] ?? key,
      cost: `${fmt(cost)}/GB/mo`,
    }));
  }, [pricing]);

  // Network rows
  const networkRows = useMemo(() => {
    return Object.entries(pricing.network).map(([key, cost]) => ({
      id: key,
      resource: NETWORK_LABELS[key] ?? key,
      cost: `${fmt(cost)}/mo`,
    }));
  }, [pricing]);

  const sourceLabel = pricing.source === 'live-catalog' ? 'Live Catalog' : 'Fallback File';
  const sourceType = pricing.source === 'live-catalog' ? 'green' : 'blue';
  const generatedDate = new Date(pricing.generatedAt).toLocaleString();

  return (
    <div className="vpc-pricing-panel">
      {/* Source indicator */}
      <Tile style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Pricing Source:</span>
          <Tag type={sourceType} size="sm">{sourceLabel}</Tag>
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)' }}>
            Region: {pricing.region} | Generated: {generatedDate}
          </span>
        </div>
      </Tile>

      {/* Compute Profiles */}
      <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
        Compute Profiles ({profileRows.length})
      </h5>
      <div style={{ marginBottom: '1rem', maxWidth: '16rem' }}>
        <Dropdown
          id="family-filter"
          titleText=""
          label="Filter by family"
          items={FAMILY_OPTIONS}
          itemToString={(item: { id: string; text: string } | null) => item?.text ?? ''}
          selectedItem={FAMILY_OPTIONS.find((f) => f.id === familyFilter) ?? FAMILY_OPTIONS[0]}
          onChange={({ selectedItem }: { selectedItem: { id: string; text: string } | null }) =>
            setFamilyFilter(selectedItem?.id ?? 'all')
          }
          size="sm"
        />
      </div>

      <DataTable rows={profileRows} headers={PROFILE_HEADERS} isSortable size="sm">
        {({
          rows,
          headers,
          getTableProps,
          getHeaderProps,
          getRowProps,
        }) => (
          <div style={{ marginBottom: '2rem' }}>
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => {
                  const { key: _key, ...headerProps } = getHeaderProps({ header });
                  return (
                    <TableHeader key={header.key} {...headerProps}>
                      {header.header}
                    </TableHeader>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const { key: _key, ...rowProps } = getRowProps({ row });
                return (
                  <TableRow key={row.id} {...rowProps}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </DataTable>

      {/* Storage Pricing */}
      <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
        Storage Pricing
      </h5>
      <div style={{ marginBottom: '2rem' }}>
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Tier</TableHeader>
            <TableHeader>Cost</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {storageRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.tier}</TableCell>
              <TableCell>{row.cost}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {/* Network Pricing */}
      <h5 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
        Network Pricing
      </h5>
      <Table size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Resource</TableHeader>
            <TableHeader>Cost</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {networkRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.resource}</TableCell>
              <TableCell>{row.cost}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default VPCPricingPanel;
