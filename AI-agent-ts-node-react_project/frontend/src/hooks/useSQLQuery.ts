import { useState } from "react";
import {
  apiService,
  TableStructure,
  TableDetails,
  QueryResult,
  SQLGenerationParams,
} from "../services/api";
import { useApiCall } from "./useApiCall";

interface SQLQueryState {
  question: string;
  sqlQuery: string;
  result: QueryResult[] | null;
  tables: string[];
  tableDetails: TableDetails | null;
}

export const useSQLQuery = () => {
  const [state, setState] = useState<SQLQueryState>({
    question: "",
    sqlQuery: "",
    result: null,
    tables: [],
    tableDetails: null,
  });

  const {
    execute: fetchStructure,
    loading: structureLoading,
    error: structureError,
  } = useApiCall(async () => {
    const response = await apiService.getTableStructure();
    setState((prev) => ({ ...prev, tables: response.tables || [] }));
    return response;
  });

  const {
    execute: fetchTableDetails,
    loading: detailsLoading,
    error: detailsError,
  } = useApiCall(async (selectedTables: string[]) => {
    const response = await apiService.getTableDetails(selectedTables);
    setState((prev) => ({ ...prev, tableDetails: response.details }));
    return response;
  });

  const {
    execute: generateSQL,
    loading: generateLoading,
    error: generateError,
  } = useApiCall(async (question: string, tableStructures: TableDetails) => {
    console.log("🔍 Frontend: Generating SQL with:", {
      question,
      tableStructures,
    });
    const response = await apiService.generateSQL({
      question,
      tableStructures,
    });
    console.log("✅ Frontend: SQL generated:", response);
    setState((prev) => ({ ...prev, sqlQuery: response.sqlQuery }));
    return response;
  });

  const {
    execute: executeSQL,
    loading: executeLoading,
    error: executeError,
  } = useApiCall(async () => {
    if (!state.sqlQuery?.trim()) {
      throw new Error("Please generate a valid SQL query first.");
    }
    const response = await apiService.executeSQL(state.sqlQuery);
    setState((prev) => ({ ...prev, result: response.result || [] }));
    return response;
  });

  const setQuestion = (question: string) => {
    setState((prev) => ({ ...prev, question }));
  };

  const clearQuery = () => {
    setState((prev) => ({
      ...prev,
      sqlQuery: "",
      result: null,
      question: "",
    }));
  };

  const generateAndExecute = async () => {
    try {
      console.log("🚀 Frontend: generateAndExecute called with state:", {
        question: state.question,
        tableDetails: state.tableDetails,
        tables: state.tables,
      });

      if (!state.question.trim()) {
        throw new Error("Please enter a question first.");
      }

      // Fetch table details if not available
      if (!state.tableDetails && state.tables.length > 0) {
        console.log("📋 Frontend: Fetching table details for:", state.tables);
        await fetchTableDetails(state.tables);
      }

      if (state.tableDetails) {
        console.log("✅ Frontend: Calling generateSQL...");
        await generateSQL(state.question, state.tableDetails);
      } else {
        console.log("❌ Frontend: No table details available");
      }
    } catch (error) {
      console.error("Error in generateAndExecute:", error);
    }
  };

  const isLoading =
    structureLoading || detailsLoading || generateLoading || executeLoading;

  const error = structureError || detailsError || generateError || executeError;

  return {
    // State
    question: state.question,
    sqlQuery: state.sqlQuery,
    result: state.result,
    tables: state.tables,
    tableDetails: state.tableDetails,

    // Actions
    setQuestion,
    clearQuery,
    fetchStructure,
    fetchTableDetails,
    generateSQL,
    executeSQL,
    generateAndExecute,

    // Status
    isLoading,
    error,

    // Individual loading states for fine-grained control
    structureLoading,
    detailsLoading,
    generateLoading,
    executeLoading,
  };
};
