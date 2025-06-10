export const tools = [
  {
    name: "text_reader",
    description: "Reads and processes text files from the uploads directory",
    module: "textController",
    method: "execute",
    parameters: {
      filename: "string - The name of the text file to read"
    }
  },
  {
    name: "web_scraper",
    description: "Scrapes and analyzes web pages to find information",
    module: "scraperController",
    method: "search",
    parameters: {
      startUrl: "string - The URL of the website to analyze",
      question: "string - The question to answer about the website content"
    }
  },
  {
    name: "process_audio",
    description: "Transcribes audio files and processes their content",
    module: "audioController",
    method: "execute",
    parameters: {
      filename: "string - The name of the audio file to process"
    }
  },
  {
    name: "query_vector",
    description: "Searches through vector embeddings to find relevant information",
    module: "queryVectorController",
    method: "execute",
    parameters: {
      query: "string - The search query to find relevant information"
    }
  },
  {
    name: "image_chat",
    description: "Analyzes images and responds to questions about them",
    module: "imageChatController",
    method: "execute",
    parameters: {
      message: "string - The question about the image"
    }
  },
  {
    name: "generate_embeddings",
    description: "Generates embeddings for all text files in the uploads directory and saves them for future vector searches",
    module: "vectorController",
    method: "execute",
    parameters: {}
  },
  {
    name: "graph_search",
    description: "Searches for shortest path between two users in the Neo4j graph database",
    module: "graphController",
    method: "shortestPath",
    parameters: {
      from: "string - Source user's name",
      to: "string - Target user's name"
    }
  }
];

export default tools;