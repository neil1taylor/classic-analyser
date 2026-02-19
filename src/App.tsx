import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Theme, ComposedModal, ModalHeader, ModalBody, ModalFooter, Button } from '@carbon/react';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useData } from '@/contexts/DataContext';
import AppHeader from '@/components/common/Header';
import AppSideNav from '@/components/common/SideNav';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import ResourcePage from '@/pages/ResourcePage';
import TopologyPage from '@/pages/TopologyPage';
import CostsPage from '@/pages/CostsPage';
import GeographyPage from '@/pages/GeographyPage';
import MigrationPage from '@/pages/MigrationPage';
import RoutesPage from '@/pages/RoutesPage';
import DocsHub from '@/components/docs/DocsHub';
import VpcDashboardPage from '@/pages/VpcDashboardPage';
import VpcResourcePage from '@/pages/VpcResourcePage';
import VpcTopologyPage from '@/pages/VpcTopologyPage';
import VpcCostsPage from '@/pages/VpcCostsPage';
import VpcGeographyPage from '@/pages/VpcGeographyPage';
import PowerVsDashboardPage from '@/pages/PowerVsDashboardPage';
import PowerVsResourcePage from '@/pages/PowerVsResourcePage';
import PowerVsTopologyPage from '@/pages/PowerVsTopologyPage';
import PowerVsCostsPage from '@/pages/PowerVsCostsPage';
import PowerVsGeographyPage from '@/pages/PowerVsGeographyPage';
import SettingsPage from '@/pages/SettingsPage';
import AIChatPanel from '@/components/ai/AIChatPanel';

import type { InfrastructureDomain } from '@/contexts/AuthContext';

const domainDashboard: Record<InfrastructureDomain, string> = {
  classic: '/dashboard',
  vpc: '/vpc/dashboard',
  powervs: '/powervs/dashboard',
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredMode?: InfrastructureDomain }> = ({ children, requiredMode }) => {
  const { isAuthenticated, infrastructureMode } = useAuth();
  const { dataSource } = useData();

  if (!isAuthenticated && dataSource !== 'imported') {
    return <Navigate to="/" replace />;
  }

  // Mode-based redirects (skip for imported data)
  if (requiredMode && dataSource !== 'imported' && infrastructureMode) {
    if (!infrastructureMode.includes(requiredMode)) {
      const fallback = domainDashboard[infrastructureMode[0]] || '/dashboard';
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
};

const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-layout">
      <AppSideNav />
      <div className="app-layout__content">
        {children}
      </div>
      <AIChatPanel />
    </div>
  );
};

const allDomainLabels: Record<InfrastructureDomain, string> = {
  classic: 'Classic Infrastructure',
  vpc: 'VPC Infrastructure',
  powervs: 'Power Virtual Server',
};

const RootRedirect: React.FC = () => {
  const { infrastructureMode } = useAuth();
  const navigate = useNavigate();

  const hasClassic = infrastructureMode?.includes('classic');
  const allDomains: InfrastructureDomain[] = ['classic', 'vpc', 'powervs'];
  const missingDomains = allDomains.filter((d) => !infrastructureMode?.includes(d));
  const showLimitedModal = !hasClassic && missingDomains.length > 0;
  const [showModal, setShowModal] = useState(showLimitedModal);

  const firstDashboard = infrastructureMode?.length
    ? domainDashboard[infrastructureMode[0]]
    : '/dashboard';

  if (!showModal) {
    return <Navigate to={firstDashboard} replace />;
  }

  const handleAcknowledge = () => {
    setShowModal(false);
    navigate(firstDashboard, { replace: true });
  };

  return (
    <ComposedModal open onClose={handleAcknowledge} size="sm">
      <ModalHeader title="Limited Access" />
      <ModalBody>
        <p style={{ marginBottom: '1rem' }}>
          Your API key has access to: <strong>{infrastructureMode?.map((d) => allDomainLabels[d]).join(', ')}</strong>.
        </p>
        {missingDomains.length > 0 && (
          <>
            <p style={{ marginBottom: '0.5rem' }}>
              The following are not available with this key:
            </p>
            <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem' }}>
              {missingDomains.map((d) => (
                <li key={d}>{allDomainLabels[d]}</li>
              ))}
            </ul>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="primary" onClick={handleAcknowledge}>
          Continue to {allDomainLabels[infrastructureMode?.[0] || 'classic']} Dashboard
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { theme } = useUI();
  const { dataSource } = useData();

  const hasAccess = isAuthenticated || dataSource === 'imported';

  return (
    <Theme theme={theme}>
      <AppHeader />
      <Routes>
        <Route
          path="/"
          element={
            hasAccess ? <RootRedirect /> : <div className="app-layout--no-nav"><AuthPage /></div>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredMode="classic">
              <AuthenticatedLayout>
                <DashboardPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources/:type"
          element={
            <ProtectedRoute requiredMode="classic">
              <AuthenticatedLayout>
                <ResourcePage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/topology"
          element={
            <ProtectedRoute requiredMode="classic">
              <AuthenticatedLayout>
                <TopologyPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/costs"
          element={
            <ProtectedRoute requiredMode="classic">
              <AuthenticatedLayout>
                <CostsPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/geography"
          element={
            <ProtectedRoute requiredMode="classic">
              <AuthenticatedLayout>
                <GeographyPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/migration"
          element={
            <ProtectedRoute requiredMode="classic">
              <AuthenticatedLayout>
                <MigrationPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/routes"
          element={
            <ProtectedRoute requiredMode="classic">
              <AuthenticatedLayout>
                <RoutesPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vpc/dashboard"
          element={
            <ProtectedRoute requiredMode="vpc">
              <AuthenticatedLayout>
                <VpcDashboardPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vpc/resources/:type"
          element={
            <ProtectedRoute requiredMode="vpc">
              <AuthenticatedLayout>
                <VpcResourcePage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vpc/topology"
          element={
            <ProtectedRoute requiredMode="vpc">
              <AuthenticatedLayout>
                <VpcTopologyPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vpc/costs"
          element={
            <ProtectedRoute requiredMode="vpc">
              <AuthenticatedLayout>
                <VpcCostsPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vpc/geography"
          element={
            <ProtectedRoute requiredMode="vpc">
              <AuthenticatedLayout>
                <VpcGeographyPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/powervs/dashboard"
          element={
            <ProtectedRoute requiredMode="powervs">
              <AuthenticatedLayout>
                <PowerVsDashboardPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/powervs/resources/:type"
          element={
            <ProtectedRoute requiredMode="powervs">
              <AuthenticatedLayout>
                <PowerVsResourcePage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/powervs/topology"
          element={
            <ProtectedRoute requiredMode="powervs">
              <AuthenticatedLayout>
                <PowerVsTopologyPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/powervs/costs"
          element={
            <ProtectedRoute requiredMode="powervs">
              <AuthenticatedLayout>
                <PowerVsCostsPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/powervs/geography"
          element={
            <ProtectedRoute requiredMode="powervs">
              <AuthenticatedLayout>
                <PowerVsGeographyPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={<Navigate to="/docs" replace />}
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <SettingsPage />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/docs"
          element={
            hasAccess ? (
              <AuthenticatedLayout>
                <DocsHub />
              </AuthenticatedLayout>
            ) : (
              <div className="app-layout--no-nav">
                <DocsHub />
              </div>
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Theme>
  );
};

export default App;
