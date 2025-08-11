import { Router } from "express";
import {
  SupabaseStoreMemoryController,
  SupabaseSearchMemoriesController,
  SupabaseGetMemoryController,
  SupabaseGetStatisticsController,
  SupabaseGetCategoriesController,
} from "../controllers/supabaseKnowledgeBaseController";
import { SupabaseKnowledgeBaseService } from "../services/SupabaseKnowledgeBaseService";
import { Request, Response } from "express";

const router = Router();

const storeMemoryController = new SupabaseStoreMemoryController();
const searchMemoriesController = new SupabaseSearchMemoriesController();
const getMemoryController = new SupabaseGetMemoryController();
const getCategoriesController = new SupabaseGetCategoriesController();
const getStatisticsController = new SupabaseGetStatisticsController();

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

// TODO: Implement update and delete endpoints for Supabase

// GET /api/knowledge/categories - Get all categories
router.get("/categories", (req, res) => {
  getCategoriesController.execute(req, res);
});

// GET /api/knowledge/statistics - Get database statistics
router.get("/statistics", (req, res) => {
  getStatisticsController.execute(req, res);
});

// TODO: Implement bulk import for Supabase

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

    const knowledgeBase = new SupabaseKnowledgeBaseService();
    const testUserId = "503eb63f-7cdb-4192-a032-85da0725ff05";

    // Test basic queries
    const stats = await knowledgeBase.getStatistics(testUserId);
    const categories = await knowledgeBase.getCategories(testUserId);

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
