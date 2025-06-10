import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import { AgentService } from "../services/AgentService";
import config from "../config/config";

export class AgentController implements BaseController {
  async execute(req: Request, res: Response): Promise<void | Response> {
    try {
      console.log("Received request body:", req.body);
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const agentService = new AgentService(config.openai.apiKey);
      const analysis = await agentService.analyzeRequest(query);

      if (!analysis) {
        return res.status(500).json({ error: "Failed to analyze request" });
      }

      return res.json(analysis);
    } catch (error) {
      console.error("Error in agent execution:", error);
      return res.status(500).json({ error: error.message });
    }
  }
}

export const agentController = new AgentController();
