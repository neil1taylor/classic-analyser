import React from 'react';
import {
  sectionStyle,
  headingStyle,
  subHeadingStyle,
  paragraphStyle,
  listStyle,
  warningBlockStyle,
} from '../docsStyles';

const AIFeaturesSection: React.FC = () => (
  <div>
    <h2 style={{ ...headingStyle, borderBottom: 'none', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
      AI Features
    </h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary)', marginBottom: '2rem' }}>
      AI-powered chat, insights, cost optimization, and report narratives via IBM watsonx.ai
    </p>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Overview</h3>
      <p style={paragraphStyle}>
        The application integrates with IBM watsonx.ai (via an AI proxy service) to provide
        intelligent analysis of your infrastructure data. AI features are optional and must be
        enabled in Settings.
      </p>
      <div style={warningBlockStyle}>
        <strong>Note:</strong> AI features require a configured AI proxy service. Enable AI in{' '}
        <strong>Settings &gt; AI Configuration</strong> and test the connection before using
        these features.
      </div>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Chat Assistant</h3>
      <p style={paragraphStyle}>
        The AI chat panel is accessible from the header bar (chat icon) when AI is enabled.
        It provides a conversational interface for asking questions about your infrastructure.
      </p>
      <ul style={listStyle}>
        <li><strong>Infrastructure queries:</strong> Ask about your collected resources, configurations, and relationships.</li>
        <li><strong>Context-aware:</strong> The assistant has access to your collected Classic and VPC data for accurate answers.</li>
        <li><strong>Migration advice:</strong> Get suggestions for migration planning and best practices.</li>
        <li><strong>Clear chat:</strong> Reset the conversation history at any time.</li>
      </ul>

      <h4 style={subHeadingStyle}>Usage Tips</h4>
      <ul style={listStyle}>
        <li>Collect data before starting a chat so the assistant has context.</li>
        <li>Be specific in your questions for the best results.</li>
        <li>Press Enter to send a message, Shift+Enter for a new line.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Migration Insights</h3>
      <p style={paragraphStyle}>
        In the Migration Analysis view, click <strong>Generate AI Insights</strong> to receive:
      </p>
      <ul style={listStyle}>
        <li><strong>Executive summary:</strong> A natural-language overview of your migration readiness.</li>
        <li><strong>Key risks:</strong> Identified risks with severity levels (low, medium, high, critical) and descriptions.</li>
        <li><strong>Recommendations:</strong> Actionable steps to improve migration readiness and reduce risk.</li>
      </ul>
      <p style={paragraphStyle}>
        Insights are generated from your migration analysis results, so run the analysis before
        requesting AI insights.
      </p>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Cost Optimization</h3>
      <p style={paragraphStyle}>
        In the Cost Analysis view, the AI can generate cost optimization suggestions:
      </p>
      <ul style={listStyle}>
        <li><strong>Narrative analysis:</strong> Plain-language explanation of your spending patterns.</li>
        <li><strong>Savings opportunities:</strong> Identified areas where costs could be reduced, grouped by category.</li>
        <li><strong>Estimated savings:</strong> Approximate dollar amounts for each optimization opportunity.</li>
      </ul>
    </section>

    <section style={sectionStyle}>
      <h3 style={headingStyle}>Report Narratives</h3>
      <p style={paragraphStyle}>
        When generating DOCX migration reports, the AI can produce natural-language narrative
        sections for each part of the report. Sections include executive summary, environment
        overview, migration readiness, compute/network/storage/security assessments, cost analysis,
        and recommendations.
      </p>
      <p style={paragraphStyle}>
        AI-generated content is clearly marked with a disclaimer noting it was produced by
        IBM watsonx.ai and should be reviewed for accuracy.
      </p>
    </section>
  </div>
);

export default AIFeaturesSection;
