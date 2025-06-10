import { Router } from "express";
import audioRoutes from "./audioRoutes";
import imageRoutes from "./imageRoutes";
import vectorRoutes from "./vectorRoutes";
import graphRoutes from "./graphRoutes";
import scraperRoutes from "./scraperRoutes";
import agentRoutes from "./agentRoutes";

const router = Router();

router.use("/audio", audioRoutes);
router.use("/image", imageRoutes);
router.use("/vector", vectorRoutes);
router.use("/graph", graphRoutes);
router.use("/scraper", scraperRoutes);
router.use("/agent", agentRoutes);

export default router;
