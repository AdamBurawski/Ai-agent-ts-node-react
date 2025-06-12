import { Router } from "express";
import {
  StoreMemoryController,
  SearchMemoriesController,
  GetMemoryController,
  UpdateMemoryController,
  DeleteMemoryController,
  GetCategoriesController,
  GetStatisticsController,
  BulkImportController,
} from "../controllers/knowledgeBaseController";
import { KnowledgeBaseService } from "../services/KnowledgeBaseService";
import { Request, Response } from "express";

const router = Router();

const storeMemoryController = new StoreMemoryController();
const searchMemoriesController = new SearchMemoriesController();
const getMemoryController = new GetMemoryController();
const updateMemoryController = new UpdateMemoryController();
const deleteMemoryController = new DeleteMemoryController();
const getCategoriesController = new GetCategoriesController();
const getStatisticsController = new GetStatisticsController();
const bulkImportController = new BulkImportController();

// POST /api/knowledge/memories - Store new memory
router.post("/memories", (req, res) => {
  storeMemoryController.execute(req, res);
});

// POST /api/knowledge/search - Search memories
router.post("/search", (req, res) => {
  searchMemoriesController.execute(req, res);
});

// GET /api/knowledge/memories/:id - Get memory by ID
router.get("/memories/:id", (req, res) => {
  getMemoryController.execute(req, res);
});

// PUT /api/knowledge/memories/:id - Update memory
router.put("/memories/:id", (req, res) => {
  updateMemoryController.execute(req, res);
});

// DELETE /api/knowledge/memories/:id - Delete memory
router.delete("/memories/:id", (req, res) => {
  deleteMemoryController.execute(req, res);
});

// GET /api/knowledge/categories - Get all categories
router.get("/categories", (req, res) => {
  getCategoriesController.execute(req, res);
});

// GET /api/knowledge/statistics - Get database statistics
router.get("/statistics", (req, res) => {
  getStatisticsController.execute(req, res);
});

// POST /api/knowledge/bulk-import - Bulk import memories
router.post("/bulk-import", (req, res) => {
  bulkImportController.execute(req, res);
});

// GET /api/knowledge/debug - Debug endpoint to check database content
router.get("/debug", async (req, res) => {
  try {
    const { supabase } = await import("../config/database");

    // Get all memories
    const { data: memories, error: memoriesError } = await supabase
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (memoriesError) throw memoriesError;

    // Get all memory chunks count
    const { count: embeddingCount, error: countError } = await supabase
      .from("memory_chunks")
      .select("*", { count: "exact", head: true });

    if (countError) throw countError;

    // Get recent search history
    const { data: searchHistory, error: searchError } = await supabase
      .from("search_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (searchError) throw searchError;

    res.json({
      success: true,
      data: {
        memories_count: memories ? memories.length : 0,
        recent_memories: memories,
        embeddings_count: embeddingCount || 0,
        recent_searches: searchHistory,
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({ error: "Debug failed", details: error.message });
  }
});

// Test endpoint for debugging database connection
router.get("/test-db", async (req: Request, res: Response) => {
  try {
    console.log("🧪 Testing database connection...");

    const knowledgeBase = new KnowledgeBaseService();

    // Test basic queries
    const stats = await knowledgeBase.getStatistics();
    const categories = await knowledgeBase.getCategories();

    res.json({
      success: true,
      message: "Database connection successful",
      data: {
        statistics: stats,
        categories: categories,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Database test failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: error,
    });
  }
});

// GET /api/knowledge/all - Get all memories without search
router.get("/all", async (req: Request, res: Response) => {
  try {
    console.log("🔍 Getting all memories...");

    const { supabase } = await import("../config/database");
    const { data: rows, error } = await supabase
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      message: `Found ${rows ? rows.length : 0} memories`,
      data: rows,
    });
  } catch (error) {
    console.error("❌ Get all memories failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
