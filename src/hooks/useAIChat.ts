// Focused hook for AI chat — thin wrapper over AIContext
import { useAI } from '@/contexts/AIContext';

export function useAIChat() {
  const {
    chatMessages,
    chatLoading,
    streamingText,
    sendChatMessage,
    sendInfrastructureChat,
    clearChat,
    isAvailable,
  } = useAI();

  return {
    messages: chatMessages,
    isLoading: chatLoading,
    streamingText,
    sendMessage: sendChatMessage,
    sendInfrastructureChat,
    clearChat,
    isAvailable,
  };
}
