import React, { useState, useEffect } from "react";
import { AlertCircle, Check, Loader } from "lucide-react";
import "./WebScraperTool.scss";

interface ScrapingResult {
  url: string;
  title: string;
  answer?: string;
  summary?: string;
  keywords?: string[];
  similarity?: number;
}

interface CrawlStatus {
  pagesProcessed: number;
  totalPages: number;
  currentUrl?: string;
  completed: boolean;
  stopped: boolean;
}

const WebScraperTool: React.FC = () => {
  const [startUrl, setStartUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState<ScrapingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [crawlHistory, setCrawlHistory] = useState<string[]>([]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    let statusInterval: NodeJS.Timeout;

    if (loading) {
      statusInterval = setInterval(async () => {
        try {
          const response = await fetch(
            "http://localhost:3001/api/scraper/status"
          );
          if (!response.ok) throw new Error("Status fetch failed");

          const status = await response.json();
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

  const searchWebsite = async () => {
    if (!startUrl || !question) {
      setError("Both URL and question are required");
      return;
    }

    setLoading(true);
    setError(null);
    setCrawlHistory((prev) => [...prev, startUrl]);

    try {
      const response = await fetch("http://localhost:3001/api/scraper/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startUrl,
          question,
          maxPages: 100,
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

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
    } finally {
      setLoading(false);
    }
  };

  const stopCrawling = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/scraper/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to stop crawling");
      }

      setLoading(false);
      setSuccess("Crawling stopped");
    } catch (error) {
      console.error("Error stopping crawler:", error);
      setError("Failed to stop crawling");
    }
  };

  return (
    <div className="scraper-tool">
      <h2 className="scraper-title">Web Content Searcher</h2>
      {error && (
        <div className="alert error">
          <AlertCircle className="alert-icon" />
          <div className="alert-content">
            <h4>Error</h4>
            <p>{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="alert success">
          <Check className="alert-icon" />
          <div className="alert-content">
            <h4>Success</h4>
            <p>{success}</p>
          </div>
        </div>
      )}
      <div className="scraper-section">
        <h3 className="section-title">Search Website</h3>
        <div className="input-group">
          <input
            type="text"
            value={startUrl}
            onChange={(e) => setStartUrl(e.target.value)}
            placeholder="Enter website URL to search"
            className="url-input"
          />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question"
            className="question-input"
          />
          <button
            onClick={searchWebsite}
            disabled={loading}
            className="search-button"
          >
            {loading ? (
              <div className="loading-indicator">
                <Loader className="spinner" />
                Searching...
              </div>
            ) : (
              "Search"
            )}
          </button>
          {loading && (
            <button onClick={stopCrawling} className="stop-button">
              Stop
            </button>
          )}
        </div>

        {crawlStatus && (
          <div className="status-container">
            <h4 className="status-title">Search Progress</h4>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{
                  width: `${
                    (crawlStatus.pagesProcessed / crawlStatus.totalPages) * 100
                  }%`,
                }}
              />
            </div>
            <div className="status-info">
              {crawlStatus.pagesProcessed} / {crawlStatus.totalPages} pages
              processed
              {crawlStatus.currentUrl && (
                <div className="current-url">
                  Current: {crawlStatus.currentUrl}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="history-section">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="history-toggle"
          >
            {historyExpanded ? "Hide" : "Show"} Search History
          </button>
          {historyExpanded && crawlHistory.length > 0 && (
            <div className="history-list">
              {crawlHistory.map((url, index) => (
                <div key={index} className="history-item">
                  {url}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      // In your results section, update the rendering code:
      {results.length > 0 && (
        <div className="results-section">
          <h3 className="section-title">Results</h3>
          <div className="results-list">
            {results.map((result, index) => (
              <div key={index} className="result-card">
                {/* Make sure to convert all values to strings */}
                <h4 className="result-title">{result.title || "No title"}</h4>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="result-url"
                >
                  {result.url}
                </a>
                {result.answer && (
                  <div className="result-answer">
                    <h5>Answer:</h5>
                    <p className="answer-text">
                      {typeof result.answer === "string"
                        ? result.answer
                        : JSON.stringify(result.answer, null, 2)}
                    </p>
                  </div>
                )}
                {result.keywords && Array.isArray(result.keywords) && (
                  <div className="keywords-list">
                    {result.keywords.map((keyword, kidx) => (
                      <span key={`${index}-${kidx}`} className="keyword-tag">
                        {String(keyword)}
                      </span>
                    ))}
                  </div>
                )}
                {typeof result.similarity === "number" && (
                  <div className="similarity-score">
                    Relevance: {(result.similarity * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebScraperTool;
