import { Request, Response } from 'express';

class ImageChatController {
  constructor() {
    // inicjalizacja jeśli potrzebna
  }

  async execute(req: Request, res: Response) {
    try {
      // logika kontrolera
      const { image, message } = req.body;
      
      // przykładowa odpowiedź
      res.json({
        success: true,
        message: "Image chat controller executed successfully"
      });
    } catch (error) {
      console.error('Error in ImageChatController:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}

// Eksportujemy instancję zamiast klasy
export const imageChatController = new ImageChatController(); 