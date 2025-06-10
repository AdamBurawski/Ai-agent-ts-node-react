import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  OCRController,
  ProcessImagesController,
  UploadImageController,
  ImageChatController,
} from "../controllers/imageController";

const router = express.Router();

// Użycie względnej ścieżki
const uploadDir = path.join(__dirname, "../../uploads");
console.log("Upload directory:", uploadDir);

// Upewniamy się, że folder istnieje
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const ocrController = new OCRController();
const processImagesController = new ProcessImagesController();
const uploadController = new UploadImageController();
const imageChatController = new ImageChatController();

router.post("/ocr", upload.single("image"), (req, res) =>
  ocrController.execute(req, res)
);
router.get("/process-images", (req, res) =>
  processImagesController.execute(req, res)
);
router.post("/chat", (req, res) => imageChatController.execute(req, res));
router.post("/upload", upload.single("image"), (req, res) =>
  uploadController.execute(req, res)
);

export default router;
