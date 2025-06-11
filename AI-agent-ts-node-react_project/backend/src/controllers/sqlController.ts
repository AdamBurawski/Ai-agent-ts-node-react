import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import config from "../config/config";
import OpenAI from "openai";
import { pool } from "../config/database";

// Knowledge Base SQL Module - for querying memories, embeddings and search history

// Get table structure - Knowledge Base tables
export class TableStructureController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      // Return knowledge base tables
      const tables = ["memories", "memory_embeddings", "search_history"];

      res.json({
        tables,
        message: "Knowledge base structure retrieved successfully",
      });
    } catch (error) {
      console.error("Error fetching table structure:", error);
      res.status(500).json({ error: "Failed to fetch table structure" });
    }
  }
}

// Get table details (columns) - Knowledge Base schema
export class TableDetailsController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { tables } = req.body;

      if (!tables || !Array.isArray(tables)) {
        res.status(400).json({ error: "Tables array is required" });
        return;
      }

      const details: Record<string, { columns: string[] }> = {};

      // Define knowledge base table structures
      const knowledgeBaseSchema = {
        memories: {
          columns: [
            "id",
            "title",
            "content",
            "category",
            "tags",
            "importance_level",
            "source",
            "context_data",
            "created_at",
            "updated_at",
          ],
        },
        memory_embeddings: {
          columns: [
            "id",
            "memory_id",
            "embedding",
            "embedding_model",
            "chunk_index",
            "chunk_text",
            "created_at",
          ],
        },
        search_history: {
          columns: [
            "id",
            "query",
            "search_type",
            "results_count",
            "execution_time_ms",
            "created_at",
          ],
        },
      };

      tables.forEach((tableName) => {
        if (knowledgeBaseSchema[tableName]) {
          details[tableName] = knowledgeBaseSchema[tableName];
        }
      });

      res.json({ details });
    } catch (error) {
      console.error("Error fetching table details:", error);
      res.status(500).json({ error: "Failed to fetch table details" });
    }
  }
}

// Generate SQL query using OpenAI
export class GenerateSQLController implements BaseController {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async execute(req: Request, res: Response): Promise<void> {
    try {
      console.log("🔍 Generate SQL request received:", req.body);
      const { question, tableStructures } = req.body;

      if (!question || !tableStructures) {
        console.log("❌ Missing question or tableStructures:", {
          question,
          tableStructures,
        });
        res
          .status(400)
          .json({ error: "Question and table structures are required" });
        return;
      }

      // Create schema description
      const schemaDescription = Object.entries(tableStructures)
        .map(
          ([tableName, tableInfo]: [string, any]) =>
            `Table: ${tableName}\nColumns: ${tableInfo.columns.join(", ")}`
        )
        .join("\n\n");

      const prompt = `Given this Knowledge Base database schema:

${schemaDescription}

Table descriptions:
- memories: Main knowledge storage with title, content, category, tags, importance_level, source, context_data
- memory_embeddings: Vector embeddings for semantic search with memory_id, embedding, chunk_text  
- search_history: Search query logs with query, search_type, results_count, execution_time_ms

Generate a SQL query to answer this question: "${question}"

Rules:
- Return ONLY the SQL query, no explanation, no markdown formatting
- Do NOT wrap in code blocks or markdown formatting
- Use standard SQL syntax compatible with MySQL
- Use proper table and column names from the schema
- For JSON columns (tags, context_data, embedding), use JSON functions like JSON_EXTRACT()
- Focus on practical queries for knowledge retrieval and analysis
- Make sure the query is executable
- End with semicolon

SQL Query:`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a SQL expert. Generate only valid SQL queries based on the provided schema.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      let sqlQuery = completion.choices[0]?.message?.content?.trim() || "";

      if (!sqlQuery) {
        res.status(500).json({ error: "Failed to generate SQL query" });
        return;
      }

      // Clean up markdown formatting from OpenAI response
      sqlQuery = sqlQuery
        .replace(/```sql\s*/g, "") // Remove ```sql
        .replace(/```\s*/g, "") // Remove closing ```
        .replace(/^sql\s*/i, "") // Remove 'sql' prefix if present
        .trim();

      // Ensure query ends with semicolon
      if (!sqlQuery.endsWith(";")) {
        sqlQuery += ";";
      }

      res.json({ sqlQuery });
    } catch (error) {
      console.error("Error generating SQL:", error);
      res.status(500).json({ error: "Failed to generate SQL query" });
    }
  }
}

// Execute SQL query on Knowledge Base
export class ExecuteSQLController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { sqlQuery } = req.body;

      if (!sqlQuery) {
        res.status(400).json({ error: "SQL query is required" });
        return;
      }

      console.log("Executing SQL on Knowledge Base:", sqlQuery);

      // Security check - only allow SELECT queries
      const normalizedQuery = sqlQuery.trim().toLowerCase();
      if (!normalizedQuery.startsWith("select")) {
        res.status(400).json({
          error: "Only SELECT queries are allowed for security reasons",
        });
        return;
      }

      // Additional security check - block dangerous keywords
      const dangerousKeywords = [
        "drop",
        "delete",
        "update",
        "insert",
        "alter",
        "create",
        "truncate",
      ];
      const hasDangerousKeyword = dangerousKeywords.some((keyword) =>
        normalizedQuery.includes(keyword)
      );

      if (hasDangerousKeyword) {
        res.status(400).json({
          error:
            "Query contains prohibited keywords. Only SELECT queries allowed.",
        });
        return;
      }

      // Execute the query on the actual knowledge base
      const [rows] = await pool.execute(sqlQuery);

      // Convert result to plain objects and handle JSON columns
      const result = Array.isArray(rows)
        ? rows.map((row: any) => {
            const plainRow = { ...row };

            // Parse JSON columns for better display
            if (plainRow.tags && typeof plainRow.tags === "string") {
              try {
                plainRow.tags = JSON.parse(plainRow.tags);
              } catch (e) {
                // Keep as string if parsing fails
              }
            }

            if (
              plainRow.context_data &&
              typeof plainRow.context_data === "string"
            ) {
              try {
                plainRow.context_data = JSON.parse(plainRow.context_data);
              } catch (e) {
                // Keep as string if parsing fails
              }
            }

            // For embeddings, just show info instead of full vector
            if (plainRow.embedding) {
              plainRow.embedding_info = `Vector (${
                Array.isArray(plainRow.embedding)
                  ? plainRow.embedding.length
                  : "N/A"
              } dimensions)`;
              delete plainRow.embedding; // Remove actual vector for cleaner display
            }

            return plainRow;
          })
        : [];

      res.json({
        result,
        rowCount: result.length,
        query: sqlQuery,
      });
    } catch (error: any) {
      console.error("Error executing SQL:", error);
      res.status(500).json({
        error: "Failed to execute SQL query",
        details: error.message,
      });
    }
  }
}

// Submit query result
export class SubmitResultController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { result } = req.body;

      if (!result) {
        res.status(400).json({ error: "Result is required" });
        return;
      }

      console.log("Result submitted:", result);

      res.json({
        message: "Result submitted successfully",
        timestamp: new Date().toISOString(),
        resultCount: Array.isArray(result) ? result.length : 1,
      });
    } catch (error) {
      console.error("Error submitting result:", error);
      res.status(500).json({ error: "Failed to submit result" });
    }
  }
}
