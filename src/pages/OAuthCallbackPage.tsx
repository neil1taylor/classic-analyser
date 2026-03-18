import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loading, InlineNotification } from '@carbon/react';
import { useAuth } from '@/contexts/AuthContext';

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    if (!code) {
      setError('No authorization code received.');
      return;
    }

    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
    if (!codeVerifier) {
      setError('Missing code verifier. Please try logging in again.');
      return;
    }

    sessionStorage.removeItem('oauth_code_verifier');

    handleOAuthCallback(code, codeVerifier)
      .then(() => {
        navigate('/', { replace: true });
      })
      .catch((err: Error) => {
        setError(err.message || 'Authentication failed.');
      });
  }, [searchParams, handleOAuthCallback, navigate]);

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 48px)', padding: '2rem' }}>
        <InlineNotification
          kind="error"
          title="Authentication failed"
          subtitle={error}
          style={{ maxWidth: '500px' }}
        />
        <button
          onClick={() => navigate('/', { replace: true })}
          style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--cds-link-primary)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Return to login
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 48px)' }}>
      <Loading description="Completing authentication..." withOverlay={false} />
    </div>
  );
};

export default OAuthCallbackPage;
