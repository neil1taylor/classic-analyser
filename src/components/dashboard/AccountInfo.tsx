import React from 'react';
import { Tile } from '@carbon/react';
import { useAuth } from '@/contexts/AuthContext';

const AccountInfo: React.FC = () => {
  const { accountInfo, infrastructureMode } = useAuth();

  if (!accountInfo) return null;

  const hasIbmCloud = accountInfo.ibmCloudAccountId || accountInfo.ibmCloudAccountName;
  const hasClassic = infrastructureMode?.includes('classic');

  return (
    <Tile style={{ marginBottom: '1rem' }}>
      {hasIbmCloud && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: hasClassic ? '0.75rem' : 0 }}>
          {accountInfo.ibmCloudAccountName && (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                IBM Cloud Account
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                {accountInfo.ibmCloudAccountName}
              </p>
            </div>
          )}
          {accountInfo.ibmCloudAccountId && (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
                IBM Cloud Account ID
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                {accountInfo.ibmCloudAccountId}
              </p>
            </div>
          )}
        </div>
      )}
      {hasClassic && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
              {hasIbmCloud ? 'Classic Account Name' : 'Account Name'}
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {accountInfo.companyName}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
              {hasIbmCloud ? 'Classic Account ID' : 'Account ID'}
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {accountInfo.id}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginBottom: '0.25rem' }}>
              Owner
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
              {accountInfo.firstName} {accountInfo.lastName} ({accountInfo.email})
            </p>
          </div>
        </div>
      )}
    </Tile>
  );
};

export default AccountInfo;
