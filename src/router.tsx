// Application router configuration with lazy loading for code splitting
/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import AuthPage from '@/pages/AuthPage';

// Detects chunk load failures (stale deploys, missing hashed assets)
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    (msg.includes('failed to fetch') && error.name === 'TypeError')
  );
}

// Wraps React.lazy() to auto-reload once on chunk load failure
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    importFn().catch((error: unknown) => {
      if (isChunkLoadError(error) && !sessionStorage.getItem('chunk-failed')) {
        sessionStorage.setItem('chunk-failed', '1');
        window.location.reload();
        return { default: (() => null) as unknown as React.ComponentType };
      }
      sessionStorage.removeItem('chunk-failed');
      throw error;
    })
  );
}

// Suspense wrapper for lazy-loaded pages
export function PageLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSkeleton type="page" />}>
      {children}
    </Suspense>
  );
}

// Eagerly load auth page for immediate render
// Lazy load all other pages for code splitting (with retry on stale chunks)
const DashboardPage = lazyWithRetry(() => import('@/pages/DashboardPage'));
const ResourcePage = lazyWithRetry(() => import('@/pages/ResourcePage'));
const TopologyPage = lazyWithRetry(() => import('@/pages/TopologyPage'));
const CostsPage = lazyWithRetry(() => import('@/pages/CostsPage'));
const GeographyPage = lazyWithRetry(() => import('@/pages/GeographyPage'));
const MigrationPage = lazyWithRetry(() => import('@/pages/MigrationPage'));
const VSIProfileGuidePage = lazyWithRetry(() => import('@/pages/VSIProfileGuidePage'));
const RoutesPage = lazyWithRetry(() => import('@/pages/RoutesPage'));
const VpcDashboardPage = lazyWithRetry(() => import('@/pages/VpcDashboardPage'));
const VpcResourcePage = lazyWithRetry(() => import('@/pages/VpcResourcePage'));
const VpcTopologyPage = lazyWithRetry(() => import('@/pages/VpcTopologyPage'));
const VpcCostsPage = lazyWithRetry(() => import('@/pages/VpcCostsPage'));
const VpcGeographyPage = lazyWithRetry(() => import('@/pages/VpcGeographyPage'));
const PowerVsDashboardPage = lazyWithRetry(() => import('@/pages/PowerVsDashboardPage'));
const PowerVsResourcePage = lazyWithRetry(() => import('@/pages/PowerVsResourcePage'));
const PowerVsTopologyPage = lazyWithRetry(() => import('@/pages/PowerVsTopologyPage'));
const PowerVsCostsPage = lazyWithRetry(() => import('@/pages/PowerVsCostsPage'));
const PowerVsGeographyPage = lazyWithRetry(() => import('@/pages/PowerVsGeographyPage'));
const PlatformDashboardPage = lazyWithRetry(() => import('@/pages/PlatformDashboardPage'));
const PlatformResourcePage = lazyWithRetry(() => import('@/pages/PlatformResourcePage'));
const ExportPage = lazyWithRetry(() => import('@/pages/ExportPage'));
const SettingsPage = lazyWithRetry(() => import('@/pages/SettingsPage'));
const DocsHub = lazyWithRetry(() => import('@/components/docs/DocsHub'));
const AboutPage = lazyWithRetry(() => import('@/pages/AboutPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <AuthPage />,
      },
      // Classic routes
      { path: 'dashboard', element: <PageLoader><DashboardPage /></PageLoader> },
      { path: 'resources/:type', element: <PageLoader><ResourcePage /></PageLoader> },
      { path: 'topology', element: <PageLoader><TopologyPage /></PageLoader> },
      { path: 'costs', element: <PageLoader><CostsPage /></PageLoader> },
      { path: 'geography', element: <PageLoader><GeographyPage /></PageLoader> },
      { path: 'migration', element: <PageLoader><MigrationPage /></PageLoader> },
      { path: 'migration/vsi-profile-guide', element: <PageLoader><VSIProfileGuidePage /></PageLoader> },
      { path: 'routes', element: <PageLoader><RoutesPage /></PageLoader> },
      // VPC routes
      { path: 'vpc/dashboard', element: <PageLoader><VpcDashboardPage /></PageLoader> },
      { path: 'vpc/resources/:type', element: <PageLoader><VpcResourcePage /></PageLoader> },
      { path: 'vpc/topology', element: <PageLoader><VpcTopologyPage /></PageLoader> },
      { path: 'vpc/costs', element: <PageLoader><VpcCostsPage /></PageLoader> },
      { path: 'vpc/geography', element: <PageLoader><VpcGeographyPage /></PageLoader> },
      // PowerVS routes
      { path: 'powervs/dashboard', element: <PageLoader><PowerVsDashboardPage /></PageLoader> },
      { path: 'powervs/resources/:type', element: <PageLoader><PowerVsResourcePage /></PageLoader> },
      { path: 'powervs/topology', element: <PageLoader><PowerVsTopologyPage /></PageLoader> },
      { path: 'powervs/costs', element: <PageLoader><PowerVsCostsPage /></PageLoader> },
      { path: 'powervs/geography', element: <PageLoader><PowerVsGeographyPage /></PageLoader> },
      // Platform Services routes
      { path: 'platform/dashboard', element: <PageLoader><PlatformDashboardPage /></PageLoader> },
      { path: 'platform/resources/:type', element: <PageLoader><PlatformResourcePage /></PageLoader> },
      // Shared routes
      { path: 'export', element: <PageLoader><ExportPage /></PageLoader> },
      { path: 'settings', element: <PageLoader><SettingsPage /></PageLoader> },
      { path: 'about', element: <PageLoader><AboutPage /></PageLoader> },
      { path: 'docs', element: <PageLoader><DocsHub /></PageLoader> },
      { path: 'help', element: <Navigate to="/docs" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
