import OpenAI from "openai";
import { supabase } from "../config/database";
import config from "../config/config";

export interface Memory {
  id?: string;
  user_id: string;
  title: string;
  source?: string;
  tags?: string[];
  importance?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface MemoryChunk {
  id?: string;
  memory_id: string;
  user_id: string;
  content: string;
  embedding?: number[];
  created_at?: Date;
}

export interface SearchResult extends Memory {
  content?: string;
  similarity_score?: number;
}

export interface SearchOptions {
  limit?: number;
  category_id?: string;
  importance_min?: number;
  importance_max?: number;
  similarity_threshold?: number;
}

export class SupabaseKnowledgeBaseService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
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
  async storeMemory(
    memory: Memory,
    content: string,
    userId: string
  ): Promise<string | null> {
    try {
      // Insert memory
      const { data: memoryData, error: memoryError } = await supabase
        .from("memories")
        .insert({
          user_id: userId,
          title: memory.title,
          source: memory.source || null,
          tags: memory.tags || [],
          importance: memory.importance || 5,
        })
        .select()
        .single();

      if (memoryError) throw memoryError;

      const memoryId = memoryData.id;

      // Generate and store embeddings for content chunks
      const chunks = this.chunkContent(content);

      for (const chunk of chunks) {
        const embedding = await this.generateEmbedding(chunk);

        const { error: chunkError } = await supabase
          .from("memory_chunks")
          .insert({
            memory_id: memoryId,
            user_id: userId,
            content: chunk,
            embedding: embedding,
          });

        if (chunkError) throw chunkError;
      }

      console.log(`✅ Memory stored with ID: ${memoryId}`);
      return memoryId;
    } catch (error) {
      console.error("Error storing memory:", error);
      throw error;
    }
  }

  // Get memory by ID
  async getMemoryById(
    id: string,
    userId: string
  ): Promise<{ memory: Memory | null; chunks: string[] }> {
    try {
      // Get memory
      const { data: memory, error: memoryError } = await supabase
        .from("memories")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (memoryError) throw memoryError;

      // Get memory chunks
      const { data: chunks, error: chunksError } = await supabase
        .from("memory_chunks")
        .select("content")
        .eq("memory_id", id)
        .eq("user_id", userId);

      if (chunksError) throw chunksError;

      return {
        memory,
        chunks: chunks.map((chunk) => chunk.content),
      };
    } catch (error) {
      console.error("Error getting memory:", error);
      return { memory: null, chunks: [] };
    }
  }

  // Update memory
  async updateMemory(
    id: string,
    updates: Partial<Memory>,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("memories")
        .update({
          title: updates.title,
          source: updates.source,
          tags: updates.tags,
          importance: updates.importance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating memory:", error);
      return false;
    }
  }

  // Delete memory
  async deleteMemory(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting memory:", error);
      return false;
    }
  }

  // Get categories
  async getCategories(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  }

  // Get statistics
  async getStatistics(userId: string): Promise<Record<string, any>> {
    try {
      // Get memory count
      const { count: memoryCount, error: memoryError } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (memoryError) throw memoryError;

      // Get chunk count
      const { count: chunkCount, error: chunkError } = await supabase
        .from("memory_chunks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (chunkError) throw chunkError;

      // Get category count
      const { count: categoryCount, error: categoryError } = await supabase
        .from("categories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (categoryError) throw categoryError;

      return {
        memory_count: memoryCount || 0,
        chunk_count: chunkCount || 0,
        category_count: categoryCount || 0,
      };
    } catch (error) {
      console.error("Error getting statistics:", error);
      return {
        memory_count: 0,
        chunk_count: 0,
        category_count: 0,
      };
    }
  }
}

export default SupabaseKnowledgeBaseService;
