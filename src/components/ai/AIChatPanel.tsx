import React, { useRef, useEffect } from 'react';
import { Button, Loading, InlineNotification } from '@carbon/react';
import { Close, TrashCan } from '@carbon/icons-react';
import { useUI } from '@/contexts/UIContext';
import { useAI } from '@/contexts/AIContext';
import { useData } from '@/contexts/DataContext';
import { useMigration } from '@/contexts/MigrationContext';
import { useAuth } from '@/contexts/AuthContext';
import AIChatMessage from './AIChatMessage';
import AIChatInput from './AIChatInput';
import '@/styles/ai-chat.scss';

const AIChatPanel: React.FC = () => {
  const { chatPanelOpen, toggleChatPanel } = useUI();
  const {
    chatMessages,
    chatLoading,
    sendChatMessage,
    clearChat,
    isAvailable,
    isConfigured,
    streamingText,
  } = useAI();
  const { collectedData } = useData();
  const { analysisResult } = useMigration();
  const { apiKey } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  if (!chatPanelOpen) return null;

  const handleSend = (message: string) => {
    sendChatMessage(message, collectedData, analysisResult, apiKey || undefined);
  };

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-panel__header">
        <h4 className="ai-chat-panel__title">AI Assistant</h4>
        <div className="ai-chat-panel__header-actions">
          <Button
            kind="ghost"
            size="sm"
            renderIcon={TrashCan}
            hasIconOnly
            iconDescription="Clear chat"
            onClick={clearChat}
          />
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Close}
            hasIconOnly
            iconDescription="Close"
            onClick={toggleChatPanel}
          />
        </div>
      </div>

      <div className="ai-chat-panel__messages">
        {chatMessages.length === 0 && !chatLoading && (
          <div className="ai-chat-panel__empty">
            <p>Ask questions about your IBM Cloud infrastructure.</p>
            {!isConfigured && (
              <InlineNotification
                kind="info"
                title="AI not configured"
                subtitle="AI features are optional. The application works fully without them."
                lowContrast
                hideCloseButton
              />
            )}
            {isConfigured && !isAvailable && (
              <InlineNotification
                kind="warning"
                title="AI unavailable"
                subtitle="The AI service is not reachable. All other features continue to work normally."
                lowContrast
                hideCloseButton
              />
            )}
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <AIChatMessage key={i} message={msg} />
        ))}
        {chatLoading && streamingText && (
          <AIChatMessage
            message={{ role: 'assistant', content: streamingText }}
          />
        )}
        {chatLoading && !streamingText && (
          <div className="ai-chat-panel__loading">
            <Loading withOverlay={false} small description="Generating response..." />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <AIChatInput onSend={handleSend} disabled={chatLoading || !isAvailable} />
    </div>
  );
};

export default AIChatPanel;
