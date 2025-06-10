import App from "./app";
import { initializeDatabase, testConnection } from "./config/database";

const app = new App();

// Initialize database before starting server
async function startServer() {
  try {
    console.log("🔄 Initializing database...");

    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      console.log(
        "⚠️  Database connection failed, but server will continue without knowledge base features"
      );
    } else {
      // Initialize database schema
      await initializeDatabase();
      console.log("✅ Knowledge base ready");
    }

    // Start server
    app.listen();
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Closing connections...");
  await app.closeConnections();
  process.exit(0);
});

startServer();
