# Settings

## AI Configuration

The AI Configuration section controls the connection to an IBM watsonx.ai proxy service that powers the application's AI features.

### Enable AI Features

Toggle the **Enable AI Features** switch to activate or deactivate all AI capabilities. When disabled:

- The chat icon is hidden from the header bar.
- AI-powered buttons (insights, cost optimization, report narratives) are removed from their respective pages.
- No requests are sent to the AI proxy service.

This preference is saved to `localStorage` and persists across browser sessions.

### Test Connection

Click **Test Connection** to validate connectivity to the configured AI proxy service. The status indicator shows:

- **Connected / Healthy** -- the proxy is reachable and responding normally.
- **Disconnected / Error** -- the proxy is unreachable or returned an error. Check the proxy URL and service status.

> **Note:** AI features require a separately deployed and configured AI proxy service. Refer to your deployment documentation for AI proxy setup instructions. The application functions fully without AI features enabled.

---

## AI Features

When AI is enabled, the following capabilities become available:

### Chat Assistant

A conversational interface for querying your infrastructure data. Accessible from the chat icon in the header bar. You can ask questions about your environment, request summaries, or explore resource relationships using natural language.

### Migration Insights

AI-generated analysis available on the Migration Assessment page, including:

- Executive summary of migration readiness
- Risk analysis highlighting potential blockers
- Prioritized recommendations for remediation

### Cost Optimization

Spending pattern analysis available on the Costs page, including:

- Identification of underutilized or over-provisioned resources
- Savings opportunities with estimated dollar amounts
- Rightsizing recommendations based on usage patterns

### Report Narratives

When generating DOCX reports, AI can produce natural-language narrative sections that accompany the data tables. These sections are clearly marked as AI-generated content within the report.

---

## Report Branding

Customize the appearance of exported DOCX reports with your organization's details.

| Field | Where It Appears |
|-------|-----------------|
| **Client Name** | Report header and cover page |
| **Company Name** | Report footer and author attribution |
| **Report Author** | Cover page author name |

Click **Save Branding** to persist these values to `localStorage`. They are applied to all subsequent DOCX report exports.

---

## Theme

Toggle between light and dark mode using the theme icon in the application header. The theme uses IBM Carbon Design System color tokens to ensure consistent styling across all components.

The selected theme persists across browser sessions via `localStorage`.

| Theme | Description |
|-------|-------------|
| **Light** | White and gray backgrounds with dark text (Carbon White / Gray 10) |
| **Dark** | Dark gray backgrounds with light text (Carbon Gray 90 / Gray 100) |
