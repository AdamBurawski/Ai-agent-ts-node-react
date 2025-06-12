import { Request, Response } from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import config from "../config/config";

const IMAGE_FOLDER = path.resolve(__dirname, "../../uploads");

class ImageChatController {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async execute(req: Request, res: Response) {
    try {
      const { message } = req.body;

      // Find image files in uploads directory
      const files = await fs.promises.readdir(IMAGE_FOLDER);
      const imageFiles = files.filter(
        (file) =>
          file.endsWith(".png") ||
          file.endsWith(".jpg") ||
          file.endsWith(".jpeg") ||
          file.endsWith(".webp")
      );

      if (imageFiles.length === 0) {
        res.status(400).json({
          success: false,
          error: "No image files found in uploads directory.",
        });
        return;
      }

      const imageDescriptions: string[] = [];

      // Process each image
      for (const file of imageFiles) {
        const filePath = path.join(IMAGE_FOLDER, file);

        try {
          const imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

          const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that analyzes and describes images in detail.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${imageBase64}`,
                      detail: "high",
                    },
                  },
                  {
                    type: "text",
                    text: message || "Describe this image in detail.",
                  },
                ],
              },
            ],
            max_tokens: 2000,
          });

          const description =
            response.choices[0]?.message?.content || "No description received.";

          imageDescriptions.push(description);
          console.log(`Image description (${file}):`, description);
        } catch (error) {
          console.error(`Error processing image ${file}:`, error);
          imageDescriptions.push(`Error processing image ${file}`);
        }
      }

      res.json({
        success: true,
        message: "Image chat controller executed successfully",
        imageDescriptions: imageDescriptions,
        processedFiles: imageFiles.length,
      });
    } catch (error) {
      console.error("Error in ImageChatController:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }
}

// Eksportujemy instancję zamiast klasy
export const imageChatController = new ImageChatController();
