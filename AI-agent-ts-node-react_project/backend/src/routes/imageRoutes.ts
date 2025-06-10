import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  OCRController,
  ProcessImagesController,
  UploadImageController,
} from "../controllers/imageController";
import { imageChatController } from '../controllers/imageChatController';

const router = express.Router();

// Użycie pełnej ścieżki
const uploadDir = '/Volumes/Samsung HD/AI/AI-APP-PROJECT/AI_Devs_3-Quests/S05E01(Agent)/backend/uploads';
console.log('Upload directory:', uploadDir);

// Upewniamy się, że folder istnieje
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

const ocrController = new OCRController();
const processImagesController = new ProcessImagesController();
const uploadController = new UploadImageController();

router.post("/ocr", upload.single("image"), (req, res) =>
  ocrController.execute(req, res)
);
router.get("/process-images", (req, res) =>
  processImagesController.execute(req, res)
);
router.post("/chat", (req, res) => imageChatController.execute(req, res));
router.post('/upload', 
  upload.single('image'), 
  (req, res) => uploadController.execute(req, res)
);

export default router;
