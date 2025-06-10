import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import { AgentService } from "../services/AgentService";
import config from "../config/config";

export class AgentController implements BaseController {
  async execute(req: Request, res: Response): Promise<void | Response> {
    try {
      console.log("Received request body:", req.body);
      const { query, conversationHistory } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Create new AgentService instance for each request (no persistence)
      console.log("🔄 Creating new AgentService instance for fresh context");
      const agentService = new AgentService(config.openai.apiKey);

      // If conversation history is provided, restore it
      if (conversationHistory && Array.isArray(conversationHistory)) {
        console.log(
          `📝 Restoring conversation history: ${conversationHistory.length} messages`
        );
        agentService.setConversationHistory(conversationHistory);
      }

      const analysis = await agentService.analyzeRequest(query);

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

export const agentController = new AgentController();
