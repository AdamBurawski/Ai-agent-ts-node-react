import React, { useState } from "react";

function SQLQueryTool() {
  const [question, setQuestion] = useState("");
  const [sqlQuery, setSqlQuery] = useState("");
  const [result, setResult] = useState<Array<
    Record<string, string | number>
  > | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch table structure
  const fetchStructure = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/structure");
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend Error:", errorData);
        throw new Error(errorData.error || "Failed to fetch table structure");
      }

      const data = await response.json();
      console.log("Table Structure:", data);
      alert("Table structure fetched. Check console for details.");
    } catch (error) {
      console.error("Error fetching structure:", error);
      if (error instanceof Error) {
        alert(`Error fetching structure: ${error.message}`);
      } else {
        alert("Error fetching structure");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTableDetails = async (selectedTables: string[]) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/table-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: selectedTables }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch table details");
      }

      const data = await response.json();
      console.log("Fetched Table Details:", data.details);
      return data.details;
    } catch (error) {
      console.error("Error fetching table details:", error);
      alert("Error fetching table details.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const [tables, setTables] = useState<string[]>([]);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/structure");
      if (!response.ok) throw new Error("Failed to fetch tables");

      const data = await response.json();
      setTables(data.tables);
      alert("Tables fetched successfully. Check console for details.");
      console.log("Tables:", data.tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      alert("Error fetching tables.");
    } finally {
      setLoading(false);
    }
  };

  // Generate SQL Query
  const generateSQL = async (
    question: string,
    tableDetails: Record<string, { columns: string[] }>
  ) => {
    setLoading(true);

    console.log("Question:", question);
    console.log("Table Structures:", tableDetails);
    try {
      const response = await fetch("http://localhost:3001/api/generate-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, tableStructures: tableDetails }),
      });

      if (!response.ok) throw new Error("Failed to generate SQL query");

      const data = await response.json();
      console.log("Generated SQL Query:", data.sqlQuery);
      return data.sqlQuery;
    } catch (error) {
      console.error("Error generating SQL query:", error);
      alert("Error generating SQL query.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Execute SQL Query
  const executeSQL = async () => {
    if (!sqlQuery || typeof sqlQuery !== "string" || sqlQuery.trim() === "") {
      alert("Please generate a valid SQL query first.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/query-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sqlQuery }),
      });

      if (!response.ok) throw new Error("Failed to execute SQL query");

      const data = await response.json();
      console.log("Query Result:", data.result);
      setResult(data.result || []);
      alert("Query executed successfully. Check console for results.");
    } catch (error) {
      console.error("Error executing SQL query:", error);
      alert("Error executing SQL query.");
    } finally {
      setLoading(false);
    }
  };

  const submitResult = async () => {
    if (!result) {
      alert("No result to submit.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/submit-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });

      if (!response.ok) throw new Error("Failed to submit result");

      const data = await response.json();
      console.log("Submission Response:", data);
      alert("Result submitted successfully!");
    } catch (error) {
      console.error("Error submitting result:", error);
      alert("Error submitting result.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>SQL Query Tool</h2>
      <button onClick={fetchTables} disabled={loading}>
        {loading ? "Loading..." : "Fetch Tables"}
      </button>
      <button onClick={fetchStructure} disabled={loading}>
        {loading ? "Loading..." : "Fetch Table Structure"}
      </button>
      <div style={{ margin: "20px 0" }}>
        <input
          type="text"
          placeholder="Enter your question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: "80%", padding: "10px", marginRight: "10px" }}
        />
        <button
          onClick={async () => {
            const tableDetails = await fetchTableDetails(tables);
            let generatedSQL = null;
            if (tableDetails) {
              generatedSQL = await generateSQL(question, tableDetails);
            }
            if (generatedSQL) {
              setSqlQuery(generatedSQL);
            }
          }}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate SQL"}
        </button>
      </div>
      {sqlQuery && (
        <div>
          <h3>Generated SQL Query:</h3>
          <pre>{sqlQuery}</pre>
          <button onClick={executeSQL} disabled={loading}>
            {loading ? "Executing..." : "Execute SQL"}
          </button>
        </div>
      )}
      {result && (
        <div>
          <h3>Query Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      <div>
        <h3>Tables</h3>
        <ul>
          {tables.map((table, index) => (
            <li key={index}>
              {table}{" "}
              <button onClick={() => fetchTableDetails([table])}>
                Show Details
              </button>
            </li>
          ))}
        </ul>
      </div>
      {result && (
        <div>
          <h3>Query Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          <button onClick={submitResult} disabled={loading}>
            {loading ? "Submitting..." : "Submit Result"}
          </button>
        </div>
      )}
    </div>
  );
}

export default SQLQueryTool;
