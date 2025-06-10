import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import { WebScraper } from "../services/WebScraper";
import config from "../config/config";

// Create a single instance of WebScraper to be shared across requests
const scraper = new WebScraper(
  config.openai.apiKey,
  config.neo4j.uri,
  config.neo4j.user,
  config.neo4j.password
);

export class InitScraperController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      res.json({ message: "Scraper initialized successfully" });
    } catch (error) {
      console.error("Error initializing scraper:", error);
      res.status(500).json({ error: "Failed to initialize scraper" });
    }
  }
}

export class CrawlController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    const { startUrl, maxPages } = req.body;

    if (!startUrl) {
      res.status(400).json({ error: "Start URL is required" });
      return;
    }

    try {
      // Start crawling in the background
      scraper.scrapeWebsite(startUrl, maxPages).catch((error) => {
        console.error("Error during crawling:", error);
      });

      res.json({ message: "Crawling started" });
    } catch (error) {
      console.error("Error starting crawler:", error);
      res.status(500).json({ error: "Failed to start crawler" });
    }
  }
}

export class ScraperStatusController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const status = scraper.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scraper status:", error);
      res.status(500).json({ error: "Failed to get scraper status" });
    }
  }
}

export class QueryController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    const { question } = req.body;

    if (!question) {
      res.status(400).json({ error: "Question is required" });
      return;
    }

    try {
      const results = await scraper.queryContent(question);
      res.json({ results });
    } catch (error) {
      console.error("Error querying content:", error);
      res.status(500).json({ error: "Failed to query content" });
    }
  }
}

export class StopScraperController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      await scraper.stopCrawling();
      res.json({ message: "Scraping stopped" });
    } catch (error) {
      console.error("Error stopping scraper:", error);
      res.status(500).json({ error: "Failed to stop scraper" });
    }
  }
}

export class SearchController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    const { startUrl, question, maxPages } = req.body;

    if (!startUrl || !question) {
      res.status(400).json({ error: "Start URL and question are required" });
      return;
    }

    try {
      const result = await scraper.scrapeWebsiteWithQuestion(
        startUrl,
        question,
        maxPages
      );

      if (result) {
        res.json({
          success: true,
          message: "Answer found!",
          result,
        });
      } else {
        res.json({
          success: false,
          message: "No answer found in the scanned pages",
        });
      }
    } catch (error) {
      console.error("Error during search:", error);
      res.status(500).json({ error: "Failed to search website" });
    }
  }
}
