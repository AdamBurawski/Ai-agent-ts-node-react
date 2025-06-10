import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import express from "express";
import routes from "./routes";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as neo4j from "neo4j-driver";
import config from "./config/config";

class App {
  public app: express.Application;
  private neo4jDriver: neo4j.Driver;

  constructor() {
    this.app = express();
    // Initialize Neo4j driver
    this.neo4jDriver = neo4j.driver(
      "bolt://localhost:7687", // hardcoded for now
      neo4j.auth.basic("neo4j", "pass1234") // hardcoded for now
    );
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.testNeo4jConnection(); // Test connection on startup
  }

  private async testNeo4jConnection() {
    const session = this.neo4jDriver.session();
    try {
      await session.run("RETURN 1 as n");
      console.log("Successfully connected to Neo4j");
    } catch (error) {
      console.error("Failed to connect to Neo4j:", error);
    } finally {
      await session.close();
    }
  }

  private initializeMiddlewares() {
    this.app.use(
      cors({
        origin: "*",
      })
    );
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes() {
    // Add a test route
    this.app.get("/test", (req, res) => {
      res.json({ message: "Server is working!" });
    });

    // All other routes under /api
    this.app.use("/api", routes);

    // Add error handling middleware
    this.app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        console.error(err.stack);
        res.status(500).json({ error: "Something broke!" });
      }
    );
  }

  public listen() {
    const port = process.env.PORT || 3001;
    this.app.listen(port, () => {
      console.log(`Server listening on http://127.0.0.1:${port}`);
    });
  }

  public async closeConnections(): Promise<void> {
    try {
      await this.neo4jDriver.close();
      console.log("Neo4j connection closed.");
    } catch (error) {
      console.error("Error closing Neo4j connection:", error);
    }
  }

  // Method to get Neo4j driver (useful for routes/controllers)
  public getNeo4jDriver(): neo4j.Driver {
    return this.neo4jDriver;
  }
}

export default App;
