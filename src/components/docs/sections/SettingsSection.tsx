import React from 'react';
import {
  sectionStyle,
  headingStyle,
  paragraphStyle,
  listStyle,
} from '../docsStyles';

const SettingsSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      Settings
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      AI configuration, report branding, and theme preferences
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>AI Configuration</h3>
      <p style={paragraphStyle}>
        The AI Configuration section in Settings controls the connection to the IBM watsonx.ai
        proxy service that powers the AI features (chat, insights, cost optimization, report narratives).
      </p>
      <ul style={listStyle}>
        <li><strong>Enable AI Features:</strong> Toggle to enable or disable all AI-powered features. When disabled, the chat icon is hidden and AI buttons are removed from the migration and cost views.</li>
        <li><strong>Test Connection:</strong> Validates connectivity to the AI proxy service and reports the connection status.</li>
        <li><strong>Status indicator:</strong> Shows whether the AI proxy is connected and healthy.</li>
      </ul>
      <p style={paragraphStyle}>
        The AI enabled/disabled preference is saved to browser localStorage and persists across sessions.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Report Branding</h3>
      <p style={paragraphStyle}>
        Customise the branding that appears in generated DOCX migration reports:
      </p>
      <ul style={listStyle}>
        <li><strong>Client Name:</strong> The client organisation name that appears in the report header and cover page.</li>
        <li><strong>Company Name:</strong> Your company name for the report footer and author attribution.</li>
        <li><strong>Report Author:</strong> The author name displayed on the report cover page.</li>
      </ul>
      <p style={paragraphStyle}>
        Click <strong>Save Branding</strong> to persist these values to browser localStorage.
        They will be pre-filled the next time you generate a report.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Theme</h3>
      <p style={paragraphStyle}>
        Toggle between light and dark themes using the moon/sun icon in the application header.
        The theme applies the IBM Carbon Design System colour tokens for the selected mode.
        The theme preference is applied immediately and persists across sessions.
      </p>
    </section>
  </div>
);

export default SettingsSection;
