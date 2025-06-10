import { Router } from "express";
import {
  ImportDataController,
  GetConnectionsController,
  ShortestPathController,
} from "../controllers/graphController";

const router = Router();

const importDataController = new ImportDataController();
const getConnectionsController = new GetConnectionsController();
const shortestPathController = new ShortestPathController();

router.post("/import-data", (req, res) =>
  importDataController.execute(req, res)
);
router.get("/get-connections", (req, res) =>
  getConnectionsController.execute(req, res)
);
router.post("/shortest-path", (req, res) =>
  shortestPathController.execute(req, res)
);

export default router;
