import React from 'react';
import {
  sectionStyle,
  headingStyle,
  paragraphStyle,
  listStyle,
} from '../docsStyles';

const SecuritySection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      Security &amp; Privacy
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      How your API key and data are protected
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>API Key Handling</h3>
      <ul style={listStyle}>
        <li>API key stored only in React Context (browser memory) &mdash; never localStorage, disk, or logs.</li>
        <li>Every request sends the key via <code>X-API-Key</code> header; the server uses it for that request then discards it.</li>
        <li>No server-side sessions, no sticky sessions, no database.</li>
        <li>60-minute inactivity timeout clears the key automatically.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>API Authentication</h3>
      <ul style={listStyle}>
        <li><strong>Classic (SoftLayer):</strong> HTTP Basic authentication (<code>apikey:&lt;key&gt;</code> base64-encoded in the Authorization header).</li>
        <li><strong>VPC:</strong> IAM Bearer token exchanged from the same API key via the IAM token endpoint.</li>
        <li>All API calls are proxied through the Express.js backend to avoid CORS issues &mdash; the browser never calls IBM Cloud APIs directly.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Disk Utilization Credentials</h3>
      <p style={paragraphStyle}>
        When the opt-in Disk Utilization feature is enabled, OS credentials are fetched from the
        SoftLayer API (<code>operatingSystem.passwords</code>) to SSH into servers. These credentials
        follow the same strict security model as API keys:
      </p>
      <ul style={listStyle}>
        <li>Fetched transiently during Phase 5 collection only, then immediately discarded.</li>
        <li>Never sent to the browser &mdash; only the resulting utilization data (percentages, sizes) reaches the frontend.</li>
        <li>Never included in XLSX exports.</li>
        <li>Never written to logs &mdash; <code>passwords</code> is in the server&apos;s sensitive-key redaction list.</li>
        <li>Defense-in-depth: <code>operatingSystem.passwords</code> is explicitly deleted from all resource objects before SSE transmission.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Log Sanitization</h3>
      <p style={paragraphStyle}>
        All server-side logging uses Winston with custom formatters that strip API keys,
        tokens, and Authorization headers from log output. Browser-side logging uses a
        namespaced logger (<code>[ClassicExplorer:*]</code>) that never outputs credentials.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Security Headers</h3>
      <p style={paragraphStyle}>
        The Express.js backend uses Helmet to set standard security headers including
        Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, and
        Strict-Transport-Security.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Data Privacy</h3>
      <ul style={listStyle}>
        <li>No infrastructure data is persisted on the server. All collected data lives in browser memory (React state).</li>
        <li>Closing the browser tab or the 60-minute timeout discards all data.</li>
        <li>XLSX exports are generated client-side using ExcelJS &mdash; data never passes through the server for export.</li>
        <li>The application is read-only &mdash; it never creates, modifies, or deletes any cloud resources.</li>
      </ul>
    </section>
  </div>
);

export default SecuritySection;
