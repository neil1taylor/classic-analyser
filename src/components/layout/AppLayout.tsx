// Main application layout — serves as the router outlet wrapper
// Wraps all context providers that need router access (UIContext uses useLocation)
import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Theme, ComposedModal, ModalHeader, ModalBody, ModalFooter, Button } from '@carbon/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataProvider, useData } from '@/contexts/DataContext';
import { UIProvider, useUI } from '@/contexts/UIContext';
import { MigrationProvider } from '@/contexts/MigrationContext';
import { VpcDataProvider } from '@/contexts/VpcDataContext';
import { PowerVsDataProvider } from '@/contexts/PowerVsDataContext';
import { AIProvider } from '@/contexts/AIContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GuidedTour } from '@/components/common/GuidedTour';
import { useTour } from '@/hooks/useTour';
import TopNav from './TopNav';
import AppSideNav from '@/components/common/SideNav';
import AIChatPanel from '@/components/ai/AIChatPanel';
import type { InfrastructureDomain } from '@/contexts/AuthContext';

const domainDashboard: Record<InfrastructureDomain, string> = {
  classic: '/dashboard',
  vpc: '/vpc/dashboard',
  powervs: '/powervs/dashboard',
};

const allDomainLabels: Record<InfrastructureDomain, string> = {
  classic: 'Classic Infrastructure',
  vpc: 'VPC Infrastructure',
  powervs: 'Power Virtual Server',
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredMode?: InfrastructureDomain }> = ({ children, requiredMode }) => {
  const { isAuthenticated, infrastructureMode } = useAuth();
  const { dataSource } = useData();

  if (!isAuthenticated && dataSource !== 'imported') {
    return <Navigate to="/" replace />;
  }

  if (requiredMode && dataSource !== 'imported' && infrastructureMode) {
    if (!infrastructureMode.includes(requiredMode)) {
      const fallback = domainDashboard[infrastructureMode[0]] || '/dashboard';
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
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

function getRouteRequirements(pathname: string): { requiresAuth: boolean; requiredMode?: InfrastructureDomain } {
  if (pathname === '/') return { requiresAuth: false };
  if (pathname === '/docs' || pathname === '/help') return { requiresAuth: false };

  if (pathname.startsWith('/vpc/')) return { requiresAuth: true, requiredMode: 'vpc' };
  if (pathname.startsWith('/powervs/')) return { requiresAuth: true, requiredMode: 'powervs' };
  if (pathname === '/settings' || pathname === '/export') return { requiresAuth: true };
  return { requiresAuth: true, requiredMode: 'classic' };
}

function AppLayoutInner() {
  const { isAuthenticated } = useAuth();
  const { theme } = useUI();
  const { dataSource } = useData();
  const location = useLocation();
  const tour = useTour();
  const prevHasAccessRef = React.useRef(false);

  const hasAccess = isAuthenticated || dataSource === 'imported';
  const { requiresAuth, requiredMode } = getRouteRequirements(location.pathname);
  const isAuthRoute = location.pathname === '/';

  // Auto-open guided tour on first successful auth
  React.useEffect(() => {
    if (hasAccess && !prevHasAccessRef.current && !tour.state.completed) {
      tour.openTour();
    }
    prevHasAccessRef.current = hasAccess;
  }, [hasAccess, tour]);

  return (
    <Theme theme={theme}>
      <TopNav />
      <GuidedTour tour={tour} />
      <ErrorBoundary>
        {isAuthRoute ? (
          hasAccess ? <RootRedirect /> : <div className="app-layout--no-nav"><Outlet /></div>
        ) : requiresAuth ? (
          <ProtectedRoute requiredMode={requiredMode}>
            <div className="app-layout">
              <AppSideNav />
              <div className="app-layout__content">
                <Outlet />
              </div>
              <AIChatPanel />
            </div>
          </ProtectedRoute>
        ) : (
          hasAccess ? (
            <div className="app-layout">
              <AppSideNav />
              <div className="app-layout__content">
                <Outlet />
              </div>
              <AIChatPanel />
            </div>
          ) : (
            <div className="app-layout--no-nav">
              <Outlet />
            </div>
          )
        )}
      </ErrorBoundary>
    </Theme>
  );
}

// AppLayout wraps all context providers that need router access
export function AppLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <VpcDataProvider>
          <PowerVsDataProvider>
            <MigrationProvider>
              <AIProvider>
                <UIProvider>
                  <AppLayoutInner />
                </UIProvider>
              </AIProvider>
            </MigrationProvider>
          </PowerVsDataProvider>
        </VpcDataProvider>
      </DataProvider>
    </AuthProvider>
  );
}
