import { Router } from "express";
import {
  GenerateEmbeddingsController,
  QueryVectorController,
  SummaryController,
} from "../controllers/vectorController";

const router = Router();

const generateEmbeddingsController = new GenerateEmbeddingsController();
const queryVectorController = new QueryVectorController();
const summaryController = new SummaryController();

router.get("/generate-embeddings", (req, res) =>
  generateEmbeddingsController.execute(req, res)
);
router.post("/query", (req, res) => queryVectorController.execute(req, res));
router.post("/summary", (req, res) => summaryController.execute(req, res));

export default router;
