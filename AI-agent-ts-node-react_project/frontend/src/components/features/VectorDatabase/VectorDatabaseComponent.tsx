import React, { useState, useEffect, useRef } from "react";
import { useVectorDatabase } from "../../../hooks/useVectorDatabase";
import ChatInterface from "../../chat/ChatInterface";
import { Chart } from "chart.js";
import "./VectorDatabaseComponent.scss";

const VectorDatabaseComponent: React.FC = () => {
  const [graphicData, setGraphicData] = useState<string | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const {
    loading,
    error,
    messages,
    generateEmbeddings,
    handleChatWithVectorDB,
    clearHistory,
  } = useVectorDatabase();

  // Handle chart creation when graphic data is available
  useEffect(() => {
    if (graphicData && chartRef.current) {
      // Destroy previous chart instance if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      try {
        const chartData = JSON.parse(graphicData);
        chartInstanceRef.current = new Chart(chartRef.current, {
          type: "bar",
          data: chartData,
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      } catch (error) {
        console.error("Błąd parsowania danych wykresu:", error);
      }
    }

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [graphicData]);

  const handleClearAll = () => {
    clearHistory();
    setGraphicData(null);
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
  };

  return (
    <div className="vector-database">
      <div className="vector-database__header">
        <h2>Baza Wektorowa</h2>
        <div className="vector-database__actions">
          <button
            onClick={generateEmbeddings}
            disabled={loading}
            className="btn btn--primary"
          >
            {loading ? "Generowanie..." : "Generuj Embeddingi"}
          </button>

          {(messages.length > 0 || graphicData) && (
            <button onClick={handleClearAll} className="btn btn--outline">
              Wyczyść wszystko
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="vector-database__error">
          <p>Błąd: {error}</p>
        </div>
      )}

      <div className="vector-database__content">
        <div className="vector-database__main">
          {graphicData && (
            <div className="chart-section">
              <h3>Wygenerowana Grafika</h3>
              <div className="chart-container">
                <canvas ref={chartRef} id="vectorChart"></canvas>
              </div>
            </div>
          )}

          <div className="chat-sections">
            <div className="chat-section">
              <ChatInterface
                messages={messages}
                onSendMessage={handleChatWithVectorDB}
                loading={loading}
                title="Czat z Bazą Wektorową"
                placeholder="Zadaj pytanie bazie wektorowej..."
                className="vector-chat"
              />
            </div>
          </div>
        </div>

        <div className="vector-database__info">
          <div className="info-card">
            <h4>Embeddingi</h4>
            <p>
              Generuj embeddingi z danych tekstowych do wyszukiwania
              semantycznego.
            </p>
          </div>

          <div className="info-card">
            <h4>Zapytania Wektorowe</h4>
            <p>
              Zadawaj pytania używając wyszukiwania semantycznego w bazie
              wektorowej.
            </p>
          </div>

          <div className="info-card">
            <h4>Wizualizacje</h4>
            <p>Twórz wykresy i grafiki z danych wektorowych.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VectorDatabaseComponent;
