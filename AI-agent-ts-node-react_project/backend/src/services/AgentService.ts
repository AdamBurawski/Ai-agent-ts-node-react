import OpenAI from "openai";
import { WebScraper } from "./WebScraper";
import { searchController } from "../controllers/searchController";
import { queryVectorController } from "../controllers/queryVectorController";
import { ShortestPathController } from "../controllers/graphController";
import { audioController } from "../controllers/audioController";
import { ProcessImagesController } from "../controllers/imageController";
import { imageChatController } from "../controllers/imageChatController";
import { SupabaseKnowledgeBaseService } from "./SupabaseKnowledgeBaseService";
import path from "path";
import fs from "fs/promises";
import { Response } from "express";
import { supabase } from "../config/database";

interface Tool {
  name: string;
  description: string;
  module: string;
  endpoint: string;
  keywords: string[];
  parameters?: Record<string, string>;
}

interface ToolSelection {
  tool: string;
  parameters: Record<string, any>;
  reasoning: string;
  response?: string;
  plan?: string[];
}

const AVAILABLE_TOOLS: Tool[] = [
  {
    name: "knowledge_search",
    description:
      "Search through saved conversations and memories in the knowledge base. Use when user asks about previous conversations, saved memories, or wants to recall past discussions.",
    module: "knowledge",
    endpoint: "/api/knowledge/search",
    keywords: [
      "zapisane rozmowy",
      "saved conversations",
      "previous talks",
      "memory",
      "recall",
      "baza wiedzy",
      "knowledge base",
      "wspomnienia",
      "poprzednie rozmowy",
    ],
  },
  {
    name: "text_reader",
    description:
      "Read and analyze text files. Use when user wants to read or process text files.",
    module: "text",
    endpoint: "/api/text/read",
    keywords: ["text", "file", "read", "txt", "document", "content"],
  },
  {
    name: "image_analysis",
    description: "Analyze images, perform OCR, and chat about image content.",
    module: "image",
    endpoint: "/api/image/ocr",
    keywords: ["image", "picture", "photo", "ocr"],
  },
  {
    name: "web_scraper",
    description:
      "Scrape and analyze web pages. Use when user wants to read or analyze content from websites.",
    module: "scraper",
    endpoint: "/api/scraper",
    keywords: [
      "website",
      "webpage",
      "url",
      "web",
      "internet",
      "site",
      "link",
      "online",
    ],
  },
  {
    name: "vector_search",
    description:
      "Search through existing documents and content using semantic similarity.",
    module: "vector",
    endpoint: "/api/vector/query",
    keywords: ["search", "find similar", "document search", "semantic search"],
  },
  {
    name: "audio_transcription",
    description: "Transcribe audio files and analyze audio content.",
    module: "audio",
    endpoint: "/api/audio/process-folder",
    keywords: ["audio", "sound", "voice", "transcribe", "speech to text"],
  },
  {
    name: "graph_search",
    description: "Finds connections between people in the graph database",
    module: "graph",
    endpoint: "/api/graph/path",
    keywords: [
      "connection",
      "path",
      "between",
      "people",
      "relationship",
      "connected",
    ],
  },
  {
    name: "process_audio",
    description: "Transcribes audio files to text using OpenAI Whisper",
    module: "audio",
    endpoint: "/api/audio/transcribe",
    keywords: ["audio", "transcribe", "voice", "speech", "mp3", "sound"],
  },
  {
    name: "generate_embeddings",
    description: "Generate embeddings for text files in uploads directory",
    module: "vector",
    endpoint: "/api/vector/generate-embeddings",
    keywords: [
      "embeddings",
      "generate embeddings",
      "create embeddings",
      "vector",
      "update database",
    ],
  },
];

const SYSTEM_PROMPT = `You are an AI Agent that helps users by choosing the most appropriate tool for their task.
Available tools:
${AVAILABLE_TOOLS.map((tool) => `- ${tool.name}: ${tool.description}`).join(
  "\n"
)}

For web scraping, use the web_scraper tool and provide the URL and optional question parameters.

Return your response in JSON format:
{
  "selectedTool": "web_scraper",
  "reasoning": "explanation of why this tool was chosen",
  "plan": ["step 1", "step 2", ...],
  "parameters": { 
    "url": "https://example.com",  // required
    "question": "optional question about the content"  // optional
  }
}`;

