import React, { useState } from 'react';
import { TextArea, Button } from '@carbon/react';
import { Send } from '@carbon/icons-react';

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

const AIChatInput: React.FC<Props> = ({ onSend, disabled }) => {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-chat__input">
      <TextArea
        id="ai-chat-input"
        labelText=""
        hideLabel
        placeholder="Ask about your infrastructure..."
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        disabled={disabled}
      />
      <Button
        kind="primary"
        size="sm"
        renderIcon={Send}
        hasIconOnly
        iconDescription="Send"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
      />
    </div>
  );
};

export default AIChatInput;
