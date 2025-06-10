import { Router } from "express";
import {
  AgentController,
  clearConversationHistory,
  getConversationHistory,
} from "../controllers/agentController";

const router = Router();
const agentController = new AgentController();

router.post("/process", (req, res) => agentController.execute(req, res));

// GET /api/agent/history - Get conversation history
router.get("/history", (req, res) => {
  try {
    const history = getConversationHistory();
    res.json({
      success: true,
      history: history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/agent/history - Clear conversation history
router.delete("/history", (req, res) => {
  try {
    clearConversationHistory();
    res.json({
      success: true,
      message: "Conversation history cleared",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
