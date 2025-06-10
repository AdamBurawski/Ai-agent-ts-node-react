import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import {
  KnowledgeBaseService,
  Memory,
  SearchOptions,
} from "../services/KnowledgeBaseService";

const knowledgeBase = new KnowledgeBaseService();

// Store new memory
export class StoreMemoryController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const memory: Memory = req.body;

      if (!memory.title || !memory.content) {
        res.status(400).json({ error: "Title and content are required" });
        return;
      }

      const memoryId = await knowledgeBase.storeMemory(memory);

      res.json({
        success: true,
        memory_id: memoryId,
        message: "Memory stored successfully",
      });
    } catch (error) {
      console.error("Error storing memory:", error);
      res.status(500).json({ error: "Failed to store memory" });
    }
  }
}

// Search memories
export class SearchMemoriesController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.body;
      const options: SearchOptions = {
        limit: parseInt(req.body.limit) || 10,
        category: req.body.category,
        importance_level: req.body.importance_level,
        search_type: req.body.search_type || "hybrid",
        similarity_threshold: parseFloat(req.body.similarity_threshold) || 0.7,
      };

      if (!query || typeof query !== "string") {
        res.status(400).json({ error: "Query string is required" });
        return;
      }

      const results = await knowledgeBase.searchMemories(query, options);

      res.json({
        success: true,
        results,
        total: results.length,
        search_options: options,
      });
    } catch (error) {
      console.error("Error searching memories:", error);
      res.status(500).json({ error: "Failed to search memories" });
    }
  }
}

// Get memory by ID
export class GetMemoryController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const memoryId = parseInt(id);

      if (isNaN(memoryId)) {
        res.status(400).json({ error: "Invalid memory ID" });
        return;
      }

      const memory = await knowledgeBase.getMemoryById(memoryId);

      if (!memory) {
        res.status(404).json({ error: "Memory not found" });
        return;
      }

      res.json({
        success: true,
        memory,
      });
    } catch (error) {
      console.error("Error getting memory:", error);
      res.status(500).json({ error: "Failed to get memory" });
    }
  }
}

// Update memory
export class UpdateMemoryController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const memoryId = parseInt(id);
      const updates: Partial<Memory> = req.body;

      if (isNaN(memoryId)) {
        res.status(400).json({ error: "Invalid memory ID" });
        return;
      }

      const success = await knowledgeBase.updateMemory(memoryId, updates);

      if (!success) {
        res.status(404).json({ error: "Memory not found or no changes made" });
        return;
      }

      res.json({
        success: true,
        message: "Memory updated successfully",
      });
    } catch (error) {
      console.error("Error updating memory:", error);
      res.status(500).json({ error: "Failed to update memory" });
    }
  }
}

// Delete memory
export class DeleteMemoryController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const memoryId = parseInt(id);

      if (isNaN(memoryId)) {
        res.status(400).json({ error: "Invalid memory ID" });
        return;
      }

      const success = await knowledgeBase.deleteMemory(memoryId);

      if (!success) {
        res.status(404).json({ error: "Memory not found" });
        return;
      }

      res.json({
        success: true,
        message: "Memory deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting memory:", error);
      res.status(500).json({ error: "Failed to delete memory" });
    }
  }
}

// Get categories
export class GetCategoriesController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const categories = await knowledgeBase.getCategories();

      res.json({
        success: true,
        categories,
      });
    } catch (error) {
      console.error("Error getting categories:", error);
      res.status(500).json({ error: "Failed to get categories" });
    }
  }
}

// Get statistics
export class GetStatisticsController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await knowledgeBase.getStatistics();

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error("Error getting statistics:", error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  }
}

// Bulk import memories (for migrating existing data)
export class BulkImportController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { memories } = req.body;

      if (!Array.isArray(memories)) {
        res.status(400).json({ error: "Memories array is required" });
        return;
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const memory of memories) {
        try {
          if (memory.title && memory.content) {
            const memoryId = await knowledgeBase.storeMemory(memory);
            results.push({
              success: true,
              memory_id: memoryId,
              title: memory.title,
            });
            successCount++;
          } else {
            results.push({
              success: false,
              error: "Missing title or content",
              title: memory.title || "Unknown",
            });
            errorCount++;
          }
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            title: memory.title || "Unknown",
          });
          errorCount++;
        }
      }

      res.json({
        success: true,
        message: `Bulk import completed: ${successCount} successful, ${errorCount} failed`,
        summary: {
          total: memories.length,
          successful: successCount,
          failed: errorCount,
        },
        results,
      });
    } catch (error) {
      console.error("Error in bulk import:", error);
      res.status(500).json({ error: "Failed to import memories" });
    }
  }
}
