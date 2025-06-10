import React, { useState } from "react";
import { AlertCircle, Check, Loader } from "lucide-react";
import { useWebScraper } from "../hooks/useWebScraper";
import "./WebScraperTool.scss";

const WebScraperTool: React.FC = () => {
  const [startUrl, setStartUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [crawlHistory, setCrawlHistory] = useState<string[]>([]);

  const {
    results,
    loading,
    error,
    success,
    crawlStatus,
    searchWebsite,
    stopCrawling,
    clearResults,
  } = useWebScraper();

  const handleSearch = async () => {
    if (!startUrl || !question) {
      return; // Hook will handle error message
    }

    // Add to history
    setCrawlHistory((prev) => [...prev, startUrl]);

    await searchWebsite({
      startUrl,
      question,
      maxPages: 100,
    });
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
            onClick={handleSearch}
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

      {results.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h3 className="section-title">Results</h3>
            <button onClick={clearResults} className="clear-button">
              Clear Results
            </button>
          </div>
          <div className="results-list">
            {results.map((result, index) => (
              <div key={index} className="result-card">
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
