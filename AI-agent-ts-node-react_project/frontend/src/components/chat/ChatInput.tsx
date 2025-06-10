import React, { useState, useRef } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  loading?: boolean;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  loading = false,
  placeholder = "Type your message...",
  maxLength = 1000,
  multiline = true,
}) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || loading) return;

    try {
      await onSendMessage(trimmedMessage);
      setMessage("");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);

      // Auto-resize textarea
      if (multiline && textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input">
      <div className="chat-input__container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          className="chat-input__textarea"
          rows={multiline ? 1 : undefined}
          style={{
            resize: multiline ? "none" : undefined,
            minHeight: multiline ? "40px" : undefined,
            maxHeight: multiline ? "120px" : undefined,
          }}
        />

        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="chat-input__button"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>

      {maxLength && (
        <div className="chat-input__counter">
          {message.length}/{maxLength}
        </div>
      )}

      <div className="chat-input__hint">
        Press Enter to send, Shift+Enter for new line
      </div>
    </form>
  );
};

export default ChatInput;
