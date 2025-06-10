import { useState } from "react";
import {
  apiService,
  TableStructure,
  TableDetails,
  QueryResult,
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
    const response = await apiService.generateSQL(question, tableStructures);
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

  const {
    execute: submitResult,
    loading: submitLoading,
    error: submitError,
  } = useApiCall(async () => {
    if (!state.result) {
      throw new Error("No result to submit.");
    }
    const response = await apiService.submitSQLResult(state.result);
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
      if (!state.question.trim()) {
        throw new Error("Please enter a question first.");
      }

      // Fetch table details if not available
      if (!state.tableDetails && state.tables.length > 0) {
        await fetchTableDetails(state.tables);
      }

      if (state.tableDetails) {
        await generateSQL(state.question, state.tableDetails);
      }
    } catch (error) {
      console.error("Error in generateAndExecute:", error);
    }
  };

  const isLoading =
    structureLoading ||
    detailsLoading ||
    generateLoading ||
    executeLoading ||
    submitLoading;

  const error =
    structureError ||
    detailsError ||
    generateError ||
    executeError ||
    submitError;

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
    submitResult,
    generateAndExecute,

    // Status
    isLoading,
    error,

    // Individual loading states for fine-grained control
    structureLoading,
    detailsLoading,
    generateLoading,
    executeLoading,
    submitLoading,
  };
};
