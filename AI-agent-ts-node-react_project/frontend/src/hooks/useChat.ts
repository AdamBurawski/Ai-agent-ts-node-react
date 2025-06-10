import { useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  type: "user" | "agent" | "system";
  content: string;
  timestamp: Date;
  analysis?: any;
}

interface UseChatOptions {
  maxMessages?: number;
  persistHistory?: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  addMessage: (
    content: string,
    type: ChatMessage["type"],
    analysis?: any
  ) => void;
  clearHistory: () => void;
  removeMessage: (id: string) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { maxMessages = 100 } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = useCallback(
    (content: string, type: ChatMessage["type"], analysis?: any) => {
      const newMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        timestamp: new Date(),
        analysis,
      };

      setMessages((prev) => {
        const updated = [...prev, newMessage];
        // Keep only the last maxMessages
        return updated.slice(-maxMessages);
      });
    },
    [maxMessages]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const updateMessage = useCallback(
    (id: string, updates: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
      );
    },
    []
  );

  return {
    messages,
    addMessage,
    clearHistory,
    removeMessage,
    updateMessage,
  };
}
