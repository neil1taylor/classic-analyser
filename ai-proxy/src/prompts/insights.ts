export function buildInsightsPrompt(data: object): string {
  const dataStr = JSON.stringify(data, null, 2);

  return `You are an IBM Cloud infrastructure analyst. Analyze the following infrastructure data and provide migration insights.

DATA:
${dataStr}

Analyze this infrastructure data and provide:
1. An executive summary of the current environment and migration readiness
2. A list of risks with title, severity (critical, high, medium, low), and description
3. A list of actionable recommendations

You MUST respond with valid JSON only. Do not include any text before or after the JSON. Use this exact structure:
{
  "executiveSummary": "string with executive summary",
  "risks": [
    {
      "title": "risk title",
      "severity": "critical|high|medium|low",
      "description": "detailed description"
    }
  ],
  "recommendations": [
    "recommendation 1",
    "recommendation 2"
  ]
}

Respond with valid JSON only:`;
}
