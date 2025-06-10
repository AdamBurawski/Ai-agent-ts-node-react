import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import config from "../config/config";
import OpenAI from "openai";

// Mock database - w prawdziwej aplikacji byłaby to rzeczywista baza danych
const mockDatabase = {
  users: [
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      age: 30,
      city: "New York",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      age: 25,
      city: "Los Angeles",
    },
    {
      id: 3,
      name: "Bob Johnson",
      email: "bob@example.com",
      age: 35,
      city: "Chicago",
    },
    {
      id: 4,
      name: "Alice Brown",
      email: "alice@example.com",
      age: 28,
      city: "Miami",
    },
  ],
  products: [
    {
      id: 1,
      name: "Laptop",
      price: 999.99,
      category: "Electronics",
      stock: 50,
    },
    {
      id: 2,
      name: "Phone",
      price: 699.99,
      category: "Electronics",
      stock: 100,
    },
    { id: 3, name: "Book", price: 19.99, category: "Education", stock: 200 },
    { id: 4, name: "Desk", price: 299.99, category: "Furniture", stock: 25 },
  ],
  orders: [
    { id: 1, user_id: 1, product_id: 1, quantity: 1, order_date: "2024-01-15" },
    { id: 2, user_id: 2, product_id: 2, quantity: 2, order_date: "2024-01-16" },
    { id: 3, user_id: 1, product_id: 3, quantity: 3, order_date: "2024-01-17" },
    { id: 4, user_id: 3, product_id: 1, quantity: 1, order_date: "2024-01-18" },
  ],
};

// Get table structure
export class TableStructureController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const tables = Object.keys(mockDatabase);

      res.json({
        tables,
        message: "Database structure retrieved successfully",
      });
    } catch (error) {
      console.error("Error fetching table structure:", error);
      res.status(500).json({ error: "Failed to fetch table structure" });
    }
  }
}

// Get table details (columns)
export class TableDetailsController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { tables } = req.body;

      if (!tables || !Array.isArray(tables)) {
        res.status(400).json({ error: "Tables array is required" });
        return;
      }

      const details: Record<string, { columns: string[] }> = {};

      tables.forEach((tableName) => {
        if (mockDatabase[tableName]) {
          const sampleRecord = mockDatabase[tableName][0];
          if (sampleRecord) {
            details[tableName] = {
              columns: Object.keys(sampleRecord),
            };
          }
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
      const { question, tableStructures } = req.body;

      if (!question || !tableStructures) {
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

      const prompt = `Given this database schema:

${schemaDescription}

Sample data preview:
${JSON.stringify(mockDatabase, null, 2)}

Generate a SQL query to answer this question: "${question}"

Rules:
- Return ONLY the SQL query, no explanation
- Use standard SQL syntax
- Use proper table and column names from the schema
- Make sure the query is executable

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

      const sqlQuery = completion.choices[0]?.message?.content?.trim() || "";

      if (!sqlQuery) {
        res.status(500).json({ error: "Failed to generate SQL query" });
        return;
      }

      res.json({ sqlQuery });
    } catch (error) {
      console.error("Error generating SQL:", error);
      res.status(500).json({ error: "Failed to generate SQL query" });
    }
  }
}

// Execute SQL query (simplified for mock database)
export class ExecuteSQLController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { sqlQuery } = req.body;

      if (!sqlQuery) {
        res.status(400).json({ error: "SQL query is required" });
        return;
      }

      console.log("Executing SQL:", sqlQuery);

      // Simple mock execution - in real app this would use a proper SQL engine
      const result = this.mockExecuteSQL(sqlQuery);

      res.json({ result });
    } catch (error) {
      console.error("Error executing SQL:", error);
      res.status(500).json({ error: "Failed to execute SQL query" });
    }
  }

  private mockExecuteSQL(sqlQuery: string): any[] {
    const query = sqlQuery.toLowerCase().trim();

    // Very basic SQL parsing for demonstration
    if (query.includes("select") && query.includes("users")) {
      if (query.includes("where") && query.includes("age")) {
        return mockDatabase.users.filter((user) => user.age > 25);
      }
      return mockDatabase.users;
    }

    if (query.includes("select") && query.includes("products")) {
      if (query.includes("where") && query.includes("price")) {
        return mockDatabase.products.filter((product) => product.price < 500);
      }
      return mockDatabase.products;
    }

    if (query.includes("select") && query.includes("orders")) {
      return mockDatabase.orders;
    }

    if (query.includes("count")) {
      if (query.includes("users")) {
        return [{ count: mockDatabase.users.length }];
      }
      if (query.includes("products")) {
        return [{ count: mockDatabase.products.length }];
      }
      if (query.includes("orders")) {
        return [{ count: mockDatabase.orders.length }];
      }
    }

    // Default response
    return [
      {
        message: "Query executed successfully",
        note:
          "This is a mock database. Query: " +
          sqlQuery.substring(0, 50) +
          "...",
      },
    ];
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
