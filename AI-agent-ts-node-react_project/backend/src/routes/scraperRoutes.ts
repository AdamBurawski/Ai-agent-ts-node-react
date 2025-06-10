import { Router } from "express";
import {
  InitScraperController,
  CrawlController,
  ScraperStatusController,
  QueryController,
  StopScraperController,
  SearchController,
} from "../controllers/scraperController";

const router = Router();

const initController = new InitScraperController();
const crawlController = new CrawlController();
const statusController = new ScraperStatusController();
const queryController = new QueryController();
const stopController = new StopScraperController();
const searchController = new SearchController();

router.post("/init", (req, res) => initController.execute(req, res));
router.post("/crawl", (req, res) => crawlController.execute(req, res));
router.get("/status", (req, res) => statusController.execute(req, res));
router.post("/query", (req, res) => queryController.execute(req, res));
router.post("/stop", (req, res) => stopController.execute(req, res));
router.post("/search", (req, res) => searchController.execute(req, res));

export default router;
