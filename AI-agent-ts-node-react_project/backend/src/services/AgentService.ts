import * as fs from "fs/promises";
import {
  audioController,
  ProcessFolderController,
} from "../controllers/audioController";
import { textController } from "../controllers/textController";
import { imageChatController } from "../controllers/imageChatController";
import { searchController } from "../controllers/searchController";
import { queryVectorController } from "../controllers/queryVectorController";
import { processFolderController } from "../controllers/processFolderController";
import { Response, Request } from "express";
import OpenAI from "openai";
import config from "../config/config";
import axios from "axios";
import { ImageChatController } from "../controllers/imageController";
import { SearchController } from "../controllers/scraperController";
import { QueryVectorController } from "../controllers/vectorController";
import { WebScraper } from "./WebScraper";
import path from "path";
import { tools } from "../config/tools";
import { ShortestPathController } from "../controllers/graphController";
import { ProcessImagesController } from "../controllers/imageController";

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
  private openaiApiKey: string;
  private searchController: SearchController;
  private queryVectorController: QueryVectorController;
  private graphController: ShortestPathController;
  private audioController = audioController;
  private imageController: ProcessImagesController;
  private imageChatController: ImageChatController;
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
  ];

  constructor(openaiApiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.webScraper = new WebScraper(openaiApiKey);
    this.openaiApiKey = openaiApiKey;
    this.searchController = new SearchController();
    this.queryVectorController = new QueryVectorController();
    this.graphController = new ShortestPathController();
    this.imageController = new ProcessImagesController();
    this.imageChatController = new ImageChatController();
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

      // Get tool selection from GPT
      const toolSelection = await this.selectTool(query);
      console.log("Tool selection result:", toolSelection);

      if (!toolSelection.tool) {
        const response = {
          analysis: {
            selectedTool: null,
            reasoning: "Direct response",
            plan: [],
            parameters: {},
          },
          result: { message: toolSelection.response },
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

      return {
        analysis: {
          selectedTool: toolSelection.tool,
          reasoning: toolSelection.reasoning || "Tool selected based on query",
          plan: toolSelection.plan || [],
          parameters: toolSelection.parameters || {},
        },
        result: result,
      };
    } catch (error) {
      console.error("Error in agent analysis:", error);
      throw error;
    }
  }

  async selectTool(query: string): Promise<ToolSelection> {
    const systemMessage = `You are a JSON-only response tool selector. You must ALWAYS respond with valid JSON.
Available tools and when to use them:
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
      case "text_reader":
        const textFiles = await this.findFilesInUploads(".txt");
        if (textFiles.length === 0) {
          throw new Error("No text files found in uploads directory");
        }

        const textReq = {
          body: { filename: textFiles[0] },
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
}
