import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import config from "../config/config";
import * as fsPromises from 'fs/promises';

const MP3Folder = path.join(__dirname, "../../uploads");

export class ProcessFolderController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const files: string[] = await new Promise((resolve, reject) => {
        fs.readdir(MP3Folder, (err, files) => {
          if (err) reject(err);
          else resolve(files.filter((file) => file.endsWith(".mp3")));
        });
      });

      if (files.length === 0) {
        res.status(400).send("Folder nie zawiera plików MP3.");
        return;
      }

      const client = new OpenAI({
        apiKey: config.openai.apiKey,
      });

      const transcriptions: { file: string; text: string }[] = [];

      for (const file of files) {
        const filePath = path.join(MP3Folder, file);
        try {
          const transcription = await client.audio.transcriptions.create({
            model: "whisper-1",
            response_format: "json",
            language: "pl",
            file: fs.createReadStream(filePath),
          });

          if (transcription) {
            transcriptions.push({ file, text: transcription.text });
          }
        } catch (error: any) {
          console.error(
            `Błąd podczas transkrypcji pliku ${file}:`,
            error.message
          );
        }
      }

      res.json(transcriptions);
    } catch (error) {
      console.error("Błąd podczas przetwarzania folderu:", error);
      res.status(500).send("Błąd podczas przetwarzania folderu.");
    }
  }
}

export class GetTranscriptionController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      // Note: You'll need to implement a way to store and retrieve transcriptionText
      // We'll handle this in the service layer later
      res.json({ text: "" });
    } catch (error) {
      res.status(500).json({ error: "Failed to get transcription" });
    }
  }
}

export class ReadTextFilesController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const files = await fs.promises.readdir(MP3Folder);
      const txtFiles = files.filter((file) => file.endsWith(".txt"));

      if (txtFiles.length === 0) {
        res.status(400).send("Folder nie zawiera plików TXT.");
        return;
      }

      const textContents = await Promise.all(
        txtFiles.map(async (file) => {
          const filePath = path.join(MP3Folder, file);
          const content = await fs.promises.readFile(filePath, "utf-8");
          return { file, content };
        })
      );

      res.json(textContents);
    } catch (error) {
      console.error("Błąd podczas odczytu plików TXT:", error);
      res.status(500).send("Błąd podczas odczytu plików TXT.");
    }
  }
}

class AudioController {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  async execute(req: Request, res: Response) {
    try {
      const { filename } = req.body;
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Filename is required'
        });
      }

      // Używamy ścieżki względem katalogu uploads
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, filename);

      // Sprawdzamy czy plik istnieje
      try {
        await fsPromises.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          error: `File ${filename} not found in uploads directory`
        });
      }

      // Odczytujemy plik audio
      const audioFile = await fsPromises.readFile(filePath);

      // Konwertujemy na tekst używając OpenAI Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: new File([audioFile], filename, { type: 'audio/mpeg' }),
        model: "whisper-1",
      });

      return res.json({
        success: true,
        transcription: transcription.text,
        message: "Audio transcribed successfully"
      });

    } catch (error) {
      console.error('Error in AudioController:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}

export const audioController = new AudioController();