const systemMessage = `Available tools and when to use them:
- knowledge_search: Use for searching through saved conversations and memories in the knowledge base.
  Use when user asks about previous conversations, saved memories, or wants to recall past discussions.
  Parameters: query (string) - what to search for
  Examples:
  - "odczytaj zapisane rozmowy" -> params: { query: "rozmowy" }
  - "co pamiętasz o kwiatach?" -> params: { query: "kwiaty" }
  - "znajdź poprzednie rozmowy" -> params: { query: "rozmowy" }
- text_reader: Use for reading text files from uploads directory. 
  If a specific file is mentioned, use params.filename to specify it.
  Examples: 
  - "read all text files" -> no params
  - "read file example.txt" -> params: { filename: "example.txt" }
- generate_embeddings: Use when you need to create or update vector embeddings for text files.
  Use this before performing vector searches. No parameters needed.
  Examples:
  - "generate embeddings for text files"
  - "create embeddings"
  - "update vector database"
- process_audio: Use for transcribing audio files and voice recordings
- web_scraper: Use for getting information from websites
- vector_search: Use for searching in the database
- image_interpreter: Use for analyzing and describing images (for queries about images, pictures, photos)
- graph_search: Use for finding shortest paths between users in the social graph.
  Required parameters: from (source username), to (target username)
  Examples:
  - "find path from Adrian to Monika" -> params: { from: "Adrian", to: "Monika" }
  - "show connection between users" -> params: { from: "user1", to: "user2" }

For image-related queries (like "describe image", "what's in the picture", etc), ALWAYS use image_interpreter tool.
For path finding and user connection queries, ALWAYS use graph_search tool.

Return JSON in format:
{
    "selectedTool": "tool_name",
    "parameters": {
        // tool specific parameters
    },
    "reasoning": "brief explanation why this tool was selected"
}`;

export class AgentService {
  private model = "gpt-4"; // lub "gpt-3.5-turbo"
  private openai: OpenAI;
  private webScraper: WebScraper;
  private context: string[] = [];
  private conversationHistory: Array<{
    message: string;
    role: "user" | "agent";
    timestamp: Date;
  }> = [];
  private openaiApiKey: string;
  private searchController: typeof searchController;
  private queryVectorController: typeof queryVectorController;
  private graphController: ShortestPathController;
  private audioController = audioController;
  private imageController: ProcessImagesController;
  private imageChatController: typeof imageChatController;
  private knowledgeBase: SupabaseKnowledgeBaseService;
  private tools: Tool[] = [
    {
      name: "web_scraper",
      description: "Searches and extracts information from websites",
      module: "web",
      endpoint: "/api/web/search",
      keywords: ["search", "website", "url", "web", "internet"],
    },
    {
      name: "vector_search",
      description: "Searches through vector database for relevant information",
      module: "vector",
      endpoint: "/api/vector/query",
      keywords: ["database", "content", "document", "text", "information"],
    },
    {
      name: "text_reader",
      description: "Reads and analyzes text files from the system",
      module: "file",
      endpoint: "/api/file/read",
      keywords: ["read", "file", "text", "document", "content"],
    },
    {
      name: "process_audio",
      description: "Transcribes audio files to text using OpenAI Whisper",
      module: "audio",
      endpoint: "/api/audio/transcribe",
      keywords: ["audio", "transcribe", "voice", "speech", "mp3", "sound"],
    },
    {
      name: "graph_search",
      description:
        "Use graph db to find connections between two users in the social network",
      module: "graph",
      endpoint: "/api/graph/path",
      keywords: [
        "connection",
        "relationship",
        "between",
        "knows",
        "friend",
        "path",
      ],
      parameters: {
        from: "First person's name",
        to: "Second person's name",
      },
    },
    {
      name: "image_interpreter",
      description:
        "Analyzes and interprets images using GPT-4 Vision. First processes images in the folder, then allows asking questions about them.",
      module: "image",
      endpoint: "/api/image",
      keywords: [
        "image",
        "picture",
        "photo",
        "analyze",
        "interpret",
        "vision",
        "see",
      ],
      parameters: {
        message: "Question about the image",
      },
    },
    {
      name: "generate_embeddings",
      description: "Generate embeddings for text files in uploads directory",
      module: "vector",
      endpoint: "/api/vector/generate-embeddings",
      keywords: [
        "embeddings",
        "generate embeddings",
        "create embeddings",
        "vector",
        "update database",
      ],
    },
    {
      name: "knowledge_search",
      description:
        "Search through MY saved conversations and memories in the knowledge base",
      module: "knowledge",
      endpoint: "/api/knowledge/search",
      keywords: [
        "odczytaj zapisane",
        "pokaż zapisane",
        "znajdź zapisane",
        "moje rozmowy",
        "zapisane rozmowy",
        "moje wspomnienia",
        "zapisane wspomnienia",
        "historia rozmów",
        "baza wiedzy",
        "knowledge base",
        "saved conversations",
        "my memories",
      ],
      parameters: {
        query: "Search query for knowledge base",
      },
    },
    {
      name: "save_memory",
      description:
        "Save current conversation or specific memory to knowledge base",
      module: "knowledge",
      endpoint: "/api/knowledge/save",
      keywords: [
        "zapisz rozmowę",
        "zapisz wspomnienie",
        "zachowaj rozmowę",
        "save conversation",
        "save memory",
        "zapisz w bazie",
        "save to database",
        "store conversation",
        "store memory",
      ],
      parameters: {
        content: "Content to save as memory",
      },
    },
  ];

