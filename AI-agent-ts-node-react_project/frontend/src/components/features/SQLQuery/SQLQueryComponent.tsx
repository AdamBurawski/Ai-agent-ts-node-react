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
    submitResult,
    generateAndExecute,
    isLoading,
    error,
    structureLoading,
    generateLoading,
    executeLoading,
    submitLoading,
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
          <span className="sql-query__icon">💾</span>
          SQL Query Tool
        </h2>
        <p className="sql-query__description">
          Generate and execute SQL queries from natural language questions
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
          {structureLoading ? "Loading..." : "Refresh Tables"}
        </button>

        <button
          onClick={clearQuery}
          className="sql-query__button sql-query__button--outline"
        >
          Clear All
        </button>
      </div>

      <form onSubmit={handleQuestionSubmit} className="sql-query__form">
        <div className="sql-query__input-group">
          <label htmlFor="question" className="sql-query__label">
            Ask a question about your database:
          </label>
          <div className="sql-query__input-wrapper">
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Show me all users who registered last month"
              className="sql-query__textarea"
              rows={3}
            />
            <button
              type="submit"
              disabled={generateLoading || !question.trim()}
              className="sql-query__button sql-query__button--primary"
            >
              {generateLoading ? "Generating..." : "Generate SQL"}
            </button>
          </div>
        </div>
      </form>

      {sqlQuery && (
        <div className="sql-query__section">
          <h3 className="sql-query__section-title">Generated SQL Query:</h3>
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
              {executeLoading ? "Executing..." : "Execute Query"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="sql-query__section">
          <h3 className="sql-query__section-title">Query Results:</h3>
          <div className="sql-query__result">{formatResult(result)}</div>
          <div className="sql-query__actions">
            <button
              onClick={submitResult}
              disabled={submitLoading}
              className="sql-query__button sql-query__button--success"
            >
              {submitLoading ? "Submitting..." : "Submit Result"}
            </button>
          </div>
        </div>
      )}

      {tables.length > 0 && (
        <div className="sql-query__section">
          <h3 className="sql-query__section-title">Available Tables:</h3>
          <div className="sql-query__tables">
            {tables.map((table, index) => (
              <div key={index} className="sql-query__table-item">
                <span className="sql-query__table-name">{table}</span>
                <button
                  onClick={() => fetchTableDetails([table])}
                  className="sql-query__button sql-query__button--small"
                >
                  Show Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tableDetails && (
        <div className="sql-query__section">
          <h3 className="sql-query__section-title">Table Structure:</h3>
          <div className="sql-query__table-details">
            <pre>{JSON.stringify(tableDetails, null, 2)}</pre>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="sql-query__loading">
          <div className="sql-query__spinner"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
};

export default SQLQueryComponent;
