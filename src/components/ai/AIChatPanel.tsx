import React, { useRef, useEffect } from 'react';
import { Button, Loading } from '@carbon/react';
import { Close, TrashCan } from '@carbon/icons-react';
import { useUI } from '@/contexts/UIContext';
import { useAI } from '@/contexts/AIContext';
import { useData } from '@/contexts/DataContext';
import { useMigration } from '@/contexts/MigrationContext';
import AIChatMessage from './AIChatMessage';
import AIChatInput from './AIChatInput';
import '@/styles/ai-chat.scss';

const AIChatPanel: React.FC = () => {
  const { chatPanelOpen, toggleChatPanel } = useUI();
  const { chatMessages, chatLoading, sendChatMessage, clearChat, isAvailable } = useAI();
  const { collectedData } = useData();
  const { analysisResult } = useMigration();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!chatPanelOpen) return null;

  const handleSend = (message: string) => {
    sendChatMessage(message, collectedData, analysisResult);
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
        {chatMessages.length === 0 && (
          <div className="ai-chat-panel__empty">
            <p>Ask questions about your IBM Cloud infrastructure.</p>
            {!isAvailable && (
              <p className="ai-chat-panel__warning">
                AI proxy is not connected. Configure it in Settings.
              </p>
            )}
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <AIChatMessage key={i} message={msg} />
        ))}
        {chatLoading && (
          <div className="ai-chat-panel__loading">
            <Loading withOverlay={false} small />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <AIChatInput onSend={handleSend} disabled={chatLoading || !isAvailable} />
    </div>
  );
};

export default AIChatPanel;
