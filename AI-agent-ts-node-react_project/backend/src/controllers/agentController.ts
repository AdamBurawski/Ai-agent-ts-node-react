import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import { AgentService } from "../services/AgentService";
import config from "../config/config";

// Singleton instance to maintain conversation history
let globalAgentService: AgentService | null = null;

export class AgentController implements BaseController {
  async execute(req: Request, res: Response): Promise<void | Response> {
    try {
      console.log("Received request body:", req.body);
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Use singleton to maintain conversation history between requests
      if (!globalAgentService) {
        console.log("🔄 Creating new AgentService instance");
        globalAgentService = new AgentService(config.openai.apiKey);
      } else {
        console.log("♻️ Reusing existing AgentService instance");
      }

      const analysis = await globalAgentService.analyzeRequest(query);

      if (!analysis) {
        return res.status(500).json({ error: "Failed to analyze request" });
      }

      // Extract the actual response text from the analysis
      // Priority: finalResponse > result.message > result.content > result itself if string
      let responseText = "";

      if (analysis.finalResponse) {
        responseText = analysis.finalResponse;
      } else if (analysis.result?.message) {
        responseText = analysis.result.message;
      } else if (analysis.result?.content) {
        responseText = analysis.result.content;
      } else if (typeof analysis.result === "string") {
        responseText = analysis.result;
      } else {
        responseText = "Wykonano akcję pomyślnie.";
      }

      // Return simple text response instead of complex JSON structure
      return res.json({
        response: responseText,
        success: true,
      });
    } catch (error) {
      console.error("Error in agent execution:", error);
      return res.status(500).json({ error: error.message });
    }
  }
}

// Helper function to clear conversation history
export const clearConversationHistory = () => {
  if (globalAgentService) {
    globalAgentService.clearConversationHistory();
    console.log("🧹 Conversation history cleared");
  }
};

// Helper function to get conversation history
export const getConversationHistory = () => {
  if (globalAgentService) {
    return globalAgentService.getConversationHistory();
  }
  return [];
};

export const agentController = new AgentController();
