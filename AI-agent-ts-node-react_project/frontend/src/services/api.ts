const BASE_URL = "http://localhost:3001/api";

// Enhanced type definitions
export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface AgentResponse {
  analysis?: {
    selectedTool: string;
    reasoning: string;
    plan: string[];
    parameters: Record<string, string | number | boolean>;
  };
  result?: Record<string, unknown>;
  response?: string;
  success?: boolean;
}

export interface ScrapingParams {
  startUrl: string;
  question: string;
  maxPages?: number;
}

export interface ScrapingResult {
  url: string;
  title: string;
  answer?: string;
  summary?: string;
  keywords?: string[];
  similarity?: number;
}

export interface CrawlStatus {
  pagesProcessed: number;
  totalPages: number;
  currentUrl?: string;
  completed: boolean;
  stopped: boolean;
}

export interface SQLGenerationParams {
  question: string;
  tableStructures: Record<string, { columns: string[] }>;
}

export interface TableStructure {
  tables: string[];
  details?: Record<string, { columns: string[] }>;
}

export interface QueryResult {
  result: Array<Record<string, string | number>>;
}

export interface Transcription {
  file: string;
  text: string;
}

export interface Connection {
  source: string;
  target: string;
}

export interface Memory {
  id?: number;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  importance_level?: "low" | "medium" | "high" | "critical";
  source?: string;
  context_data?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface SearchResult extends Memory {
  similarity_score?: number;
  match_type?: "semantic" | "keyword" | "hybrid";
  snippet?: string;
}

export interface SearchOptions {
  limit?: number;
  category?: string;
  importance_level?: string;
  search_type?: "semantic" | "keyword" | "hybrid";
  similarity_threshold?: number;
}

export interface KnowledgeBaseStats {
  total_memories: number;
  by_category: Record<string, number>;
  by_importance: Record<string, number>;
}

export const API_ENDPOINTS = {
  AUDIO: {
    PROCESS_FOLDER: `${BASE_URL}/audio/process-folder`,
    GET_TRANSCRIPTION: `${BASE_URL}/audio/get-transcription`,
    READ_TEXT_FILES: `${BASE_URL}/audio/read-text-files`,
  },
  IMAGE: {
    OCR: `${BASE_URL}/image/ocr`,
    OCR_CHAT: `${BASE_URL}/image/chat`,
    PROCESS_IMAGES: `${BASE_URL}/image/process-images`,
    UPLOAD: `${BASE_URL}/image/upload`,
  },
  VECTOR: {
    GENERATE_EMBEDDINGS: `${BASE_URL}/vector/generate-embeddings`,
    QUERY: `${BASE_URL}/vector/query`,
    SUMMARY: `${BASE_URL}/vector/summary`,
    GENERATE_GRAPHIC: `${BASE_URL}/vector/generate-graphic`,
  },
  GRAPH: {
    GET_CONNECTIONS: `${BASE_URL}/graph/get-connections`,
    SHORTEST_PATH: `${BASE_URL}/graph/shortest-path`,
    IMPORT_DATA: `${BASE_URL}/graph/import-data`,
  },
  AGENT: {
    PROCESS: `${BASE_URL}/agent/process`,
  },
  SCRAPER: {
    SEARCH: `${BASE_URL}/scraper/search`,
    STATUS: `${BASE_URL}/scraper/status`,
    STOP: `${BASE_URL}/scraper/stop`,
  },
  SQL: {
    STRUCTURE: `${BASE_URL}/structure`,
    TABLE_DETAILS: `${BASE_URL}/table-details`,
    GENERATE_SQL: `${BASE_URL}/generate-sql`,
    QUERY_DATABASE: `${BASE_URL}/query-database`,
    SUBMIT_RESULT: `${BASE_URL}/submit-result`,
  },
  KNOWLEDGE: {
    MEMORIES: `${BASE_URL}/knowledge/memories`,
    SEARCH: `${BASE_URL}/knowledge/search`,
    CATEGORIES: `${BASE_URL}/knowledge/categories`,
    STATISTICS: `${BASE_URL}/knowledge/statistics`,
    BULK_IMPORT: `${BASE_URL}/knowledge/bulk-import`,
  },
};

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiService {
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const defaultOptions: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, defaultOptions);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new ApiError(
            errorData.error || `HTTP error! status: ${response.status}`,
            response.status,
            response
          );
        }

        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
    throw new Error("Max retries exceeded");
  }

  // Audio Services
  async processFolder(): Promise<Transcription[]> {
    return this.makeRequest<Transcription[]>(
      API_ENDPOINTS.AUDIO.PROCESS_FOLDER
    );
  }

  async readTextFiles(): Promise<{ file: string; content: string }[]> {
    return this.makeRequest(API_ENDPOINTS.AUDIO.READ_TEXT_FILES);
  }

  // Image Services
  async uploadImage(formData: FormData): Promise<{ text: string }> {
    return this.makeRequest(API_ENDPOINTS.IMAGE.OCR, {
      method: "POST",
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async uploadImageForAgent(formData: FormData): Promise<{ message: string }> {
    return this.makeRequest(API_ENDPOINTS.IMAGE.UPLOAD, {
      method: "POST",
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  async chatWithImage(message: string): Promise<{ reply: string }> {
    return this.makeRequest(API_ENDPOINTS.IMAGE.OCR_CHAT, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  async processImages(): Promise<{ descriptions: any[] }> {
    return this.makeRequest(API_ENDPOINTS.IMAGE.PROCESS_IMAGES);
  }

  // Vector Services
  async generateEmbeddings(): Promise<{ embeddings: any[] }> {
    return this.makeRequest(API_ENDPOINTS.VECTOR.GENERATE_EMBEDDINGS);
  }

  async queryVector(question: string): Promise<{ answer: string }> {
    return this.makeRequest(API_ENDPOINTS.VECTOR.QUERY, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  }

  async getSummary(question: string): Promise<{ summary: string }> {
    return this.makeRequest(API_ENDPOINTS.VECTOR.SUMMARY, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  }

  async generateGraphic(prompt: string): Promise<{ graphicData: string }> {
    return this.makeRequest(API_ENDPOINTS.VECTOR.GENERATE_GRAPHIC, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }

  // Graph Services
  async getConnections(): Promise<{ connections: Connection[] }> {
    return this.makeRequest(API_ENDPOINTS.GRAPH.GET_CONNECTIONS);
  }

  async findShortestPath(
    from: string,
    to: string
  ): Promise<{ path: string[] }> {
    return this.makeRequest(API_ENDPOINTS.GRAPH.SHORTEST_PATH, {
      method: "POST",
      body: JSON.stringify({ from, to }),
    });
  }

  async importGraphData(): Promise<{ message: string }> {
    return this.makeRequest(API_ENDPOINTS.GRAPH.IMPORT_DATA, {
      method: "POST",
    });
  }

  // Agent Services
  async processAgentQuery(
    query: string,
    conversationHistory?: Array<{
      message: string;
      role: "user" | "agent";
      timestamp: Date;
    }>
  ): Promise<AgentResponse> {
    const body: any = { query };
    if (conversationHistory) {
      body.conversationHistory = conversationHistory;
    }

    return this.makeRequest(API_ENDPOINTS.AGENT.PROCESS, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // Scraper Services
  async searchWebsite(
    params: ScrapingParams
  ): Promise<{ success: boolean; result?: ScrapingResult }> {
    return this.makeRequest(API_ENDPOINTS.SCRAPER.SEARCH, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getScrapingStatus(): Promise<CrawlStatus> {
    return this.makeRequest(API_ENDPOINTS.SCRAPER.STATUS);
  }

  async stopScraping(): Promise<{ message: string }> {
    return this.makeRequest(API_ENDPOINTS.SCRAPER.STOP, {
      method: "POST",
    });
  }

  // SQL Services
  async getTableStructure(): Promise<TableStructure> {
    return this.makeRequest(API_ENDPOINTS.SQL.STRUCTURE);
  }

  async getTableDetails(
    tables: string[]
  ): Promise<{ details: Record<string, { columns: string[] }> }> {
    return this.makeRequest(API_ENDPOINTS.SQL.TABLE_DETAILS, {
      method: "POST",
      body: JSON.stringify({ tables }),
    });
  }

  async generateSQL(
    params: SQLGenerationParams
  ): Promise<{ sqlQuery: string }> {
    return this.makeRequest(API_ENDPOINTS.SQL.GENERATE_SQL, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async executeSQL(sqlQuery: string): Promise<QueryResult> {
    return this.makeRequest(API_ENDPOINTS.SQL.QUERY_DATABASE, {
      method: "POST",
      body: JSON.stringify({ sqlQuery }),
    });
  }

  async submitResult(result: any): Promise<{ message: string }> {
    return this.makeRequest(API_ENDPOINTS.SQL.SUBMIT_RESULT, {
      method: "POST",
      body: JSON.stringify({ result }),
    });
  }

  // Knowledge Base Services
  async storeMemory(
    memory: Memory
  ): Promise<{ success: boolean; memory_id: number }> {
    return this.makeRequest(API_ENDPOINTS.KNOWLEDGE.MEMORIES, {
      method: "POST",
      body: JSON.stringify(memory),
    });
  }

  async searchMemories(
    query: string,
    options: SearchOptions = {}
  ): Promise<{
    success: boolean;
    results: SearchResult[];
    total: number;
  }> {
    return this.makeRequest(API_ENDPOINTS.KNOWLEDGE.SEARCH, {
      method: "POST",
      body: JSON.stringify({ query, ...options }),
    });
  }

  async getMemory(id: number): Promise<{ success: boolean; memory: Memory }> {
    return this.makeRequest(`${API_ENDPOINTS.KNOWLEDGE.MEMORIES}/${id}`);
  }

  async updateMemory(
    id: number,
    updates: Partial<Memory>
  ): Promise<{ success: boolean }> {
    return this.makeRequest(`${API_ENDPOINTS.KNOWLEDGE.MEMORIES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteMemory(id: number): Promise<{ success: boolean }> {
    return this.makeRequest(`${API_ENDPOINTS.KNOWLEDGE.MEMORIES}/${id}`, {
      method: "DELETE",
    });
  }

  async getCategories(): Promise<{ success: boolean; categories: string[] }> {
    return this.makeRequest(API_ENDPOINTS.KNOWLEDGE.CATEGORIES);
  }

  async getKnowledgeBaseStats(): Promise<{
    success: boolean;
    statistics: KnowledgeBaseStats;
  }> {
    return this.makeRequest(API_ENDPOINTS.KNOWLEDGE.STATISTICS);
  }

  async bulkImportMemories(memories: Memory[]): Promise<{
    success: boolean;
    summary: { total: number; successful: number; failed: number };
  }> {
    return this.makeRequest(API_ENDPOINTS.KNOWLEDGE.BULK_IMPORT, {
      method: "POST",
      body: JSON.stringify({ memories }),
    });
  }
}

export const apiService = new ApiService();
export { ApiError };
