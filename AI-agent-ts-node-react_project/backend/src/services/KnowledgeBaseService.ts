import OpenAI from "openai";
import { pool } from "../config/database";
import config from "../config/config";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface Memory {
  id?: number;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  importance_level?: "low" | "medium" | "high" | "critical";
  source?: string;
  context_data?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface MemoryEmbedding {
  id?: number;
  memory_id: number;
  embedding: number[];
  embedding_model?: string;
  chunk_index?: number;
  chunk_text?: string;
  created_at?: Date;
}

export interface SearchResult extends Memory {
  similarity_score?: number;
  match_type?: "semantic" | "keyword" | "hybrid";
  snippet?: string;
}

export interface SearchOptions {
  limit?: number;
  category?: string;
  importance_level?: string;
  search_type?: "semantic" | "keyword" | "hybrid";
  similarity_threshold?: number;
}

export class KnowledgeBaseService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Generate embedding for text
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  // Chunk large content into smaller pieces
  private chunkContent(content: string, maxChunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const sentences = content.split(/[.!?]+/);
    let currentChunk = "";

    for (const sentence of sentences) {
      if (
        currentChunk.length + sentence.length > maxChunkSize &&
        currentChunk
      ) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ". " : "") + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [content];
  }

  // Store memory in database
  async storeMemory(memory: Memory): Promise<number> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Insert memory
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO memories (title, content, category, tags, importance_level, source, context_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          memory.title,
          memory.content,
          memory.category || null,
          memory.tags ? JSON.stringify(memory.tags) : null,
          memory.importance_level || "medium",
          memory.source || null,
          memory.context_data ? JSON.stringify(memory.context_data) : null,
        ]
      );

      const memoryId = result.insertId;

      // Generate and store embeddings for content chunks
      const chunks = this.chunkContent(memory.content);
      const fullText = `${memory.title}. ${memory.content}`;

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = i === 0 ? fullText : chunks[i];
        const embedding = await this.generateEmbedding(chunkText);

        await connection.execute(
          `INSERT INTO memory_embeddings (memory_id, embedding, chunk_index, chunk_text)
           VALUES (?, ?, ?, ?)`,
          [memoryId, JSON.stringify(embedding), i, chunkText]
        );
      }

      await connection.commit();
      console.log(`✅ Memory stored with ID: ${memoryId}`);
      return memoryId;
    } catch (error) {
      await connection.rollback();
      console.error("Error storing memory:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Search memories using hybrid approach
  async searchMemories(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    const {
      limit = 10,
      category,
      importance_level,
      search_type = "hybrid",
      similarity_threshold = 0.7,
    } = options;

    let results: SearchResult[] = [];

    try {
      if (search_type === "semantic" || search_type === "hybrid") {
        try {
          results = await this.semanticSearch(
            query,
            limit,
            similarity_threshold,
            category,
            importance_level
          );
        } catch (semanticError) {
          console.warn(
            "Semantic search failed, falling back to keyword search:",
            semanticError
          );
          // Fall back to keyword search if semantic search fails
          if (search_type === "semantic") {
            results = await this.keywordSearch(
              query,
              limit,
              category,
              importance_level
            );
          }
        }
      }

      if (search_type === "keyword" || search_type === "hybrid") {
        const keywordResults = await this.keywordSearch(
          query,
          limit,
          category,
          importance_level
        );

        if (search_type === "hybrid") {
          // Merge and deduplicate results
          const existingIds = new Set(results.map((r) => r.id));
          for (const result of keywordResults) {
            if (!existingIds.has(result.id)) {
              result.match_type = "keyword";
              results.push(result);
            }
          }
        } else {
          results = keywordResults;
        }
      }

      // Sort by relevance (similarity score for semantic, or just by importance/date for keyword)
      results.sort((a, b) => {
        if (a.similarity_score && b.similarity_score) {
          return b.similarity_score - a.similarity_score;
        }
        return (
          new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
        );
      });

      // Limit results
      results = results.slice(0, limit);

      // Log search
      const executionTime = Date.now() - startTime;
      await this.logSearch(query, search_type, results.length, executionTime);

      return results;
    } catch (error) {
      console.error("Error searching memories:", error);

      // Final fallback - simple search
      try {
        console.warn("Attempting simple fallback search...");
        const simpleResults = await this.simpleSearch(query, limit);
        return simpleResults;
      } catch (fallbackError) {
        console.error("Even fallback search failed:", fallbackError);
        throw error; // Throw original error
      }
    }
  }

  // Semantic search using embeddings
  private async semanticSearch(
    query: string,
    limit: number,
    threshold: number,
    category?: string,
    importance_level?: string
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    let sql = `
      SELECT m.*, me.embedding, me.chunk_text
      FROM memories m
      JOIN memory_embeddings me ON m.id = me.memory_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (category) {
      sql += " AND m.category = ?";
      params.push(category);
    }

    if (importance_level) {
      sql += " AND m.importance_level = ?";
      params.push(importance_level);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);

    // If no embeddings found, fall back to basic search
    if (rows.length === 0) {
      console.warn(
        "No embeddings found in database, falling back to basic search"
      );
      throw new Error("No embeddings found");
    }

    const results: SearchResult[] = [];

    for (const row of rows) {
      let embedding;
      try {
        // Handle different embedding formats
        if (typeof row.embedding === "string") {
          embedding = JSON.parse(row.embedding);
        } else if (Array.isArray(row.embedding)) {
          embedding = row.embedding;
        } else {
          console.error(
            `Invalid embedding format for memory ${row.id}:`,
            typeof row.embedding
          );
          continue;
        }
      } catch (error) {
        console.error(`Failed to parse embedding for memory ${row.id}:`, error);
        console.error(`Embedding type:`, typeof row.embedding);
        console.error(
          `Embedding sample:`,
          typeof row.embedding === "string"
            ? row.embedding.substring(0, 100)
            : String(row.embedding).substring(0, 100)
        );
        continue; // Skip this row
      }

      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      if (similarity >= threshold) {
        const existingResult = results.find((r) => r.id === row.id);

        if (
          !existingResult ||
          (existingResult.similarity_score &&
            similarity > existingResult.similarity_score)
        ) {
          const memoryData: SearchResult = {
            id: row.id,
            title: row.title,
            content: row.content,
            category: row.category,
            tags: row.tags ? JSON.parse(row.tags) : [],
            importance_level: row.importance_level,
            source: row.source,
            context_data: row.context_data
              ? JSON.parse(row.context_data)
              : null,
            created_at: row.created_at,
            updated_at: row.updated_at,
            similarity_score: similarity,
            match_type: "semantic",
            snippet: row.chunk_text,
          };

          if (existingResult) {
            Object.assign(existingResult, memoryData);
          } else {
            results.push(memoryData);
          }
        }
      }
    }

    return results;
  }

  // Keyword search using MySQL FULLTEXT
  private async keywordSearch(
    query: string,
    limit: number,
    category?: string,
    importance_level?: string
  ): Promise<SearchResult[]> {
    try {
      // Try FULLTEXT search first
      let sql = `
        SELECT *, MATCH(title, content) AGAINST(? IN BOOLEAN MODE) as relevance_score
        FROM memories
        WHERE MATCH(title, content) AGAINST(? IN BOOLEAN MODE)
      `;

      const params: any[] = [query, query];

      if (category) {
        sql += " AND category = ?";
        params.push(category);
      }

      if (importance_level) {
        sql += " AND importance_level = ?";
        params.push(importance_level);
      }

      sql += " ORDER BY relevance_score DESC LIMIT ?";
      params.push(limit);

      const [rows] = await pool.execute<RowDataPacket[]>(sql, params);

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        tags: row.tags ? JSON.parse(row.tags) : [],
        importance_level: row.importance_level,
        source: row.source,
        context_data: row.context_data ? JSON.parse(row.context_data) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        similarity_score: row.relevance_score,
        match_type: "keyword" as const,
      }));
    } catch (error) {
      console.warn(
        "FULLTEXT search failed, falling back to LIKE search:",
        error
      );

      // Fallback to LIKE search if FULLTEXT fails
      let sql = `
        SELECT *, 
        (CASE 
          WHEN title LIKE ? THEN 2.0
          WHEN content LIKE ? THEN 1.0
          ELSE 0.5
        END) as relevance_score
        FROM memories
        WHERE title LIKE ? OR content LIKE ?
      `;

      const likeQuery = `%${query}%`;
      const params: any[] = [likeQuery, likeQuery, likeQuery, likeQuery];

      if (category) {
        sql += " AND category = ?";
        params.push(category);
      }

      if (importance_level) {
        sql += " AND importance_level = ?";
        params.push(importance_level);
      }

      sql += " ORDER BY relevance_score DESC LIMIT ?";
      params.push(limit);

      const [rows] = await pool.execute<RowDataPacket[]>(sql, params);

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        tags: row.tags ? JSON.parse(row.tags) : [],
        importance_level: row.importance_level,
        source: row.source,
        context_data: row.context_data ? JSON.parse(row.context_data) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        similarity_score: row.relevance_score,
        match_type: "keyword" as const,
      }));
    }
  }

  // Get memory by ID
  async getMemoryById(id: number): Promise<Memory | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM memories WHERE id = ?",
      [id]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      importance_level: row.importance_level,
      source: row.source,
      context_data: row.context_data ? JSON.parse(row.context_data) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // Update memory
  async updateMemory(id: number, updates: Partial<Memory>): Promise<boolean> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== "id" && value !== undefined) {
          updateFields.push(`${key} = ?`);
          updateValues.push(
            key === "tags" || key === "context_data"
              ? JSON.stringify(value)
              : value
          );
        }
      });

      if (updateFields.length === 0) return false;

      updateValues.push(id);

      await connection.execute(
        `UPDATE memories SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );

      // If content was updated, regenerate embeddings
      if (updates.content || updates.title) {
        await connection.execute(
          "DELETE FROM memory_embeddings WHERE memory_id = ?",
          [id]
        );

        const memory = await this.getMemoryById(id);
        if (memory) {
          const chunks = this.chunkContent(memory.content);
          const fullText = `${memory.title}. ${memory.content}`;

          for (let i = 0; i < chunks.length; i++) {
            const chunkText = i === 0 ? fullText : chunks[i];
            const embedding = await this.generateEmbedding(chunkText);

            await connection.execute(
              `INSERT INTO memory_embeddings (memory_id, embedding, chunk_index, chunk_text)
               VALUES (?, ?, ?, ?)`,
              [id, JSON.stringify(embedding), i, chunkText]
            );
          }
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error("Error updating memory:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete memory
  async deleteMemory(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM memories WHERE id = ?",
      [id]
    );

    return result.affectedRows > 0;
  }

  // Get all categories
  async getCategories(): Promise<string[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT DISTINCT category FROM memories WHERE category IS NOT NULL ORDER BY category"
    );

    return rows.map((row) => row.category);
  }

  // Get memory statistics
  async getStatistics(): Promise<Record<string, any>> {
    const [totalRows] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM memories"
    );
    const [categoryRows] = await pool.execute<RowDataPacket[]>(
      "SELECT category, COUNT(*) as count FROM memories GROUP BY category"
    );
    const [importanceRows] = await pool.execute<RowDataPacket[]>(
      "SELECT importance_level, COUNT(*) as count FROM memories GROUP BY importance_level"
    );

    return {
      total_memories: totalRows[0].total,
      by_category: categoryRows.reduce(
        (acc, row) => ({
          ...acc,
          [row.category || "uncategorized"]: row.count,
        }),
        {}
      ),
      by_importance: importanceRows.reduce(
        (acc, row) => ({ ...acc, [row.importance_level]: row.count }),
        {}
      ),
    };
  }

  // Simple fallback search - just basic SQL LIKE
  private async simpleSearch(
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    console.log("🔍 Simple search params:", {
      query,
      limit,
      type: typeof limit,
    });

    // First check if table exists and has data
    try {
      const [countResult] = await pool.execute<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM memories"
      );
      console.log("📊 Memories count:", countResult[0]?.count);

      if (countResult[0]?.count === 0) {
        console.log("📭 No memories found in database");
        return [];
      }
    } catch (error) {
      console.error("❌ Error checking memories table:", error);
      return [];
    }

    const sql = `
      SELECT * FROM memories 
      WHERE title LIKE ? OR content LIKE ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;

    const likeQuery = `%${query}%`;
    const params = [likeQuery, likeQuery, parseInt(String(limit))];

    console.log("🔍 SQL:", sql.replace(/\s+/g, " ").trim());
    console.log(
      "🔍 Params:",
      params,
      "Types:",
      params.map((p) => typeof p)
    );

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      importance_level: row.importance_level,
      source: row.source,
      context_data: row.context_data ? JSON.parse(row.context_data) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      similarity_score: 0.5, // Default score for simple search
      match_type: "keyword" as const,
    }));
  }

  // Log search for analytics
  private async logSearch(
    query: string,
    searchType: string,
    resultCount: number,
    executionTime: number
  ): Promise<void> {
    try {
      await pool.execute(
        "INSERT INTO search_history (query, search_type, results_count, execution_time_ms) VALUES (?, ?, ?, ?)",
        [query, searchType, resultCount, executionTime]
      );
    } catch (error) {
      console.error("Error logging search:", error);
    }
  }
}
