import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { UIProvider } from '@/contexts/UIContext';
import { MigrationProvider } from '@/contexts/MigrationContext';
import { VpcDataProvider } from '@/contexts/VpcDataContext';
import { PowerVsDataProvider } from '@/contexts/PowerVsDataContext';
import { AIProvider } from '@/contexts/AIContext';
import App from '@/App';
import '@/styles/global.scss';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <DataProvider>
          <VpcDataProvider>
            <PowerVsDataProvider>
            <MigrationProvider>
              <AIProvider>
                <UIProvider>
                  <App />
                </UIProvider>
              </AIProvider>
            </MigrationProvider>
            </PowerVsDataProvider>
          </VpcDataProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
