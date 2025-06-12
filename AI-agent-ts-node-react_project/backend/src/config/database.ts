import { createClient, SupabaseClient } from "@supabase/supabase-js";
import config from "./config";

export interface DatabaseConfig {
  url: string;
  key: string;
}

const dbConfig: DatabaseConfig = {
  url: process.env.SUPABASE_URL || "http://localhost:54321",
  key:
    process.env.SUPABASE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
};

// Create Supabase client
export const supabase = createClient(dbConfig.url, dbConfig.key);

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("count", { count: "exact", head: true });

    if (error) throw error;

    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Initialize database (not needed for Supabase as we use migrations)
export async function initializeDatabase(): Promise<void> {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error("Failed to connect to Supabase");
    }
    console.log("✅ Database connection initialized");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
}

export default supabase;
