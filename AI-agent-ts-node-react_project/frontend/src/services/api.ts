const BASE_URL = "http://localhost:3001/api";

export const API_ENDPOINTS = {
  AUDIO: {
    PROCESS_FOLDER: `${BASE_URL}/audio/process-folder`,
    GET_TRANSCRIPTION: `${BASE_URL}/audio/get-transcription`,
    READ_TEXT_FILES: `${BASE_URL}/audio/read-text-files`,
  },
  IMAGE: {
    OCR: `${BASE_URL}/image/ocr`,
    OCR_CHAT: `${BASE_URL}/image/ocr/chat`,
    PROCESS_IMAGES: `${BASE_URL}/image/process-images`,
  },
  VECTOR: {
    GENERATE_EMBEDDINGS: `${BASE_URL}/vector/generate-embeddings`,
    QUERY: `${BASE_URL}/vector/query`,
    SUMMARY: `${BASE_URL}/vector/summary`,
  },
  GRAPH: {
    GET_CONNECTIONS: `${BASE_URL}/graph/get-connections`,
    SHORTEST_PATH: `${BASE_URL}/graph/shortest-path`,
  },
};

class ApiService {
  async processFolder() {
    const response = await fetch(API_ENDPOINTS.AUDIO.PROCESS_FOLDER);
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }

  async readTextFiles() {
    const response = await fetch(API_ENDPOINTS.AUDIO.READ_TEXT_FILES);
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }

  async uploadImage(formData: FormData) {
    const response = await fetch(API_ENDPOINTS.IMAGE.OCR, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }

  async chatWithImage(message: string) {
    const response = await fetch(API_ENDPOINTS.IMAGE.OCR_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }

  async processImages() {
    const response = await fetch(API_ENDPOINTS.IMAGE.PROCESS_IMAGES);
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }

  async generateEmbeddings() {
    const response = await fetch(API_ENDPOINTS.VECTOR.GENERATE_EMBEDDINGS);
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }

  async queryVector(question: string) {
    const response = await fetch(API_ENDPOINTS.VECTOR.QUERY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }

  async getSummary(question: string) {
    const response = await fetch(API_ENDPOINTS.VECTOR.SUMMARY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }

  async getConnections() {
    const response = await fetch(API_ENDPOINTS.GRAPH.GET_CONNECTIONS);
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }

  async findShortestPath(from: string, to: string) {
    const response = await fetch(API_ENDPOINTS.GRAPH.SHORTEST_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  }
}

export const apiService = new ApiService();
