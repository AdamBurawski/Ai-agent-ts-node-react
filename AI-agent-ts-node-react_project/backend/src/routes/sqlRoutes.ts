import { Router } from "express";
import {
  TableStructureController,
  TableDetailsController,
  GenerateSQLController,
  ExecuteSQLController,
  SubmitResultController,
} from "../controllers/sqlController";

const router = Router();

const tableStructureController = new TableStructureController();
const tableDetailsController = new TableDetailsController();
const generateSQLController = new GenerateSQLController();
const executeSQLController = new ExecuteSQLController();
const submitResultController = new SubmitResultController();

// GET /api/structure - Get database structure (tables)
router.get("/structure", (req, res) => {
  tableStructureController.execute(req, res);
});

// POST /api/table-details - Get table details (columns)
router.post("/table-details", (req, res) => {
  tableDetailsController.execute(req, res);
});

// POST /api/generate-sql - Generate SQL query from natural language
router.post("/generate-sql", (req, res) => {
  generateSQLController.execute(req, res);
});

// POST /api/query-database - Execute SQL query
router.post("/query-database", (req, res) => {
  executeSQLController.execute(req, res);
});

// POST /api/submit-result - Submit query result
router.post("/submit-result", (req, res) => {
  submitResultController.execute(req, res);
});

export default router;
