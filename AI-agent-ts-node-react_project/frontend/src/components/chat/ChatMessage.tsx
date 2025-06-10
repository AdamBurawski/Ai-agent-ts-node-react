import React from "react";
import { ChatMessage } from "../../hooks/useChat";

interface ChatMessageProps {
  message: ChatMessage;
  showAnalysis?: boolean;
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  showAnalysis = false,
}) => {
  const getMessageTypeLabel = (type: ChatMessage["type"]) => {
    switch (type) {
      case "user":
        return "You";
      case "agent":
        return "AI Assistant";
      case "system":
        return "System";
      default:
        return "Unknown";
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`chat-message chat-message--${message.type}`}>
      <div className="chat-message__bubble">
        <div className="chat-message__header">
          <span className="chat-message__sender">
            {getMessageTypeLabel(message.type)}
          </span>
          <span className="chat-message__timestamp">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        <div className="chat-message__content">{message.content}</div>

        {showAnalysis && message.analysis && (
          <div className="chat-message__analysis">
            <div className="chat-message__analysis-header">Analysis:</div>
            {message.analysis.selectedTool && (
              <div className="chat-message__analysis-item">
                <strong>Tool:</strong> {message.analysis.selectedTool}
              </div>
            )}
            {message.analysis.reasoning && (
              <div className="chat-message__analysis-item">
                <strong>Reasoning:</strong> {message.analysis.reasoning}
              </div>
            )}
            {message.analysis.plan && Array.isArray(message.analysis.plan) && (
              <div className="chat-message__analysis-item">
                <strong>Plan:</strong>
                <ul>
                  {message.analysis.plan.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageComponent;
