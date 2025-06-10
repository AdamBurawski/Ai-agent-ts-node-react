import React from "react";
import { ChatMessage } from "../../hooks/useChat";
import ChatMessageComponent from "./ChatMessage";
import ChatInput from "./ChatInput";
import "./ChatInterface.scss";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  loading?: boolean;
  placeholder?: string;
  title?: string;
  className?: string;
  showAnalysis?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  loading = false,
  placeholder = "Type your message...",
  title = "Chat",
  className = "",
  showAnalysis = false,
}) => {
  return (
    <div className={`chat-interface ${className}`}>
      {title && (
        <div className="chat-interface__header">
          <h3>{title}</h3>
        </div>
      )}

      <div className="chat-interface__messages">
        {messages.length === 0 ? (
          <div className="chat-interface__empty">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              showAnalysis={showAnalysis}
            />
          ))
        )}
      </div>

      <ChatInput
        onSendMessage={onSendMessage}
        loading={loading}
        placeholder={placeholder}
      />
    </div>
  );
};

export default ChatInterface;
