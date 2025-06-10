const express = require("express");
const multer = require("multer");
const { performOCR } = require("../controllers/ocrController");
const { handleChat } = require("../controllers/chatController");

const router = express.Router();

// Konfiguracja Multer dla przesyłania plików
const upload = multer({ dest: "uploads/" });

// Endpoint dla przesyłania obrazu
router.post("/", upload.single("image"), performOCR);

// Endpoint dla czatu
router.post("/chat", handleChat);

module.exports = router;
