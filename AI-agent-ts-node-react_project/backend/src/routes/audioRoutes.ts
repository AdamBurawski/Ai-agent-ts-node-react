import { Router } from "express";
import {
  ProcessFolderController,
  GetTranscriptionController,
  ReadTextFilesController,
} from "../controllers/audioController";

const router = Router();

const processFolderController = new ProcessFolderController();
const getTranscriptionController = new GetTranscriptionController();
const readTextFilesController = new ReadTextFilesController();

router.get("/process-folder", (req, res) =>
  processFolderController.execute(req, res)
);
router.get("/get-transcription", (req, res) =>
  getTranscriptionController.execute(req, res)
);
router.get("/read-text-files", (req, res) =>
  readTextFilesController.execute(req, res)
);

export default router;
