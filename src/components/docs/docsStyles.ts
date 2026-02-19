import React from 'react';

export const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem',
};

export const headingStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: '0.75rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid var(--cds-border-subtle)',
};

export const subHeadingStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  marginBottom: '0.5rem',
  marginTop: '1.25rem',
};

export const paragraphStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  lineHeight: 1.6,
  marginBottom: '0.75rem',
  color: 'var(--cds-text-primary)',
};

export const listStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  lineHeight: 1.8,
  paddingLeft: '1.5rem',
  marginBottom: '0.75rem',
};

export const codeBlockStyle: React.CSSProperties = {
  background: 'var(--cds-layer-01)',
  border: '1px solid var(--cds-border-subtle)',
  borderRadius: '4px',
  padding: '1rem',
  fontSize: '0.8125rem',
  lineHeight: 1.6,
  overflow: 'auto',
  marginBottom: '0.75rem',
  fontFamily: 'var(--cds-code-01-font-family, "IBM Plex Mono", monospace)',
};

export const warningBlockStyle: React.CSSProperties = {
  borderLeft: '4px solid var(--cds-support-warning, #f1c21b)',
  background: 'var(--cds-layer-01)',
  padding: '1rem',
  marginBottom: '0.75rem',
  fontSize: '0.875rem',
  lineHeight: 1.6,
};

export const linkListStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  lineHeight: 2,
  paddingLeft: '1.5rem',
  marginBottom: '0.75rem',
};

export const inlineCodeStyle: React.CSSProperties = {
  background: 'var(--cds-layer-01)',
  padding: '0.125rem 0.375rem',
  borderRadius: '3px',
  fontSize: '0.8125rem',
  fontFamily: 'var(--cds-code-01-font-family, "IBM Plex Mono", monospace)',
};
