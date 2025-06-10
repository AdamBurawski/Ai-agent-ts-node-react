import React, { useState } from "react";
import { useGraphData } from "../../../hooks/useGraphData";
import GraphComponent from "../../GraphComponent";
import "./GraphVisualizationComponent.scss";

const GraphVisualizationComponent: React.FC = () => {
  const [fromUser, setFromUser] = useState("");
  const [toUser, setToUser] = useState("");

  const {
    connections,
    loading,
    error,
    graphData,
    fetchConnections,
    findShortestPath,
    importGraphData,
    clearError,
  } = useGraphData();

  const handleFindPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromUser.trim() || !toUser.trim()) {
      return;
    }
    await findShortestPath(fromUser.trim(), toUser.trim());
  };

  const handleRefreshData = async () => {
    clearError();
    await fetchConnections();
  };

  return (
    <div className="graph-visualization">
      <div className="graph-visualization__header">
        <h2>Wizualizacja Grafu</h2>
        <div className="graph-visualization__actions">
          <button
            onClick={handleRefreshData}
            disabled={loading}
            className="btn btn--primary"
          >
            {loading ? "Odświeżanie..." : "Odśwież dane"}
          </button>
          <button
            onClick={importGraphData}
            disabled={loading}
            className="btn btn--secondary"
          >
            Importuj dane do Neo4j
          </button>
        </div>
      </div>

      {error && (
        <div className="graph-visualization__error">
          <p>Błąd: {error}</p>
          <button onClick={clearError} className="btn btn--sm">
            Zamknij
          </button>
        </div>
      )}

      <div className="graph-visualization__content">
        <div className="graph-visualization__main">
          <div className="graph-section">
            <h3>Graf Połączeń</h3>
            {connections.length > 0 ? (
              <div className="graph-container">
                <GraphComponent data={graphData} />
              </div>
            ) : (
              <div className="graph-empty">
                <p>Brak danych do wyświetlenia grafu</p>
                <button
                  onClick={handleRefreshData}
                  className="btn btn--outline"
                >
                  Pobierz dane
                </button>
              </div>
            )}
          </div>

          <div className="path-finder-section">
            <h3>Znajdź Najkrótszą Ścieżkę</h3>
            <form onSubmit={handleFindPath} className="path-finder-form">
              <div className="form-group">
                <label htmlFor="fromUser">Od:</label>
                <input
                  type="text"
                  id="fromUser"
                  value={fromUser}
                  onChange={(e) => setFromUser(e.target.value)}
                  placeholder="np. Rafał"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="toUser">Do:</label>
                <input
                  type="text"
                  id="toUser"
                  value={toUser}
                  onChange={(e) => setToUser(e.target.value)}
                  placeholder="np. Barbara"
                  className="form-input"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !fromUser.trim() || !toUser.trim()}
                className="btn btn--primary"
              >
                {loading ? "Szukanie..." : "Znajdź ścieżkę"}
              </button>
            </form>
          </div>
        </div>

        <div className="graph-visualization__info">
          <div className="info-card">
            <h4>Statystyki Grafu</h4>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">Węzły:</span>
                <span className="stat-value">{graphData.nodes.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Połączenia:</span>
                <span className="stat-value">{connections.length}</span>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h4>Węzły w Grafie</h4>
            {graphData.nodes.length > 0 ? (
              <div className="nodes-list">
                {graphData.nodes.slice(0, 10).map((node) => (
                  <div key={node.id} className="node-item">
                    {node.label}
                  </div>
                ))}
                {graphData.nodes.length > 10 && (
                  <div className="nodes-more">
                    +{graphData.nodes.length - 10} więcej...
                  </div>
                )}
              </div>
            ) : (
              <p>Brak węzłów do wyświetlenia</p>
            )}
          </div>

          <div className="info-card">
            <h4>Funkcje</h4>
            <ul>
              <li>Wizualizacja grafu w czasie rzeczywistym</li>
              <li>Znajdowanie najkrótszej ścieżki</li>
              <li>Import danych do Neo4j</li>
              <li>Interaktywna nawigacja</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualizationComponent;
