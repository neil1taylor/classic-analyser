export function buildCostPrompt(data: object): string {
  const dataStr = JSON.stringify(data, null, 2);

  return `You are an IBM Cloud cost optimization specialist. Analyze the following cost and resource data to identify savings opportunities.

COST AND RESOURCE DATA:
${dataStr}

Analyze this data and provide:
1. A narrative overview of current spending patterns and optimization opportunities
2. Specific areas where costs can be reduced, with descriptions and estimated savings

You MUST respond with valid JSON only. Do not include any text before or after the JSON. Use this exact structure:
{
  "narrative": "string with cost analysis narrative",
  "savings": [
    {
      "area": "area name (e.g., Compute Right-Sizing, Unused Resources, Reserved Capacity)",
      "description": "detailed description of the savings opportunity",
      "estimatedSaving": "estimated percentage or dollar amount"
    }
  ]
}

Respond with valid JSON only:`;
}
