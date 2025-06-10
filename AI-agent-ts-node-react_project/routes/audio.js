const express = require("express");
const fs = require("fs");
const path = require("path");
const { transcribeFiles } = require("../services/speechToText");
const { generateResponse } = require("../services/languageModel");
const { sendToServer } = require("./report");

const router = express.Router();

let savedAnswer = null;

// Główne przetwarzanie
router.post("/process", async (req, res) => {
  try {
    console.log("Rozpoczynam przetwarzanie plików mp3...");

    // 1. Znalezienie plików mp3 w folderze testData
    const folderPath = path.join(__dirname, "../testData/audio");
    const files = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".mp3") && !file.startsWith("._"))
      .map((file) => path.join(folderPath, file));

    console.log("Znalezione pliki mp3:", files);

    if (files.length === 0) {
      console.log("Brak plików mp3 w folderze testData.");
      return res.status(400).send("Brak plików mp3 w folderze testData.");
    }

    // 2. Transkrypcja plików
    const transcripts = await transcribeFiles(files);
    console.log("Uzyskane transkrypcje:", transcripts);

    // 3. Generowanie odpowiedzi przez LLM
    const context = transcripts.map((t) => t.text).join("\n");
    const question =
      "Na jakiej ulicy znajduje się uczelnia, na której wykłada Andrzej Maj?";
    const answer = await generateResponse(context, question);

    console.log("Odpowiedź z OpenAI:", answer);

    // Przechowaj odpowiedź do późniejszego wysłania
    savedAnswer = answer;

    res.json({ transcripts, answer });
  } catch (error) {
    console.error("Błąd podczas przetwarzania plików mp3:", error.message);
    res.status(500).send("Błąd podczas przetwarzania plików mp3");
  }
});

// Wysyłanie odpowiedzi po akceptacji
router.get("/accept", async (req, res) => {
  if (!savedAnswer) {
    console.log("Brak odpowiedzi do zaakceptowania.");
    return res.status(400).send("Brak odpowiedzi do zaakceptowania.");
  }

  try {
    await sendToServer(savedAnswer);
    console.log("Odpowiedź została wysłana na serwer.");
    savedAnswer = null; // Resetowanie odpowiedzi po wysłaniu
    res.send("Odpowiedź wysłana na serwer.");
  } catch (error) {
    console.error(
      "Błąd podczas wysyłania odpowiedzi na serwer:",
      error.message
    );
    res.status(500).send("Błąd podczas wysyłania odpowiedzi.");
  }
});

module.exports = router;
