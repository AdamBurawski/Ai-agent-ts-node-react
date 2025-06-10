import mysql from "mysql2/promise";
import config from "./config";

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "8889"), // MAMP default port
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root", // MAMP default
  database: process.env.DB_NAME || "agent_knowledge_base",
};

// Create connection pool
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  try {
    // Create database if it doesn't exist
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await tempConnection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``
    );
    await tempConnection.end();

    // Create tables
    await createTables();
    console.log("✅ Database schema initialized");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
}

async function createTables(): Promise<void> {
  const createMemoriesTable = `
    CREATE TABLE IF NOT EXISTS memories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(100),
      tags JSON,
      importance_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
      source VARCHAR(255),
      context_data JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category (category),
      INDEX idx_importance (importance_level),
      INDEX idx_created_at (created_at),
      FULLTEXT(title, content)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createEmbeddingsTable = `
    CREATE TABLE IF NOT EXISTS memory_embeddings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      memory_id INT NOT NULL,
      embedding JSON NOT NULL,
      embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
      chunk_index INT DEFAULT 0,
      chunk_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
      INDEX idx_memory_id (memory_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createSearchHistoryTable = `
    CREATE TABLE IF NOT EXISTS search_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      query TEXT NOT NULL,
      search_type ENUM('semantic', 'keyword', 'hybrid') DEFAULT 'hybrid',
      results_count INT DEFAULT 0,
      execution_time_ms INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_search_type (search_type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.execute(createMemoriesTable);
  await pool.execute(createEmbeddingsTable);
  await pool.execute(createSearchHistoryTable);
}

export default pool;
