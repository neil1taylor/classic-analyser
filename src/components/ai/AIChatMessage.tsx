import React from 'react';
import type { AIChatMessage as ChatMessageType } from '@/types/ai';

interface Props {
  message: ChatMessageType;
}

const AIChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`ai-chat__message ai-chat__message--${isUser ? 'user' : 'assistant'}`}
    >
      <div className="ai-chat__message-content">
        {message.content}
      </div>
    </div>
  );
};

export default AIChatMessage;
