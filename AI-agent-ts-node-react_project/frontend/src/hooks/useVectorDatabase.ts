import { useState, useCallback } from "react";
import { apiService } from "../services/api";
import { useChat } from "./useChat";

interface UseVectorDatabaseReturn {
  loading: boolean;
  error: string | null;
  messages: ReturnType<typeof useChat>["messages"];
  addMessage: ReturnType<typeof useChat>["addMessage"];
  generateEmbeddings: () => Promise<void>;
  handleChatWithVectorDB: (question: string) => Promise<void>;
  clearHistory: () => void;
}

export function useVectorDatabase(): UseVectorDatabaseReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { messages, addMessage, clearHistory } = useChat();

  const generateEmbeddings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.generateEmbeddings();
      console.log("Wygenerowane embeddingi:", data.embeddings);
      addMessage(
        "Embeddingi zostały wygenerowane pomyślnie! Sprawdź konsolę po szczegóły.",
        "system"
      );
    } catch (error) {
      if (error instanceof Error) {
        console.error("Błąd generowania embeddingów:", error.message);
        setError(error.message);
        addMessage("Wystąpił błąd podczas generowania embeddingów.", "system");
      } else {
        console.error("Nieoczekiwany błąd:", error);
        setError(
          "Wystąpił nieoczekiwany błąd podczas generowania embeddingów."
        );
        addMessage(
          "Wystąpił nieoczekiwany błąd podczas generowania embeddingów.",
          "system"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [addMessage]);

  const handleChatWithVectorDB = useCallback(
    async (question: string) => {
      if (!question.trim()) return;

      addMessage(question, "user");

      try {
        const data = await apiService.queryVector(question);
        addMessage(
          data.answer || "Nie znaleziono odpowiednich danych.",
          "agent"
        );
      } catch (error) {
        console.error("Błąd zapytania do bazy danych:", error);
        addMessage("Wystąpił błąd podczas zapytania do bazy danych.", "system");
      }
    },
    [addMessage]
  );

  return {
    loading,
    error,
    messages,
    addMessage,
    generateEmbeddings,
    handleChatWithVectorDB,
    clearHistory,
  };
}
