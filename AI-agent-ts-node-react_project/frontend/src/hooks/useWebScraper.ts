import { useState, useEffect, useCallback } from "react";
import {
  apiService,
  ScrapingParams,
  ScrapingResult,
  CrawlStatus,
} from "../services/api";

interface UseWebScraperReturn {
  results: ScrapingResult[];
  loading: boolean;
  error: string | null;
  success: string | null;
  crawlStatus: CrawlStatus | null;
  searchWebsite: (params: ScrapingParams) => Promise<void>;
  stopCrawling: () => Promise<void>;
  clearResults: () => void;
}

export function useWebScraper(): UseWebScraperReturn {
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);

  // Auto-clear success/error messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Status polling effect
  useEffect(() => {
    let statusInterval: NodeJS.Timeout;

    if (loading) {
      statusInterval = setInterval(async () => {
        try {
          const status = await apiService.getScrapingStatus();
          setCrawlStatus(status);

          if (status.completed || status.stopped) {
            setLoading(false);
            clearInterval(statusInterval);
          }
        } catch (error) {
          console.error("Error fetching status:", error);
          setLoading(false);
          clearInterval(statusInterval);
        }
      }, 1000);
    }

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [loading]);

  const searchWebsite = useCallback(async (params: ScrapingParams) => {
    if (!params.startUrl || !params.question) {
      setError("Both URL and question are required");
      return;
    }

    setLoading(true);
    setError(null);
    setCrawlStatus(null);

    try {
      const data = await apiService.searchWebsite(params);

      if (data.success && data.result) {
        setResults([
          {
            url: data.result.url,
            title: data.result.title,
            answer:
              typeof data.result.answer === "string"
                ? data.result.answer
                : JSON.stringify(data.result.answer, null, 2),
          },
        ]);
        setSuccess("Found an answer!");
      } else {
        setResults([]);
        setSuccess("No answer found in the scanned pages.");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to search website");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const stopCrawling = useCallback(async () => {
    try {
      await apiService.stopScraping();
      setLoading(false);
      setSuccess("Crawling stopped");
    } catch (error) {
      console.error("Error stopping crawler:", error);
      setError("Failed to stop crawling");
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setSuccess(null);
    setCrawlStatus(null);
  }, []);

  return {
    results,
    loading,
    error,
    success,
    crawlStatus,
    searchWebsite,
    stopCrawling,
    clearResults,
  };
}
