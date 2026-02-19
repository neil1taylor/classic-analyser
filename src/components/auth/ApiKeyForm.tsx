import React, { useState } from 'react';
import {
  Tile,
  TextInput,
  Button,
  InlineLoading,
  InlineNotification,
  Link,
} from '@carbon/react';
import { Login, ViewFilled, ViewOffFilled } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ImportButton from '@/components/auth/ImportButton';

const ApiKeyForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter an API key.');
      return;
    }
    setError(null);
    setIsValidating(true);
    try {
      await login(apiKey.trim());
      // Redirect is handled by RootRedirect in App.tsx once isAuthenticated becomes true
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; statusText?: string; data?: { message?: string } } };
      if (axiosErr.response) {
        const { status, statusText, data } = axiosErr.response;
        const statusLabel = status && statusText ? `${status} (${statusText})` : status ? String(status) : '';
        const detail = data?.message || 'Unable to validate API key.';
        setError(statusLabel ? `${statusLabel}: ${detail}` : detail);
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to validate API key. Please check your key and try again.');
      } else {
        setError('Failed to validate API key. Please check your key and try again.');
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 48px)',
        padding: '2rem',
      }}
    >
      <Tile style={{ maxWidth: '600px', width: '100%', padding: '2rem' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          IBM Cloud Infrastructure Explorer
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--cds-text-secondary)',
            marginBottom: '2rem',
            lineHeight: 1.5,
          }}
        >
          Enter your IBM Cloud API key to explore your Classic and VPC
          Infrastructure resources. The key is stored in browser memory only
          and is never persisted to disk.
        </p>

        {error && (
          <InlineNotification
            kind="error"
            title="Authentication failed"
            subtitle={error}
            lowContrast
            hideCloseButton={false}
            onClose={() => setError(null)}
            style={{ marginBottom: '1rem' }}
          />
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <TextInput
              id="api-key-input"
              labelText="IBM Cloud API Key"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              disabled={isValidating}
              autoComplete="off"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '2rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--cds-icon-secondary)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showPassword ? <ViewOffFilled size={16} /> : <ViewFilled size={16} />}
            </button>
          </div>

          {isValidating ? (
            <InlineLoading
              description="Validating API key..."
              status="active"
            />
          ) : (
            <Button
              type="submit"
              kind="primary"
              renderIcon={Login}
              disabled={!apiKey.trim()}
            >
              Connect
            </Button>
          )}
        </form>

        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--cds-border-subtle)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--cds-border-subtle)' }} />
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <ImportButton />
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--cds-border-subtle)',
          }}
        >
          <Link
            size="sm"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/docs')}
          >
            Get Started
          </Link>
        </div>

        <p
          style={{
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: 'var(--cds-text-secondary)',
            textAlign: 'center',
          }}
        >
          v1.0.0
        </p>
      </Tile>
    </div>
  );
};

export default ApiKeyForm;
