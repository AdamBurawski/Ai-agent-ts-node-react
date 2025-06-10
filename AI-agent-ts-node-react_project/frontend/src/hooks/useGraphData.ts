import { useState, useEffect, useCallback } from "react";
import { apiService, Connection } from "../services/api";

interface UseGraphDataReturn {
  connections: Connection[];
  loading: boolean;
  error: string | null;
  graphData: {
    nodes: { id: string; label: string }[];
    edges: { from: string; to: string }[];
  };
  fetchConnections: () => Promise<void>;
  findShortestPath: (from: string, to: string) => Promise<void>;
  importGraphData: () => Promise<void>;
  clearError: () => void;
}

export function useGraphData(): UseGraphDataReturn {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatyczne pobieranie połączeń przy pierwszym załadowaniu
  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.getConnections();
      setConnections(data.connections);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Wystąpił błąd podczas pobierania danych grafu");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const findShortestPath = useCallback(async (from: string, to: string) => {
    if (!from || !to) {
      setError("Podaj oba punkty: skąd i dokąd");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiService.findShortestPath(from, to);
      console.log("Najkrótsza ścieżka:", data.path);
      alert(
        `Najkrótsza ścieżka z ${from} do ${to}: ${JSON.stringify(data.path)}`
      );
    } catch (error) {
      console.error("Błąd znajdowania najkrótszej ścieżki:", error);
      setError(
        "Nie udało się znaleźć najkrótszej ścieżki. Sprawdź konsolę po szczegóły."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const importGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.importGraphData();
      alert(result.message);
      // Odśwież połączenia po imporcie
      await fetchConnections();
    } catch (error) {
      console.error("Błąd tworzenia grafu:", error);
      setError("Nie udało się utworzyć grafu. Sprawdź konsolę po szczegóły.");
    } finally {
      setLoading(false);
    }
  }, [fetchConnections]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Przygotowanie danych dla Vis Network
  const graphData = {
    nodes: Array.from(
      new Set([
        ...connections.map((c) => c.source),
        ...connections.map((c) => c.target),
      ])
    ).map((id) => ({ id, label: id })),
    edges: connections.map((c) => ({ from: c.source, to: c.target })),
  };

  return {
    connections,
    loading,
    error,
    graphData,
    fetchConnections,
    findShortestPath,
    importGraphData,
    clearError,
  };
}
