import React from 'react';
import {
  SideNav as CarbonSideNav,
  SideNavItems,
  SideNavMenu,
  SideNavMenuItem,
  SideNavDivider,
  ContentSwitcher,
  Switch,
} from '@carbon/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CATEGORIES, getResourcesByCategory } from '@/types/resources';
import { VPC_CATEGORIES, getVpcResourcesByCategory } from '@/types/vpc-resources';
import { POWERVS_CATEGORIES, getPowerVsResourcesByCategory } from '@/types/powervs-resources';
import { PLATFORM_RESOURCE_TYPES } from '@/types/platform-resources';
import type { InfrastructureDomain } from '@/contexts/AuthContext';
import {
  Dashboard,
  NetworkOverlay,
  Currency,
  EarthFilled,
  Migrate,
  Document,
  DocumentExport,
  Settings,
  Chip,
  Network_3,
  DataBase,
  Security,
  ServerDns,
  VirtualMachine,
  OverflowMenuHorizontal,
} from '@carbon/icons-react';
import { useUI } from '@/contexts/UIContext';
import { useAuth } from '@/contexts/AuthContext';

const categoryIconMap: Record<string, React.ComponentType> = {
  Compute: Chip,
  Network: Network_3,
  Storage: DataBase,
  Security: Security,
  DNS: ServerDns,
  VMware: VirtualMachine,
  Other: OverflowMenuHorizontal,
};

const domainLabels: Record<InfrastructureDomain, string> = {
  classic: 'Classic',
  vpc: 'VPC',
  powervs: 'PowerVS',
  platform: 'Platform',
};

const AppSideNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sideNavExpanded, activeDomain, setActiveDomain } = useUI();
  const { infrastructureMode } = useAuth();

  const availableDomains = (infrastructureMode ?? []) as InfrastructureDomain[];
  const currentPath = location.pathname;

  const handleDomainSwitch = (domain: InfrastructureDomain) => {
    setActiveDomain(domain);
    const dashboards: Record<InfrastructureDomain, string> = {
      classic: '/dashboard',
      vpc: '/vpc/dashboard',
      powervs: '/powervs/dashboard',
      platform: '/platform/dashboard',
    };
    navigate(dashboards[domain]);
  };

  // ── Classic nav items ─────────────────────────────────────────
  const renderClassicNav = () => {
    const isDashboard = currentPath === '/dashboard';
    const isTopology = currentPath === '/topology';
    const isCosts = currentPath === '/costs';
    const isGeography = currentPath === '/geography';
    const isMigration = currentPath === '/migration';
    const isRoutes = currentPath === '/routes';

    return (
      <>
        <SideNavMenuItem onClick={() => navigate('/dashboard')} isActive={isDashboard} aria-current={isDashboard ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Dashboard size={16} /> Summary</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/topology')} isActive={isTopology} aria-current={isTopology ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><NetworkOverlay size={16} /> Topology</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/costs')} isActive={isCosts} aria-current={isCosts ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Currency size={16} /> Cost Analysis</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/geography')} isActive={isGeography} aria-current={isGeography ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><EarthFilled size={16} /> Geography</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/migration')} isActive={isMigration} aria-current={isMigration ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Migrate size={16} /> Migration Analysis</span>
        </SideNavMenuItem>

        <SideNavDivider />

        {CATEGORIES.map((category) => {
          const resources = getResourcesByCategory(category);
          if (resources.length === 0) return null;
          const isAnyActive = resources.some((r) => currentPath === `/resources/${r.key}`) || (category === 'Network' && isRoutes);
          return (
            <SideNavMenu key={category} title={category} renderIcon={categoryIconMap[category]} defaultExpanded={isAnyActive}>
              {resources.map((resource) => {
                const isActive = currentPath === `/resources/${resource.key}`;
                return (
                  <SideNavMenuItem key={resource.key} onClick={() => navigate(`/resources/${resource.key}`)} isActive={isActive} aria-current={isActive ? 'page' : undefined}>
                    {resource.label}
                  </SideNavMenuItem>
                );
              })}
              {category === 'Network' && (
                <SideNavMenuItem onClick={() => navigate('/routes')} isActive={isRoutes} aria-current={isRoutes ? 'page' : undefined}>
                  Routes
                </SideNavMenuItem>
              )}
            </SideNavMenu>
          );
        })}
      </>
    );
  };

  // ── VPC nav items ─────────────────────────────────────────────
  const renderVpcNav = () => {
    const isVpcDashboard = currentPath === '/vpc/dashboard';
    const isVpcTopology = currentPath === '/vpc/topology';
    const isVpcCosts = currentPath === '/vpc/costs';
    const isVpcGeography = currentPath === '/vpc/geography';

    return (
      <>
        <SideNavMenuItem onClick={() => navigate('/vpc/dashboard')} isActive={isVpcDashboard} aria-current={isVpcDashboard ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Dashboard size={16} /> Summary</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/vpc/topology')} isActive={isVpcTopology} aria-current={isVpcTopology ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><NetworkOverlay size={16} /> Topology</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/vpc/costs')} isActive={isVpcCosts} aria-current={isVpcCosts ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Currency size={16} /> Cost Analysis</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/vpc/geography')} isActive={isVpcGeography} aria-current={isVpcGeography ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><EarthFilled size={16} /> Geography</span>
        </SideNavMenuItem>

        <SideNavDivider />

        {VPC_CATEGORIES.map((category) => {
          const resources = getVpcResourcesByCategory(category);
          if (resources.length === 0) return null;
          const isAnyActive = resources.some((r) => currentPath === `/vpc/resources/${r.key}`);
          return (
            <SideNavMenu key={category} title={category.replace(/^VPC /, '')} renderIcon={categoryIconMap[category.replace(/^VPC /, '')]} defaultExpanded={isAnyActive}>
              {resources.map((resource) => {
                const isActive = currentPath === `/vpc/resources/${resource.key}`;
                return (
                  <SideNavMenuItem key={resource.key} onClick={() => navigate(`/vpc/resources/${resource.key}`)} isActive={isActive} aria-current={isActive ? 'page' : undefined}>
                    {resource.label}
                  </SideNavMenuItem>
                );
              })}
            </SideNavMenu>
          );
        })}
      </>
    );
  };

  // ── PowerVS nav items ─────────────────────────────────────────
  const renderPowerVsNav = () => {
    const isPvsDashboard = currentPath === '/powervs/dashboard';
    const isPvsTopology = currentPath === '/powervs/topology';
    const isPvsCosts = currentPath === '/powervs/costs';
    const isPvsGeography = currentPath === '/powervs/geography';

    return (
      <>
        <SideNavMenuItem onClick={() => navigate('/powervs/dashboard')} isActive={isPvsDashboard} aria-current={isPvsDashboard ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Dashboard size={16} /> Summary</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/powervs/topology')} isActive={isPvsTopology} aria-current={isPvsTopology ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><NetworkOverlay size={16} /> Topology</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/powervs/costs')} isActive={isPvsCosts} aria-current={isPvsCosts ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Currency size={16} /> Cost Analysis</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/powervs/geography')} isActive={isPvsGeography} aria-current={isPvsGeography ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><EarthFilled size={16} /> Geography</span>
        </SideNavMenuItem>

        <SideNavDivider />

        {POWERVS_CATEGORIES.map((category) => {
          const resources = getPowerVsResourcesByCategory(category);
          if (resources.length === 0) return null;
          const isAnyActive = resources.some((r) => currentPath === `/powervs/resources/${r.key}`);
          return (
            <SideNavMenu key={category} title={category.replace(/^PowerVS /, '')} renderIcon={categoryIconMap[category.replace(/^PowerVS /, '')]} defaultExpanded={isAnyActive}>
              {resources.map((resource) => {
                const isActive = currentPath === `/powervs/resources/${resource.key}`;
                return (
                  <SideNavMenuItem key={resource.key} onClick={() => navigate(`/powervs/resources/${resource.key}`)} isActive={isActive} aria-current={isActive ? 'page' : undefined}>
                    {resource.label}
                  </SideNavMenuItem>
                );
              })}
            </SideNavMenu>
          );
        })}
      </>
    );
  };

  // ── Platform Services nav items ──────────────────────────────
  const renderPlatformNav = () => {
    const isPlatformDashboard = currentPath === '/platform/dashboard';

    return (
      <>
        <SideNavMenuItem onClick={() => navigate('/platform/dashboard')} isActive={isPlatformDashboard} aria-current={isPlatformDashboard ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Dashboard size={16} /> Summary</span>
        </SideNavMenuItem>

        <SideNavDivider />

        {PLATFORM_RESOURCE_TYPES.map((resource) => {
          const isActive = currentPath === `/platform/resources/${resource.key}`;
          return (
            <SideNavMenuItem key={resource.key} onClick={() => navigate(`/platform/resources/${resource.key}`)} isActive={isActive} aria-current={isActive ? 'page' : undefined}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DataBase size={16} /> {resource.label}</span>
            </SideNavMenuItem>
          );
        })}
      </>
    );
  };

  const isExport = currentPath === '/export';
  const isDocs = currentPath === '/docs';
  const isSettings = currentPath === '/settings';

  const selectedIndex = availableDomains.indexOf(activeDomain);

  return (
    <CarbonSideNav
      aria-label="Side navigation"
      expanded={sideNavExpanded}
      isPersistent
    >
      <SideNavItems>
        {availableDomains.length > 1 && (
          <li style={{ padding: '0.75rem 1rem', listStyle: 'none' }}>
            <ContentSwitcher
              selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
              onChange={(e) => {
                const idx = (e as { index?: number }).index;
                if (idx == null) return;
                const domain = availableDomains[idx];
                if (domain) handleDomainSwitch(domain);
              }}
              size="sm"
            >
              {availableDomains.map((domain) => (
                <Switch key={domain} name={domain} text={domainLabels[domain]} />
              ))}
            </ContentSwitcher>
          </li>
        )}

        {activeDomain === 'classic' && renderClassicNav()}
        {activeDomain === 'vpc' && renderVpcNav()}
        {activeDomain === 'powervs' && renderPowerVsNav()}
        {activeDomain === 'platform' && renderPlatformNav()}

        <SideNavDivider />

        <SideNavMenuItem onClick={() => navigate('/export')} isActive={isExport} aria-current={isExport ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DocumentExport size={16} /> Export</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/docs')} isActive={isDocs} aria-current={isDocs ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Document size={16} /> Documentation</span>
        </SideNavMenuItem>
        <SideNavMenuItem onClick={() => navigate('/settings')} isActive={isSettings} aria-current={isSettings ? 'page' : undefined}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={16} /> Settings</span>
        </SideNavMenuItem>
      </SideNavItems>
    </CarbonSideNav>
  );
};

export default AppSideNav;
