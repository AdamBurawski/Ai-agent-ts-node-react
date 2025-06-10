import { useState, useCallback } from "react";
import { apiService, Transcription } from "../services/api";

interface UseAudioProcessorReturn {
  transcriptions: Transcription[];
  textFiles: { file: string; content: string }[];
  loading: boolean;
  error: string | null;
  processFolder: () => Promise<void>;
  readTextFiles: () => Promise<void>;
  clearData: () => void;
}

export function useAudioProcessor(): UseAudioProcessorReturn {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [textFiles, setTextFiles] = useState<
    { file: string; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFolder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.processFolder();
      setTranscriptions(data);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Wystąpił nieznany błąd podczas przetwarzania foldera");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const readTextFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.readTextFiles();
      setTextFiles(data);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Wystąpił nieznany błąd podczas czytania plików");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setTranscriptions([]);
    setTextFiles([]);
    setError(null);
  }, []);

  return {
    transcriptions,
    textFiles,
    loading,
    error,
    processFolder,
    readTextFiles,
    clearData,
  };
}
