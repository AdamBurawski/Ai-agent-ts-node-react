import { Router } from "express";
import audioRoutes from "./audioRoutes";
import imageRoutes from "./imageRoutes";
import vectorRoutes from "./vectorRoutes";
import graphRoutes from "./graphRoutes";
import scraperRoutes from "./scraperRoutes";
import agentRoutes from "./agentRoutes";
import sqlRoutes from "./sqlRoutes";
import knowledgeBaseRoutes from "./knowledgeBaseRoutes";

const router = Router();

router.use("/audio", audioRoutes);
router.use("/image", imageRoutes);
router.use("/vector", vectorRoutes);
router.use("/graph", graphRoutes);
router.use("/scraper", scraperRoutes);
router.use("/agent", agentRoutes);
router.use("/knowledge", knowledgeBaseRoutes);
router.use("/", sqlRoutes);

export default router;
