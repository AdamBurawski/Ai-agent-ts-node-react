import { useState, useCallback } from "react";
import { apiService } from "../services/api";
import { useChat } from "./useChat";

interface UseImageProcessorReturn {
  ocrResult: string | null;
  loading: boolean;
  error: string | null;
  messages: ReturnType<typeof useChat>["messages"];
  addMessage: ReturnType<typeof useChat>["addMessage"];
  handleImageUpload: (file: File) => Promise<void>;
  handleChatSubmit: (message: string) => Promise<void>;
  processImages: () => Promise<void>;
  clearResults: () => void;
}

export function useImageProcessor(): UseImageProcessorReturn {
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { messages, addMessage, clearHistory } = useChat();

  const handleImageUpload = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("image", file);

      try {
        const result = await apiService.uploadImage(formData);
        setOcrResult(result.text);
        addMessage(
          "Obraz został przesłany i przeanalizowany pomyślnie!",
          "system"
        );
      } catch (error) {
        console.error("Błąd podczas przesyłania obrazu:", error);
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Wystąpił błąd podczas przesyłania obrazu";
        setError(errorMsg);
        addMessage(
          "Nie udało się przesłać obrazu. Spróbuj ponownie.",
          "system"
        );
      } finally {
        setLoading(false);
      }
    },
    [addMessage]
  );

  const handleChatSubmit = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      addMessage(message, "user");

      try {
        const result = await apiService.chatWithImage(message);
        addMessage(result.reply, "agent");
      } catch (error) {
        console.error("Błąd podczas czatu o obrazie:", error);
        addMessage("Wystąpił błąd podczas przetwarzania wiadomości.", "system");
      }
    },
    [addMessage]
  );

  const processImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.processImages();
      console.log("Opisy obrazów:", result.descriptions);
      addMessage(
        "Obrazy zostały przetworzone pomyślnie! Sprawdź konsolę po szczegóły.",
        "system"
      );
    } catch (error) {
      console.error("Błąd przetwarzania obrazów:", error);
      const errorMsg = "Wystąpił błąd podczas przetwarzania obrazów.";
      setError(errorMsg);
      addMessage(errorMsg, "system");
    } finally {
      setLoading(false);
    }
  }, [addMessage]);

  const clearResults = useCallback(() => {
    setOcrResult(null);
    setError(null);
    clearHistory();
  }, [clearHistory]);

  return {
    ocrResult,
    loading,
    error,
    messages,
    addMessage,
    handleImageUpload,
    handleChatSubmit,
    processImages,
    clearResults,
  };
}
