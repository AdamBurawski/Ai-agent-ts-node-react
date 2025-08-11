import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import {
  SupabaseKnowledgeBaseService,
  Memory,
  SearchOptions,
} from "../services/SupabaseKnowledgeBaseService";

const knowledgeBase = new SupabaseKnowledgeBaseService();

// Store new memory - Supabase version
export class SupabaseStoreMemoryController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { title, content, tags, importance, source } = req.body;

      // For now using test user ID - in production this would come from auth
      const userId = "503eb63f-7cdb-4192-a032-85da0725ff05";

      if (!title || !content) {
        res.status(400).json({ error: "Title and content are required" });
        return;
      }

      const memory: Memory = {
        title,
        user_id: userId,
        tags: tags || [],
        importance: importance || 5,
        source: source || "manual_entry",
      };

      const memoryId = await knowledgeBase.storeMemory(memory, content, userId);

      res.json({
        success: true,
        memory_id: memoryId,
        message: "Memory stored successfully",
      });
    } catch (error) {
      console.error("Error storing memory:", error);
      console.error("Error type:", typeof error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      console.error("Error message:", error?.message);
      res.status(500).json({
        error: "Failed to store memory",
        details: error?.message || "Unknown error",
      });
    }
  }
}

// Search memories - Supabase version
export class SupabaseSearchMemoriesController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit, similarity_threshold } = req.body;
      const userId = "503eb63f-7cdb-4192-a032-85da0725ff05";

      if (!query || typeof query !== "string") {
        res.status(400).json({ error: "Query string is required" });
        return;
      }

      // For now, we'll use a simple approach since SupabaseKnowledgeBaseService
      // doesn't have a searchMemories method yet
      const stats = await knowledgeBase.getStatistics(userId);

      res.json({
        success: true,
        results: [],
        total: 0,
        message: "Search functionality coming soon",
        stats: stats,
      });
    } catch (error) {
      console.error("Error searching memories:", error);
      res.status(500).json({ error: "Failed to search memories" });
    }
  }
}

// Get memory by ID - Supabase version
export class SupabaseGetMemoryController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = "503eb63f-7cdb-4192-a032-85da0725ff05";

      const result = await knowledgeBase.getMemoryById(id, userId);

      if (!result.memory) {
        res.status(404).json({ error: "Memory not found" });
        return;
      }

      res.json({
        success: true,
        memory: result.memory,
        chunks: result.chunks,
      });
    } catch (error) {
      console.error("Error getting memory:", error);
      res.status(500).json({ error: "Failed to get memory" });
    }
  }
}

// Get statistics - Supabase version
export class SupabaseGetStatisticsController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const userId = "503eb63f-7cdb-4192-a032-85da0725ff05";

      const stats = await knowledgeBase.getStatistics(userId);

      res.json({
        success: true,
        statistics: stats,
      });
    } catch (error) {
      console.error("Error getting statistics:", error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  }
}

// Get categories - Supabase version
export class SupabaseGetCategoriesController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const userId = "503eb63f-7cdb-4192-a032-85da0725ff05";

      const categories = await knowledgeBase.getCategories(userId);

      res.json({
        success: true,
        categories: categories,
      });
    } catch (error) {
      console.error("Error getting categories:", error);
      res.status(500).json({ error: "Failed to get categories" });
    }
  }
}
