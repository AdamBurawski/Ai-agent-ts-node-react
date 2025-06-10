import { Router } from "express";
import { AgentController } from "../controllers/agentController";

const router = Router();
const agentController = new AgentController();

router.post("/process", (req, res) => agentController.execute(req, res));

export default router;
