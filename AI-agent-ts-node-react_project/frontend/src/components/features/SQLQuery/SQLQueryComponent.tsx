import React, { useEffect } from "react";
import { useSQLQuery } from "../../../hooks/useSQLQuery";
import "./SQLQueryComponent.scss";

const SQLQueryComponent: React.FC = () => {
  const {
    question,
    sqlQuery,
    result,
    tables,
    tableDetails,
    setQuestion,
    clearQuery,
    fetchStructure,
    fetchTableDetails,
    executeSQL,
    generateAndExecute,
    isLoading,
    error,
    structureLoading,
    generateLoading,
    executeLoading,
  } = useSQLQuery();

  useEffect(() => {
    fetchStructure();
  }, []);

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateAndExecute();
  };

  const formatResult = (data: any[]) => {
    if (!data || data.length === 0) return "No results found.";

    if (typeof data[0] === "object") {
      return (
        <div className="sql-query__table">
          <table>
            <thead>
              <tr>
                {Object.keys(data[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i}>{String(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="sql-query">
      <div className="sql-query__header">
        <h2 className="sql-query__title">
          <span className="sql-query__icon">🗃️</span>
          Baza Wiedzy - SQL Query
        </h2>
        <p className="sql-query__description">
          Odpytuj bazę wiedzy używając zapytań w języku naturalnym. System
          konwertuje Twoje pytania na zapytania SQL i wykonuje je na tabelach
          memories, memory_embeddings i search_history.
        </p>
      </div>

      {error && (
        <div className="sql-query__error">
          <span className="sql-query__error-icon">⚠️</span>
          {error.message}
        </div>
      )}

      <div className="sql-query__actions">
        <button
          onClick={fetchStructure}
          disabled={structureLoading}
          className="sql-query__button sql-query__button--secondary"
        >
          {structureLoading ? "Ładowanie..." : "Odśwież Tabele"}
        </button>

        <button
          onClick={clearQuery}
          className="sql-query__button sql-query__button--outline"
        >
          Wyczyść Wszystko
        </button>
      </div>

      <form onSubmit={handleQuestionSubmit} className="sql-query__form">
        <div className="sql-query__input-group">
          <label htmlFor="question" className="sql-query__label">
            Zadaj pytanie o bazę wiedzy:
          </label>
          <div className="sql-query__input-wrapper">
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="np. Pokaż wszystkie wspomnienia z kategorii 'conversations', Ile jest zapisanych wspomnień?, Które wspomnienia mają najwyższą ważność?"
              className="sql-query__textarea"
              rows={3}
            />
            <button
              type="submit"
              disabled={generateLoading || !question.trim()}
              className="sql-query__button sql-query__button--primary"
            >
              {generateLoading ? "Generowanie..." : "Generuj SQL"}
            </button>
          </div>
        </div>
      </form>

      {sqlQuery && (
        <div className="sql-query__section">
          <h3 className="sql-query__section-title">
            Wygenerowane zapytanie SQL:
          </h3>
          <div className="sql-query__code-block">
            <pre>
              <code>{sqlQuery}</code>
            </pre>
          </div>
          <div className="sql-query__actions">
            <button
              onClick={executeSQL}
              disabled={executeLoading}
              className="sql-query__button sql-query__button--primary"
            >
              {executeLoading ? "Wykonywanie..." : "Wykonaj Zapytanie"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="sql-query__section">
          <h3 className="sql-query__section-title">Wyniki zapytania:</h3>
          <div className="sql-query__result">{formatResult(result)}</div>
        </div>
      )}

      {tables.length > 0 && (
        <div className="sql-query__section">
          <h3 className="sql-query__section-title">Dostępne Tabele:</h3>
          <div className="sql-query__tables">
            {tables.map((table, index) => (
              <div key={index} className="sql-query__table-item">
                <span className="sql-query__table-name">{table}</span>
                <button
                  onClick={() => fetchTableDetails([table])}
                  className="sql-query__button sql-query__button--small"
                >
                  Pokaż Szczegóły
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tableDetails && (
        <div className="sql-query__section">
          <h3 className="sql-query__section-title">Struktura Tabel:</h3>
          <div className="sql-query__table-details">
            <pre>{JSON.stringify(tableDetails, null, 2)}</pre>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="sql-query__loading">
          <div className="sql-query__spinner"></div>
          <span>Przetwarzanie...</span>
        </div>
      )}
    </div>
  );
};

export default SQLQueryComponent;