  constructor(openaiApiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.webScraper = new WebScraper(openaiApiKey);
    this.openaiApiKey = openaiApiKey;
    this.searchController = searchController;
    this.queryVectorController = queryVectorController;
    this.graphController = new ShortestPathController();
    this.imageController = new ProcessImagesController();
    this.imageChatController = imageChatController;
    this.knowledgeBase = new SupabaseKnowledgeBaseService();
  }

  private async findFilesInUploads(...extensions: string[]): Promise<string[]> {
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      const files = await fs.readdir(uploadsDir);
      return files.filter((file) =>
        extensions.some((ext) => file.toLowerCase().endsWith(ext))
      );
    } catch (error) {
      console.error("Error reading uploads directory:", error);
      return [];
    }
  }

  async executeToolPlan(toolResponse: any, request: any) {
    const { toolInfo, parameters } = toolResponse;

    try {
      let files: string[] = [];

      // Automatyczne wykrywanie plików w zależności od narzędzia
      switch (toolInfo.name) {
        case "text_reader":
          files = await this.findFilesInUploads(".txt");
          break;
        case "audio_transcription":
          files = await this.findFilesInUploads(".mp3");
          break;
      }

      if (files.length === 0) {
        return {
          success: false,
          error: `No ${
            toolInfo.name === "text_reader" ? ".txt" : ".mp3"
          } files found in uploads directory`,
        };
      }

      // Użyj pierwszego znalezionego pliku
      const filename = files[0];
      console.log(`Found file: ${filename}`);

      const controller = this.getController(toolInfo.module);
      if (!controller) {
        throw new Error(`No controller found for module: ${toolInfo.module}`);
      }

      const enrichedRequest = {
        ...request,
        body: {
          ...request.body,
          filename,
        },
      };

      const response = {
        json: (data: any) => data,
        status: (code: number) => ({
          json: (data: any) => data,
        }),
      } as unknown as Response;

      const result = await controller.execute(enrichedRequest, response);
      return result;
    } catch (error) {
      console.error(`Error executing tool ${toolInfo.name}:`, error);
      throw error;
    }
  }

  async analyzeRequest(query: string) {
    try {
      console.log("Starting analysis for query:", query);

      // Add user message to conversation history
      this.conversationHistory.push({
        message: query,
        role: "user",
        timestamp: new Date(),
      });

      // Check if user wants to save the conversation
      if (this.shouldSaveConversation(query)) {
        const saveResult = await this.saveConversationToKnowledge();
        this.conversationHistory.push({
          message: saveResult,
          role: "agent",
          timestamp: new Date(),
        });

        return {
          analysis: {
            selectedTool: "save_conversation",
            reasoning: "User requested to save conversation",
            plan: ["Generate conversation summary", "Store in knowledge base"],
            parameters: {},
          },
          result: { message: saveResult },
        };
      }

      // Get tool selection from GPT
      const toolSelection = await this.selectTool(query);
      console.log("Tool selection result:", toolSelection);

      if (!toolSelection.tool) {
        // Add agent response to conversation history for direct responses
        this.conversationHistory.push({
          message: toolSelection.response || "Brak odpowiedzi",
          role: "agent",
          timestamp: new Date(),
        });

        const response = {
          analysis: {
            selectedTool: null,
            reasoning: "Direct response",
            plan: [],
            parameters: {},
          },
          result: { message: toolSelection.response },
          finalResponse: toolSelection.response,
        };
        return response;
      }

      // Execute the selected tool
      const result = await this.executeTool(
        toolSelection.tool,
        toolSelection.parameters,
        query
      );
      console.log("Tool execution result:", result);

      // Generate final response
      const finalResponse = await this.generateResponse(query, result);
      console.log("Final response:", finalResponse);

      // Add agent response to conversation history
      const responseText =
        finalResponse ||
        (typeof result === "string"
          ? result
          : result?.message || result?.content || "Wykonano akcję");
      this.conversationHistory.push({
        message: responseText,
        role: "agent",
        timestamp: new Date(),
      });

      return {
        analysis: {
          selectedTool: toolSelection.tool,
          reasoning: toolSelection.reasoning || "Tool selected based on query",
          plan: toolSelection.plan || [],
          parameters: toolSelection.parameters || {},
        },
        result: result,
        finalResponse: finalResponse,
      };
    } catch (error) {
      console.error("Error in agent analysis:", error);
      throw error;
    }
  }

  async selectTool(query: string): Promise<ToolSelection> {
    const systemMessage = `You are a JSON-only response tool selector. You must ALWAYS respond with valid JSON.

IMPORTANT: Only use knowledge_search when user EXPLICITLY asks for SAVED/RECORDED conversations or memories from database.

Available tools and when to use them:
- knowledge_search: Use ONLY when user explicitly asks for previously SAVED conversations or memories from database.
  Use this tool ONLY for these exact phrases:
  - "odczytaj zapisane rozmowy" / "read saved conversations"
  - "pokaż zapisane wspomnienia" / "show saved memories"  
  - "znajdź zapisane rozmowy" / "find saved conversations"
  - "moje zapisane rozmowy" / "my saved conversations"
  - "baza wiedzy" / "knowledge base" (when asking to access it)
  - "historia rozmów" / "conversation history" (when asking for saved ones)
  
  DO NOT use for general questions about people, places, facts, or topics.
  Examples of when NOT to use:
  - "kim był Napoleon?" -> general question, use conversational response
  - "kim był Piłsudski?" -> general question, use conversational response
  - "co wiesz o historii?" -> general question, use conversational response
  
  Examples of when TO use:
  - "odczytaj zapisane rozmowy" -> selectedTool: "knowledge_search", params: { query: "rozmowy" }
  - "pokaż moje wspomnienia z bazy" -> selectedTool: "knowledge_search", params: { query: "wspomnienia" }
- save_memory: Use when user explicitly asks to SAVE/STORE current conversation or memory to database.
  Use this tool for these phrases:
  - "zapisz rozmowę" / "save conversation"
  - "zapisz wspomnienie" / "save memory"  
  - "zachowaj rozmowę" / "store conversation"
  - "zapisz w bazie wiedzy" / "save to knowledge base"
  - "zapisz w bazie danych" / "save to database"
  Parameters: content (optional) - specific content to save
  Examples:
  - "zapisz rozmowę w bazie wiedzy" -> selectedTool: "save_memory", params: {}
  - "zapisz wspomnienie: Napoleon był cesarzem" -> selectedTool: "save_memory", params: { content: "Napoleon był cesarzem" }
- text_reader: Use ONLY for reading .txt files from uploads directory, NOT for database queries. 
  If a specific file is mentioned, use params.filename to specify it.
  Examples: 
  - "read all text files" -> no params
  - "read file example.txt" -> params: { filename: "example.txt" }
- generate_embeddings: Use when you need to create or update vector embeddings for text files.
  Use this before performing vector searches. No parameters needed.
  Examples:
  - "generate embeddings for text files"
  - "create embeddings"
  - "update vector database"
- process_audio: Use for transcribing audio files and voice recordings
- web_scraper: Use for getting information from websites
- vector_search: Use for searching in the database
- image_interpreter: Use for analyzing and describing images (for queries about images, pictures, photos)
- graph_search: Use for finding shortest paths between users in the social graph.
  Required parameters: from (source username), to (target username)
  Examples:
  - "find path from Adrian to Monika" -> params: { from: "Adrian", to: "Monika" }
  - "show connection between users" -> params: { from: "user1", to: "user2" }

For image-related queries, ALWAYS use image_interpreter tool.
For path finding and user connection queries, ALWAYS use graph_search tool.

For simple conversational queries, greetings, or unclear requests that don't match any specific tool, respond with:
{
    "selectedTool": "",
    "parameters": {},
    "reasoning": "This is a conversational query that doesn't require a specific tool",
    "response": "Generated appropriate response here"
}

You must respond with ONLY a JSON object in this exact format:
{
    "selectedTool": "tool_name",
    "parameters": {
        "param1": "value1",
        "param2": "value2"
    },
    "reasoning": "brief explanation why this tool was selected"
}

OR for conversational queries:
{
    "selectedTool": "",
    "parameters": {},
    "reasoning": "brief explanation",
    "response": "appropriate conversational response"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: `Select tool for query: ${query}` },
        ],
        temperature: 0,
      });

      const content = response.choices[0].message.content;

      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      try {
        const parsedResponse = JSON.parse(content);
        console.log("Parsed tool selection:", parsedResponse); // Debugging
        return {
          tool: parsedResponse.selectedTool,
          parameters: parsedResponse.parameters,
          reasoning: parsedResponse.reasoning,
          response: parsedResponse.response,
        };
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        throw new Error(
          `Failed to parse tool selection response: ${parseError.message}`
        );
      }
    } catch (error) {
      console.error("Error in tool selection:", error);
      throw error;
    }
  }

  private async executeTool(toolName: string, params: any, query?: string) {
    if (toolName === "direct_response") {
      return {
        answer: params.response || params,
      };
    }

    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    let controller: any;

    switch (toolName) {
      case "knowledge_search":
        try {
          console.log("🔍 Knowledge search starting...", { params, query });

          // Get user ID - using our test user for now
          const userId = "384779bb-47d0-48ee-a498-cd33e1654f9f";

          // Try simple method first - get statistics
          const stats = await this.knowledgeBase.getStatistics(userId);
          console.log("📊 Database stats:", stats);

          if (stats.memory_count === 0) {
            return {
              success: true,
              message: "Baza wiedzy jest pusta. Brak zapisanych wspomnień.",
              results: [],
              stats: stats,
            };
          }

          // Try to get some memories directly without complex search
          try {
            // Używamy Supabase zamiast MySQL
            const { data: memories, error } = await supabase
              .from("memories")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(5);

            if (error) throw error;

            // Pobierz fragmenty dla każdej pamięci
            const formattedResults = [];
            for (const memory of memories || []) {
              // Pobierz fragmenty dla tego wspomnienia
              const { data: chunks, error: chunksError } = await supabase
                .from("memory_chunks")
                .select("content")
                .eq("memory_id", memory.id)
                .eq("user_id", userId);

              if (chunksError) throw chunksError;

              // Połącz fragmenty w pełną treść
              const content = chunks.map((chunk) => chunk.content).join("\n\n");

              formattedResults.push({
                id: memory.id,
                title: memory.title,
                content: content,
                tags: memory.tags || [],
                importance: memory.importance,
                created_at: memory.created_at,
              });
            }

            return {
              success: true,
              message: `Znaleziono ${formattedResults.length} zapisanych wspomnień:`,
              results: formattedResults,
              total: formattedResults.length,
            };
          } catch (directError) {
            console.error("Direct database access failed:", directError);

            return {
              success: true,
              message: `W bazie danych jest ${stats.memory_count} wspomnień, ale wystąpił problem z ich odczytaniem.`,
              results: [],
              stats: stats,
              error_details: directError.message,
            };
          }
        } catch (error) {
          console.error("Knowledge search error:", error);
          return {
            success: false,
            error: `Błąd podczas wyszukiwania w bazie wiedzy: ${error.message}`,
          };
        }

      case "save_memory":
        try {
          console.log("💾 Save memory starting...", { params, query });

          // Get user ID - using our test user for now
          const userId = "384779bb-47d0-48ee-a498-cd33e1654f9f";

          // Check if user wants to save current conversation
          if (this.conversationHistory.length > 0) {
            const saveResult = await this.saveConversationToKnowledge();
            return {
              success: true,
              message: saveResult,
              action: "conversation_saved",
            };
          } else {
            // Save specific content if provided
            const contentToSave =
              params.content || query || "Brak treści do zapisania";

            const memory = {
              title: `Ręczne wspomnienie: ${new Date().toLocaleDateString()}`,
              user_id: userId,
              tags: ["manual", "user_input"],
              importance: 5,
              source: "manual_entry",
            };

            const memoryId = await this.knowledgeBase.storeMemory(
              memory,
              contentToSave,
              userId
            );

            return {
              success: true,
              message: `Wspomnienie zostało zapisane w bazie wiedzy z ID: ${memoryId}`,
              memory_id: memoryId,
              action: "memory_saved",
            };
          }
        } catch (error) {
          console.error("Save memory error:", error);
          return {
            success: false,
            error: `Błąd podczas zapisywania wspomnienia: ${error.message}`,
          };
        }

      case "text_reader":
        const textFiles = await this.findFilesInUploads(".txt");
        if (textFiles.length === 0) {
          throw new Error("No text files found in uploads directory");
        }

        // Use specified filename from params, or default to first file
        let targetFilename = params.filename;
        if (targetFilename) {
          // Check if the specified file exists
          if (!textFiles.includes(targetFilename)) {
            throw new Error(
              `File '${targetFilename}' not found in uploads directory. Available files: ${textFiles.join(
                ", "
              )}`
            );
          }
        } else {
          // No filename specified, use first available file
          targetFilename = textFiles[0];
        }

        const textReq = {
          body: { filename: targetFilename },
        };

        let textResult;
        const textRes = {
          json: (data: any) => {
            textResult = data;
          },
          status: (code: number) => ({
            json: (data: any) => {
              textResult = data;
            },
          }),
        };

        await textController.execute(textReq as any, textRes as any);
        return textResult;

      case "process_audio":
        try {
          // Znajdź pliki audio w folderze uploads
          const files = await this.findFilesInUploads(".mp3");
          if (files.length === 0) {
            return {
              success: false,
              error: "No audio files found in uploads directory",
            };
          }

          // Użyj pierwszego znalezionego pliku
          const filename = files[0];
          console.log(`Found audio file: ${filename}`);

          let result;
          const mockResponse = {
            json: (data: any) => {
              result = data;
            },
            status: (code: number) => ({
              json: (data: any) => {
                result = data;
              },
            }),
          } as Response;

          await this.audioController.execute(
            { body: { filename } } as Request,
            mockResponse
          );
          return result;
        } catch (error) {
          console.error("Audio processing error:", error);
          return {
            success: false,
            error: error.message,
          };
        }

      case "image_analysis":
        controller = imageChatController;
        break;
      case "web_scraper":
        try {
          const url =
            params.url ||
            query?.match(/(?:https?:\/\/)?(?:www\.)?([^\s]+\.[^\s]+)/)?.[0];
          if (!url) {
            return {
              success: false,
              error: "No valid URL found in the query",
            };
          }

          // Dodaj protokół https:// jeśli nie ma
          const fullUrl = url.startsWith("http") ? url : `https://${url}`;

          const result = await this.webScraper.scrapeWebsiteWithQuestion(
            fullUrl,
            "Describe what this website is about",
            1
          );

          return {
            success: true,
            data: result,
          };
        } catch (error) {
          console.error("Web scraping error:", error);
          return {
            success: false,
            error: error.message || "Failed to scrape website",
          };
        }
      case "vector_search":
        try {
          let result;
          const mockResponse = {
            json: (data: any) => {
              result = data;
            },
            status: (code: number) => ({
              json: (data: any) => {
                result = data;
              },
            }),
          } as Response;

          const mockRequest = {
            body: {
              question: query || "What content is in the database?",
            },
          } as Request;

          await this.queryVectorController.execute(mockRequest, mockResponse);

          if (!result) {
            return {
              success: false,
              message: "No content found in the database",
            };
          }

          return {
            success: true,
            data: result,
          };
        } catch (error) {
          console.error("Vector search error:", error);
          return {
            success: false,
            error: error.message,
          };
        }
      case "audio_transcription":
        controller = audioController;
        break;
      case "graph_search":
        try {
          let result;
          const mockResponse = {
            json: (data: any) => {
              result = data;
            },
            status: (code: number) => ({
              json: (data: any) => {
                result = data;
              },
            }),
          } as Response;

          await this.graphController.execute(
            {
              body: {
                from: params.from,
                to: params.to,
              },
            } as Request,
            mockResponse
          );

          return {
            success: true,
            data: result,
          };
        } catch (error) {
          console.error("Graph search error:", error);
          return {
            success: false,
            error: error.message,
          };
        }
      case "image_interpreter":
        try {
          let result;
          const mockResponse = {
            json: (data: any) => {
              result = data;
            },
            status: (code: number) => ({
              json: (data: any) => {
                result = data;
              },
            }),
          } as Response;

          // Najpierw sprawdź, czy są obrazki w folderze uploads
          const files = await this.findFilesInUploads(
            ".jpg",
            ".png",
            ".jpeg",
            ".webp"
          );
          if (files.length === 0) {
            return {
              success: false,
              error:
                "No image files found in uploads directory. Please upload an image first.",
            };
          }

          // Przetwórz obrazki
          await this.imageController.execute({} as Request, mockResponse);

          // Zadaj pytanie o obrazki
          await this.imageChatController.execute(
            {
              body: {
                message:
                  params.message || query || "What do you see in these images?",
              },
            } as Request,
            mockResponse
          );

          return {
            success: true,
            data: result,
          };
        } catch (error) {
          console.error("Image interpretation error:", error);
          return {
            success: false,
            error: error.message,
          };
        }
      case "generate_embeddings":
        try {
          let result;
          const mockResponse = {
            json: (data: any) => {
              result = data;
            },
            status: (code: number) => ({
              json: (data: any) => {
                result = data;
              },
            }),
          } as Response;

          const mockRequest = {
            body: {
              question: "",
            },
          } as Request;

          await this.queryVectorController.execute(mockRequest, mockResponse);

          return {
            success: true,
            data: result,
          };
        } catch (error) {
          console.error("Embeddings generation error:", error);
          return {
            success: false,
            error: error.message,
          };
        }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    // Create a mock request/response to execute the controller
    const req = {
      body: params,
    };

    let result;
    const res = {
      json: (data: any) => {
        result = data;
      },
      status: (code: number) => ({
        json: (data: any) => {
          result = data;
        },
      }),
    };

    await controller.execute(req as any, res as any);
    return result;
  }

  private async generateResponse(query: string, toolResult: any) {
    // Special handling for knowledge_search results
    if (toolResult && toolResult.results && toolResult.results.length > 0) {
      const systemContent = `You are an AI assistant that MUST answer questions based ONLY on the provided knowledge base search results. 

CRITICAL INSTRUCTIONS:
- Use ONLY information from the provided search results
- If the search results contain the answer, use that information even if it contradicts general knowledge
- Be specific about what information you found in the knowledge base
- If the search results don't contain relevant information, clearly state that
- Do NOT supplement with general knowledge unless no relevant information is found

Answer the user's question based on the search results provided.`;

      const searchResults = toolResult.results
        .map(
          (result: any) =>
            `Memory ID: ${result.id}
Title: ${result.title}
Content: ${result.content}
Category: ${result.category}
Tags: ${JSON.stringify(result.tags)}
Created: ${result.created_at}`
        )
        .join("\n\n---\n\n");

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: `User question: ${query}

Knowledge base search results:
${searchResults}

Please answer the user's question based on these search results.`,
          },
        ],
      });

      return response.choices[0].message.content;
    }

    // Default response for other tools
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Generate a natural response based on the tool's result.",
        },
        {
          role: "user",
          content: `Query: ${query}\nTool result: ${JSON.stringify(
            toolResult
          )}`,
        },
      ],
    });

    return response.choices[0].message.content;
  }

  private updateContext(query: string, response: string) {
    this.context.push(`User: ${query}`, `Assistant: ${response}`);
    if (this.context.length > 10) {
      this.context = this.context.slice(-10);
    }
  }

  private validateAndEnrichResponse(response: any) {
    const tool = this.tools.find((t) => t.name === response.selectedTool);
    if (!tool) {
      throw new Error(`Invalid tool selected: ${response.selectedTool}`);
    }

    return {
      ...response,
      toolInfo: tool,
    };
  }

  private getController(module: string) {
    switch (module) {
      case "text":
        return textController;
      case "image":
        return imageChatController;
      case "scraper":
        return this.searchController;
      case "vector":
        return this.queryVectorController;
      case "audio":
        return audioController;
      case "graph":
        return this.graphController;
      default:
        throw new Error(`Unknown module: ${module}`);
    }
  }

  private async handleImageAnalysis(parameters: any) {
    const { imageUrl, analysisType } = parameters;

    try {
      // Convert image to base64 if it's a file
      let imageBase64 = imageUrl;
      if (imageUrl.startsWith("data:")) {
        imageBase64 = imageUrl.split(",")[1];
      }

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert image analyzer.",
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                    detail: "high",
                  },
                },
                {
                  type: "text",
                  text: `Analyze this image: ${analysisType}`,
                },
              ],
            },
          ],
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${config.openai.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        analysis: response.data.choices[0]?.message?.content,
        success: true,
      };
    } catch (error) {
      console.error("Error in image analysis:", error);
      return {
        error: "Failed to analyze image",
        success: false,
      };
    }
  }

  private async handleWebScraping(parameters: any) {
    // Implement web scraping logic
    return {
      /* web scraping results */
    };
  }

  private async handleDocumentSummary(parameters: any) {
    // Implement document summary logic
    return {
      /* summary results */
    };
  }

  private async handleVectorSearch(parameters: any) {
    // Implement vector search logic
    return {
      /* search results */
    };
  }

  private async executeWebScraper(params: any) {
    try {
      let result;
      await this.searchController.execute(
        {
          body: {
            startUrl: params.url,
            question: params.question,
            maxPages: params.maxPages || 100,
          },
        } as Request,
        {
          json: (data: any) => {
            result = data;
          },
        } as Response
      );

      return {
        success: true,
        result,
      };
    } catch (error) {
      console.error("WebScraper error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check if user wants to save conversation
  private shouldSaveConversation(query: string): boolean {
    const saveCommands = [
      "zapisz tę rozmowę",
      "zapisz konwersację",
      "save this conversation",
      "save conversation",
      "save chat",
      "zapisz chat",
      "zapisz naszą rozmowę",
      "zachowaj rozmowę",
    ];

    const lowerQuery = query.toLowerCase().trim();
    return saveCommands.some((command) =>
      lowerQuery.includes(command.toLowerCase())
    );
  }

  // Save conversation to knowledge base
  private async saveConversationToKnowledge(): Promise<string> {
    try {
      if (this.conversationHistory.length === 0) {
        return "Brak konwersacji do zapisania.";
      }

      console.log(
        "💾 Conversation history to save:",
        this.conversationHistory.length,
        "messages"
      );
      console.log("💾 Last few messages:", this.conversationHistory.slice(-3));

      // Generate FULL conversation text with timestamps and metadata
      const fullConversationText = this.conversationHistory
        .map((entry, index) => {
          const timestamp = entry.timestamp.toLocaleString("pl-PL");
          const speaker = entry.role === "user" ? "👤 Użytkownik" : "🤖 Agent";
          return `[${timestamp}] ${speaker}: ${entry.message}`;
        })
        .join("\n\n");

      console.log(
        "💾 Full conversation text length:",
        fullConversationText.length,
        "characters"
      );

      // Generate title based on conversation
      const titleResponse = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Stwórz krótki, opisowy tytuł dla tej konwersacji (max 60 znaków). Odpowiedz tylko tytułem, bez dodatkowego tekstu.",
          },
          {
            role: "user",
            content: `Główne tematy: ${fullConversationText.substring(
              0,
              500
            )}...`,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      });

      const title =
        titleResponse.choices[0]?.message?.content?.trim() ||
        `Pełna konwersacja z ${new Date().toLocaleDateString()}`;

      // Extract topics for tags
      const topics = this.extractTopicsFromConversation(fullConversationText);

      // Determine importance level based on conversation length and content
      const importanceLevel =
        this.determineImportanceLevel(fullConversationText);

      // Store FULL conversation in knowledge base (not summary!)
      const memory = {
        title,
        user_id: "384779bb-47d0-48ee-a498-cd33e1654f9f", // Używamy ID użytkownika testowego
        tags: [...topics, "pełna_rozmowa", "kompletna_transkrypcja"],
        importance:
          importanceLevel === "critical"
            ? 10
            : importanceLevel === "high"
            ? 8
            : importanceLevel === "medium"
            ? 5
            : 3,
        source: "ai_agent_chat_full",
      };

      const memoryId = await this.knowledgeBase.storeMemory(
        memory,
        fullConversationText,
        memory.user_id
      );

      // Clear conversation history after saving
      this.conversationHistory = [];

      return `✅ Pełna konwersacja została zapisana w bazie wiedzy jako wspomnienie #${memoryId}. Tytuł: "${title}". Zapisano ${this.conversationHistory.length} wiadomości (${fullConversationText.length} znaków) wraz z wektorami embeddingów.`;
    } catch (error) {
      console.error("Error saving conversation to knowledge base:", error);
      return `❌ Wystąpił błąd podczas zapisywania konwersacji: ${error.message}`;
    }
  }

  // Extract topics from conversation for tagging
  private extractTopicsFromConversation(conversationText: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const commonTopics = [
      "AI",
      "machine learning",
      "programming",
      "development",
      "web development",
      "database",
      "API",
      "frontend",
      "backend",
      "React",
      "Node.js",
      "TypeScript",
      "projekt",
      "zadanie",
      "problem",
      "rozwiązanie",
      "implementacja",
      "kod",
      "system",
      "aplikacja",
      "funkcjonalność",
      "optymalizacja",
      "debugging",
      "testy",
      "deployment",
      "dokumentacja",
      "architektura",
      "design",
    ];

    const foundTopics = commonTopics.filter((topic) =>
      conversationText.toLowerCase().includes(topic.toLowerCase())
    );

    // Add up to 5 most relevant topics
    return foundTopics.slice(0, 5);
  }

  // Determine importance level based on conversation characteristics
  private determineImportanceLevel(
    conversationText: string
  ): "low" | "medium" | "high" | "critical" {
    const textLength = conversationText.length;
    const messageCount = this.conversationHistory.length;

    // Keywords that indicate high importance
    const highImportanceKeywords = [
      "błąd",
      "problem",
      "nie działa",
      "pomoc",
      "urgent",
      "ważne",
      "deadline",
      "produkcja",
      "klient",
      "bugfix",
      "security",
      "bezpieczeństwo",
    ];

    const criticalKeywords = [
      "krytyczny",
      "emergency",
      "down",
      "broken",
      "data loss",
      "security breach",
    ];

    const hasHighImportanceKeywords = highImportanceKeywords.some((keyword) =>
      conversationText.toLowerCase().includes(keyword.toLowerCase())
    );

    const hasCriticalKeywords = criticalKeywords.some((keyword) =>
      conversationText.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasCriticalKeywords) return "critical";
    if (hasHighImportanceKeywords || messageCount > 10 || textLength > 2000)
      return "high";
    if (messageCount > 5 || textLength > 1000) return "medium";
    return "low";
  }

  // Calculate conversation duration in minutes
  private calculateConversationDuration(): number {
    if (this.conversationHistory.length < 2) return 0;

    const firstMessage = this.conversationHistory[0];
    const lastMessage =
      this.conversationHistory[this.conversationHistory.length - 1];

    const durationMs =
      lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime();
    return Math.round(durationMs / (1000 * 60)); // Convert to minutes
  }

  // Get conversation history (for debugging or advanced features)
  public getConversationHistory() {
    return this.conversationHistory;
  }

  // Set conversation history (restore from frontend)
  public setConversationHistory(
    history: Array<{
      message: string;
      role: "user" | "agent";
      timestamp: Date;
    }>
  ) {
    this.conversationHistory = history.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp), // Ensure timestamp is Date object
    }));
  }

  // Clear conversation history manually
  public clearConversationHistory() {
    this.conversationHistory = [];
  }
}
