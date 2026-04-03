import React, { useState, useRef, useEffect } from 'react';
import {
  Header as CarbonHeader,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from '@carbon/react';
import { UserAvatar, Logout, Light, Asleep, Information, Help, Chat, Settings } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { useAI } from '@/contexts/AIContext';

const AppHeader: React.FC = () => {
  const { isAuthenticated, accountInfo, logout } = useAuth();
  const { theme, toggleTheme, toggleChatPanel } = useUI();
  const { isConfigured } = useAI();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDisconnect = () => {
    setMenuOpen(false);
    logout();
  };

  return (
    <>
      <CarbonHeader aria-label="IBM Cloud Infrastructure Explorer">
        <HeaderName href={isAuthenticated ? '#/dashboard' : '#/'} prefix="IBM Cloud">
          Infrastructure Explorer
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label={theme === 'white' ? 'Switch to dark theme' : 'Switch to light theme'}
            onClick={toggleTheme}
          >
            {theme === 'white' ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>

          {isConfigured && (
            <HeaderGlobalAction
              aria-label="AI Chat"
              onClick={toggleChatPanel}
            >
              <Chat size={20} />
            </HeaderGlobalAction>
          )}

          <HeaderGlobalAction
            aria-label="Settings"
            onClick={() => navigate('/settings')}
          >
            <Settings size={20} />
          </HeaderGlobalAction>

          <HeaderGlobalAction
            aria-label="Help"
            onClick={() => navigate('/docs')}
          >
            <Help size={20} />
          </HeaderGlobalAction>

          <HeaderGlobalAction
            aria-label="About"
            onClick={() => navigate('/about')}
          >
            <Information size={20} />
          </HeaderGlobalAction>

          {accountInfo && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <HeaderGlobalAction
                aria-label="Account"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <UserAvatar size={20} />
              </HeaderGlobalAction>
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    background: 'var(--cds-layer)',
                    border: '1px solid var(--cds-border-subtle)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    zIndex: 9000,
                    minWidth: '240px',
                    padding: '1rem',
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>
                    {accountInfo.companyName}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                    Account #{accountInfo.id}
                  </p>
                  <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                    {accountInfo.email}
                  </p>
                  <button
                    onClick={handleDisconnect}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--cds-link-primary)',
                      cursor: 'pointer',
                      padding: '0.5rem 0',
                      fontSize: '0.875rem',
                      width: '100%',
                    }}
                  >
                    <Logout size={16} />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </HeaderGlobalBar>
      </CarbonHeader>

    </>
  );
};

export default AppHeader;
