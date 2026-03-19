import React, { useState, useEffect } from 'react';
import {
  TextInput,
  Button,
  Toggle,
  Tooltip,
  InlineNotification,
  Loading,
} from '@carbon/react';
import { ConnectionSignal, Checkmark } from '@carbon/icons-react';
import { useAI } from '@/contexts/AIContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAISettings } from '@/hooks/useAISettings';
import { testConnection } from '@/services/ai/aiProxyClient';
import '@/styles/settings.scss';

const SettingsPanel: React.FC = () => {
  // AI Configuration
  const { isAvailable, refreshAvailability } = useAI();
  const { accountInfo } = useAuth();
  const { aiSettings, setAISettings } = useAISettings(
    accountInfo?.id?.toString(),
    accountInfo?.companyName,
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Report Branding (not account-scoped, keep raw localStorage)
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authorName, setAuthorName] = useState('');

  // Load branding from localStorage
  useEffect(() => {
    setClientName(localStorage.getItem('report_client_name') || '');
    setCompanyName(localStorage.getItem('report_company_name') || '');
    setAuthorName(localStorage.getItem('report_author_name') || '');
  }, []);

  const aiEnabled = aiSettings.enableInsights || aiSettings.enableChat || aiSettings.enableCostOptimization || aiSettings.enableReportEnhancement;

  const handleToggle = async (checked: boolean) => {
    setAISettings({
      enableInsights: checked,
      enableCostOptimization: checked,
      enableReportEnhancement: checked,
      enableChat: checked,
    });
    localStorage.setItem('ai_enabled', String(checked));
    setTestResult(null);
    await refreshAvailability();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testConnection();
      setTestResult(ok ? 'success' : 'error');
      if (ok) {
        await refreshAvailability();
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const saveBrandingSettings = () => {
    localStorage.setItem('report_client_name', clientName);
    localStorage.setItem('report_company_name', companyName);
    localStorage.setItem('report_author_name', authorName);
  };

  return (
    <div className="settings-panel">
      <h2 className="settings-panel__title">Settings</h2>

      {/* AI Configuration */}
      <section className="settings-panel__section">
        <h3 className="settings-panel__section-title">AI Configuration (watsonx.ai)</h3>
        <p className="settings-panel__section-desc">
          Enable or disable AI-powered insights, chat, and report narratives.
          AI features are optional and degrade gracefully when unavailable.
        </p>

        <div className="settings-panel__field">
          <Tooltip label="Enable AI-powered chat, migration insights, cost optimisation, and report narratives via watsonx.ai." align="bottom">
            <div>
              <Toggle
                id="ai-enabled"
                labelText="Enable AI Features"
                toggled={aiEnabled}
                onToggle={handleToggle}
                labelA="Disabled"
                labelB="Enabled"
              />
            </div>
          </Tooltip>
        </div>

        <div className="settings-panel__actions">
          <Button
            kind="tertiary"
            size="sm"
            renderIcon={testing ? undefined : ConnectionSignal}
            onClick={handleTestConnection}
            disabled={!aiEnabled || testing}
          >
            {testing ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loading withOverlay={false} small />
                Testing...
              </span>
            ) : (
              'Test Connection'
            )}
          </Button>
        </div>

        {testResult === 'success' && (
          <InlineNotification
            kind="success"
            title="Connected"
            subtitle="AI proxy is reachable and healthy."
            lowContrast
            hideCloseButton
            style={{ marginTop: '1rem' }}
          />
        )}
        {testResult === 'error' && (
          <InlineNotification
            kind="error"
            title="Connection Failed"
            subtitle="Could not reach the AI proxy. Check that the proxy is configured."
            lowContrast
            hideCloseButton
            style={{ marginTop: '1rem' }}
          />
        )}
        {isAvailable && testResult === null && (
          <div className="settings-panel__status">
            <Checkmark size={16} />
            <span>AI proxy connected</span>
          </div>
        )}
      </section>

      {/* Report Branding */}
      <section className="settings-panel__section">
        <h3 className="settings-panel__section-title">Report Branding</h3>
        <p className="settings-panel__section-desc">
          Customize the branding that appears on generated DOCX reports.
        </p>

        <div className="settings-panel__field">
          <TextInput
            id="client-name"
            labelText="Client Name"
            placeholder="Client organization name"
            value={clientName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientName(e.target.value)}
          />
        </div>

        <div className="settings-panel__field">
          <TextInput
            id="company-name"
            labelText="Company Name"
            placeholder="Your company name"
            value={companyName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
          />
        </div>

        <div className="settings-panel__field">
          <TextInput
            id="author-name"
            labelText="Report Author"
            placeholder="Author name"
            value={authorName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthorName(e.target.value)}
          />
        </div>

        <div className="settings-panel__actions">
          <Button
            kind="primary"
            size="sm"
            onClick={saveBrandingSettings}
          >
            Save Branding
          </Button>
        </div>
      </section>
    </div>
  );
};

export default SettingsPanel;
