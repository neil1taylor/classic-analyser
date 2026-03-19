import React, { useMemo, useState } from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Dropdown,
  Tag,
  Pagination,
} from '@carbon/react';
import { useKnownSubnets, type KnownSubnet, type SubnetSourceType } from '@/hooks/useKnownSubnets';

const SOURCE_TYPE_COLORS: Record<SubnetSourceType, 'blue' | 'cyan' | 'green' | 'magenta' | 'teal'> = {
  'Own VPC': 'blue',
  'Own Classic': 'cyan',
  'TGW': 'green',
  'Direct Link': 'magenta',
  'VPN': 'teal',
};

const HEADERS = [
  { key: 'cidr', header: 'CIDR' },
  { key: 'sourceType', header: 'Source' },
  { key: 'sourceName', header: 'Name' },
  { key: 'reachability', header: 'Reachability' },
  { key: 'region', header: 'Region' },
  { key: 'vpcOrVlan', header: 'VPC / VLAN' },
  { key: 'transitGatewayName', header: 'Transit Gateway' },
];

const PAGE_SIZES = [10, 25, 50, 100];

const KnownSubnetsTable: React.FC = () => {
  const subnets = useKnownSubnets();
  const [searchText, setSearchText] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SubnetSourceType | 'All'>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sourceTypes: Array<SubnetSourceType | 'All'> = ['All', 'Own VPC', 'Own Classic', 'TGW', 'Direct Link', 'VPN'];

  const filteredSubnets = useMemo(() => {
    let result = subnets;

    // Filter by source type
    if (sourceFilter !== 'All') {
      result = result.filter((s) => s.sourceType === sourceFilter);
    }

    // Filter by search text
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.cidr.toLowerCase().includes(lower) ||
          s.sourceName.toLowerCase().includes(lower) ||
          (s.region?.toLowerCase().includes(lower) ?? false) ||
          (s.vpcOrVlan?.toLowerCase().includes(lower) ?? false) ||
          (s.transitGatewayName?.toLowerCase().includes(lower) ?? false)
      );
    }

    return result;
  }, [subnets, sourceFilter, searchText]);

  const paginatedSubnets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSubnets.slice(start, start + pageSize);
  }, [filteredSubnets, page, pageSize]);

  const rows = paginatedSubnets.map((s: KnownSubnet) => ({
    id: s.id,
    cidr: s.cidr,
    sourceType: s.sourceType,
    sourceName: s.sourceName,
    reachability: s.reachability,
    region: s.region || '-',
    vpcOrVlan: s.vpcOrVlan || '-',
    transitGatewayName: s.transitGatewayName || (s.gatewayName ? `DL: ${s.gatewayName}` : '-'),
  }));

  if (subnets.length === 0) {
    return (
      <div style={{ padding: '1rem', color: 'var(--cds-text-secondary)', textAlign: 'center' }}>
        No known subnets found. Collect VPC and/or Classic data to populate this table.
      </div>
    );
  }

  return (
    <div>
      <DataTable rows={rows} headers={HEADERS} isSortable>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getTableContainerProps }) => (
          <TableContainer {...getTableContainerProps()}>
            <TableToolbar>
              <TableToolbarContent>
                <TableToolbarSearch
                  placeholder="Search subnets..."
                  value={searchText}
                  onChange={(e: '' | React.ChangeEvent<HTMLInputElement>, value?: string) => {
                    setSearchText(value ?? (typeof e === 'string' ? e : e.target.value));
                    setPage(1);
                  }}
                  persistent
                />
                <Dropdown
                  id="source-type-filter"
                  titleText=""
                  label="Source Type"
                  items={sourceTypes}
                  selectedItem={sourceFilter}
                  onChange={({ selectedItem }: { selectedItem: SubnetSourceType | 'All' | null }) => {
                    setSourceFilter(selectedItem ?? 'All');
                    setPage(1);
                  }}
                  size="sm"
                  style={{ minWidth: 140 }}
                />
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem' }}>
                  <Tag type="blue">{subnets.filter((s) => s.sourceType === 'Own VPC').length} VPC</Tag>
                  <Tag type="cyan">{subnets.filter((s) => s.sourceType === 'Own Classic').length} Classic</Tag>
                  <Tag type="green">{subnets.filter((s) => s.sourceType === 'TGW').length} TGW</Tag>
                  <Tag type="magenta">{subnets.filter((s) => s.sourceType === 'Direct Link').length} DL</Tag>
                  <Tag type="teal">{subnets.filter((s) => s.sourceType === 'VPN').length} VPN</Tag>
                </div>
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()} size="sm">
              <TableHead>
                <TableRow>
                  {headers.map((header) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { key, ...headerProps } = getHeaderProps({ header });
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
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { key, ...rowProps } = getRowProps({ row });
                  return (
                    <TableRow key={row.id} {...rowProps}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>
                        {cell.info.header === 'sourceType' ? (
                          <Tag type={SOURCE_TYPE_COLORS[cell.value as SubnetSourceType]} size="sm">
                            {cell.value}
                          </Tag>
                        ) : cell.info.header === 'cidr' ? (
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{cell.value}</span>
                        ) : (
                          cell.value
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination
              totalItems={filteredSubnets.length}
              pageSize={pageSize}
              pageSizes={PAGE_SIZES}
              page={page}
              onChange={({ page: newPage, pageSize: newPageSize }: { page: number; pageSize: number }) => {
                setPage(newPage);
                setPageSize(newPageSize);
              }}
            />
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

export default KnownSubnetsTable;
