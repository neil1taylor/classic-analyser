const sectionPrompts: Record<string, string> = {
  executive_summary: `Write a professional executive summary for an IBM Cloud infrastructure assessment report.
This should provide a high-level overview of the environment, key findings, and strategic recommendations.
The tone should be suitable for C-level executives and senior IT leadership.
Cover the scope of the assessment, overall health of the infrastructure, and priority actions.`,

  environment_overview: `Write a comprehensive environment overview section for an IBM Cloud infrastructure report.
Describe the overall infrastructure landscape including compute, network, storage, and security resources.
Highlight the distribution of resources across data centers and regions.
Present the information in a clear, structured manner suitable for technical stakeholders.`,

  migration_readiness: `Write a migration readiness assessment section for an IBM Cloud Classic to VPC migration report.
Evaluate the current environment's readiness for migration to VPC infrastructure.
Identify dependencies, blockers, and prerequisites that need to be addressed.
Provide a realistic assessment of complexity and effort required.`,

  compute_assessment: `Write a detailed compute assessment section for an IBM Cloud infrastructure report.
Analyze the compute resources including virtual servers, bare metal servers, and their configurations.
Identify utilization patterns, right-sizing opportunities, and modernization candidates.
Include observations about OS distributions, lifecycle status, and capacity planning.`,

  network_assessment: `Write a thorough network assessment section for an IBM Cloud infrastructure report.
Analyze the network topology including VLANs, subnets, firewalls, load balancers, and security groups.
Identify network complexity, redundancy patterns, and potential simplification opportunities.
Highlight any security concerns or architectural improvements.`,

  storage_assessment: `Write a detailed storage assessment section for an IBM Cloud infrastructure report.
Analyze block storage, file storage, and object storage resources.
Evaluate storage tiers, IOPS configurations, capacity utilization, and snapshot policies.
Identify optimization opportunities and data management improvements.`,

  security_assessment: `Write a comprehensive security assessment section for an IBM Cloud infrastructure report.
Evaluate the security posture including firewalls, security groups, SSL certificates, SSH keys, and access controls.
Identify vulnerabilities, compliance gaps, and security best practices that should be implemented.
Prioritize findings by severity and business impact.`,

  cost_analysis: `Write a detailed cost analysis section for an IBM Cloud infrastructure report.
Analyze the current spending patterns across compute, network, storage, and services.
Identify the top cost drivers and areas where optimization is possible.
Provide context for the spending relative to the infrastructure footprint.`,

  recommendations: `Write a prioritized recommendations section for an IBM Cloud infrastructure report.
Provide actionable recommendations organized by priority (immediate, short-term, long-term).
Each recommendation should include the business justification, expected benefit, and implementation complexity.
Focus on practical steps that deliver measurable improvements.`,
};

export function buildReportNarrativePrompt(sectionType: string, data: object): string {
  const dataStr = JSON.stringify(data, null, 2);
  const sectionInstruction = sectionPrompts[sectionType];

  if (!sectionInstruction) {
    throw new Error(
      `Unknown section type: ${sectionType}. Valid types: ${Object.keys(sectionPrompts).join(', ')}`
    );
  }

  return `You are a professional technical writer creating an IBM Cloud infrastructure assessment report.

${sectionInstruction}

INFRASTRUCTURE DATA:
${dataStr}

Write the section content as professional prose suitable for a formal DOCX report.
Use clear paragraphs, not bullet points (unless listing specific items).
Do not use markdown formatting.
Write in third person, professional tone.
Be specific and reference actual data points where available.
The output should be 2-4 paragraphs of well-structured prose.

Section content:`;
}
