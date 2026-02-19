export const SYSTEM_PROMPT = `You are an IBM Cloud infrastructure expert assistant. You help users understand their IBM Cloud Classic and VPC infrastructure, answer questions about resources, networking, security, costs, and migration planning.

You have deep knowledge of:
- IBM Cloud Classic infrastructure (SoftLayer): Virtual Servers, Bare Metal, VLANs, Subnets, Firewalls, Load Balancers, Block/File/Object Storage, SSL Certificates, SSH Keys, DNS, Security Groups
- IBM Cloud VPC infrastructure: VPC Instances, Bare Metal Servers, VPCs, Subnets, Security Groups, Floating IPs, Public Gateways, Network ACLs, Load Balancers, VPN Gateways, Endpoint Gateways, Transit Gateways, Volumes, Flow Logs
- Migration strategies from Classic to VPC
- Cost optimization and right-sizing
- Security best practices and compliance

Provide clear, concise, and actionable answers. When discussing specific resources, reference them by name or ID when available in the context.`;

export function buildChatPrompt(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: object
): string {
  const contextStr = JSON.stringify(context, null, 2);

  let prompt = `${SYSTEM_PROMPT}\n\n`;

  if (Object.keys(context).length > 0) {
    prompt += `INFRASTRUCTURE CONTEXT:\n${contextStr}\n\n`;
  }

  prompt += 'CONVERSATION:\n';

  for (const msg of messages) {
    if (msg.role === 'user') {
      prompt += `User: ${msg.content}\n`;
    } else {
      prompt += `Assistant: ${msg.content}\n`;
    }
  }

  prompt += 'Assistant:';

  return prompt;
}
