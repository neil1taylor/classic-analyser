import type { AIChatMessage } from '@/types/ai';
import { proxyPost } from './aiProxyClient';

interface ChatResponse {
  response: string;
}

export async function sendChat(
  messages: AIChatMessage[],
  context: object,
): Promise<string> {
  const response = await proxyPost<ChatResponse>('/chat', {
    messages,
    context,
  });
  return response.response;
}
