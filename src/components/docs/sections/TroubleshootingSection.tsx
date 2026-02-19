import React from 'react';
import { Link } from '@carbon/react';
import {
  sectionStyle,
  headingStyle,
  subHeadingStyle,
  paragraphStyle,
  listStyle,
} from '../docsStyles';

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem',
  marginBottom: '1rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  borderBottom: '2px solid var(--cds-border-subtle)',
  fontWeight: 600,
  color: 'var(--cds-text-primary)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid var(--cds-border-subtle)',
  color: 'var(--cds-text-primary)',
  verticalAlign: 'top',
};

const TroubleshootingSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      Troubleshooting
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      Common issues and their solutions
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Common Issues</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Issue</th>
            <th style={thStyle}>Cause</th>
            <th style={thStyle}>Solution</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdStyle}>Authentication fails</td>
            <td style={tdStyle}>Invalid API key or insufficient permissions</td>
            <td style={tdStyle}>
              Verify your key in the{' '}
              <Link href="https://cloud.ibm.com/iam/apikeys" target="_blank" rel="noopener noreferrer" inline>
                IAM console
              </Link>. Ensure VPC Viewer and Classic Infrastructure permissions are assigned.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}>Classic resources return authorization errors</td>
            <td style={tdStyle}>Service ID has limited Classic infrastructure access</td>
            <td style={tdStyle}>
              Switch to a user API key with the &quot;View Only&quot; classic infrastructure permission set.
              Service IDs have limitations with the Classic permission model.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}>Some resource types fail during collection</td>
            <td style={tdStyle}>Missing permissions or service unavailability</td>
            <td style={tdStyle}>
              Failed resources show as warnings on the dashboard. Successfully collected resources
              remain available. Check specific permission requirements for the failed types.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}>Session expired / returned to login</td>
            <td style={tdStyle}>60-minute inactivity timeout</td>
            <td style={tdStyle}>
              Re-enter your API key. Export data before long pauses to avoid data loss.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}>VPC data missing for some regions</td>
            <td style={tdStyle}>Region access not enabled or network issues</td>
            <td style={tdStyle}>
              The collector auto-discovers available regions. If a region is missing, verify your
              account has access to that region in the IBM Cloud console.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}>XLSX import skips worksheets</td>
            <td style={tdStyle}>Worksheet names don&apos;t match expected format</td>
            <td style={tdStyle}>
              Ensure worksheets use the &quot;v&quot;-prefixed names (e.g., &quot;vVirtualServers&quot;).
              Only files exported from this application are supported.
            </td>
          </tr>
          <tr>
            <td style={tdStyle}>AI features unavailable</td>
            <td style={tdStyle}>AI proxy not configured or unreachable</td>
            <td style={tdStyle}>
              Go to Settings &gt; AI Configuration, enable AI features, and click Test Connection.
              The AI proxy service must be running and accessible.
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Diagnostic Steps</h3>

      <h4 style={subHeadingStyle}>Browser Console Logs</h4>
      <p style={paragraphStyle}>
        Open your browser&apos;s Developer Tools (F12) and check the Console tab for detailed
        log messages prefixed with <code>[ClassicExplorer:*]</code>. These logs can help
        diagnose issues with API calls, data collection, import/export, and more.
      </p>

      <h4 style={subHeadingStyle}>Verify API Key Permissions</h4>
      <p style={paragraphStyle}>
        Test your API key outside the application to isolate permission issues:
      </p>
      <ul style={listStyle}>
        <li><strong>IAM token exchange:</strong> POST to <code>https://iam.cloud.ibm.com/identity/token</code> with your API key. A successful response confirms the key is valid.</li>
        <li><strong>Classic API test:</strong> Call <code>SoftLayer_Account/getObject</code> with Basic auth to verify Classic access.</li>
        <li><strong>VPC API test:</strong> Call <code>/v1/regions</code> with the Bearer token to verify VPC access.</li>
      </ul>

      <h4 style={subHeadingStyle}>Network Issues</h4>
      <p style={paragraphStyle}>
        If collection stalls or fails entirely, check that your browser can reach the application&apos;s
        backend. The SSE connection for data collection requires a stable HTTP connection. Corporate
        proxies or firewalls that terminate long-running connections may interfere with the SSE stream.
      </p>
    </section>
  </div>
);

export default TroubleshootingSection;
