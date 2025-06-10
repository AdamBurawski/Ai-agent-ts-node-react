import { Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

class TextController {
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
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          error: `File ${filename} not found in uploads directory`
        });
      }

      const content = await fs.readFile(filePath, 'utf-8');

      return res.json({
        success: true,
        content,
        message: "File read successfully"
      });
    } catch (error) {
      console.error('Error in TextController:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}

export const textController = new TextController(); 