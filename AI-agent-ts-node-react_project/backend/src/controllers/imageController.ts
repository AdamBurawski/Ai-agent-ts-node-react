import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import axios from "axios";
import fs from "fs";
import path from "path";
import config from "../config/config";
import OpenAI from "openai";

const IMAGE_FOLDER = path.join(__dirname, "../../uploads");

// Create images folder if it doesn't exist
if (!fs.existsSync(IMAGE_FOLDER)) {
  fs.mkdirSync(IMAGE_FOLDER, { recursive: true });
}

let imageContext: string = ""; // Store image context
let chatContext: string = ""; // Store chat context

interface Message {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<{
        type: "text" | "image_url";
        text?: string;
        image_url?: {
          url: string;
          detail: "low" | "high";
        };
      }>;
}

export class ImageChatController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    const { message } = req.body;

    try {
      // Najpierw odczytaj wszystkie obrazki z folderu
      const files = await fs.promises.readdir(IMAGE_FOLDER);
      const imageFiles = files.filter(
        (file) =>
          file.endsWith(".jpg") ||
          file.endsWith(".jpeg") ||
          file.endsWith(".png") ||
          file.endsWith(".webp")
      );

      if (imageFiles.length === 0) {
        res.status(400).json({ error: "No images found in uploads folder." });
        return;
      }

      // Przygotuj zawartość z wszystkimi obrazkami
      const messages: Message[] = [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes images.",
        },
      ];

      // Dodaj każdy obrazek do kontekstu
      for (const file of imageFiles) {
        const imagePath = path.join(IMAGE_FOLDER, file);
        const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

        messages.push({
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
              text: message || "Describe what you see in this image.",
            },
          ],
        });
      }

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: messages,
          max_tokens: 600,
        },
        {
          headers: {
            Authorization: `Bearer ${config.openai.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const reply =
        response.data.choices[0]?.message?.content || "No reply received.";
      res.status(200).json({ reply });
    } catch (error: any) {
      console.error(
        "Error processing chat:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: "Failed to process chat request.",
        details: error.response?.data || error.message,
      });
    }
  }
}

export class ProcessImagesController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const files = await fs.promises.readdir(IMAGE_FOLDER);

      const imageFiles = files.filter(
        (file) =>
          file.endsWith(".png") ||
          file.endsWith(".jpg") ||
          file.endsWith(".jpeg") ||
          file.endsWith(".webp")
      );

      if (imageFiles.length === 0) {
        res.status(400).json({ error: "No image files found in the folder." });
        return;
      }

      const imageDescriptions: string[] = [];

      for (const file of imageFiles) {
        const filePath = path.join(IMAGE_FOLDER, file);

        try {
          const imageBase64 = fs.readFileSync(filePath, { encoding: "base64" });

          const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a helpful picture bot interpreter. Read text written on the image.",
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
                      text: `Analyze the content of this image (${file}).`,
                    },
                  ],
                },
              ],
              max_tokens: 2000,
            },
            {
              headers: {
                Authorization: `Bearer ${config.openai.apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          const description =
            response.data.choices[0]?.message?.content ||
            "No description received.";

          imageDescriptions.push(`File: ${file}\nDescription: ${description}`);
          console.log(`Image description (${file}):`, description);
        } catch (error) {
          console.error(`Error processing image ${file}:`, error);
        }
      }

      imageContext = imageDescriptions.join("\n");

      res.status(200).json({
        message: "Images processed successfully.",
        descriptions: imageDescriptions,
      });
    } catch (error: any) {
      console.error("Error processing images:", error.message);
      res.status(500).json({ error: "Failed to process images." });
    }
  }
}

// Add OCRController to handle image uploads
export class OCRController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: "No image provided." });
      return;
    }

    const imagePath = req.file.path;
    console.log("Processing image for OCR:", imagePath);

    try {
      // FIRST: Read the uploaded image before doing anything else
      const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });
      console.log("Successfully read uploaded image");

      // SECOND: Clear all existing images from the uploads folder
      const existingFiles = await fs.promises.readdir(IMAGE_FOLDER);
      const existingImages = existingFiles.filter(
        (file) =>
          file.endsWith(".jpg") ||
          file.endsWith(".jpeg") ||
          file.endsWith(".png") ||
          file.endsWith(".webp") ||
          file.endsWith(".gif") ||
          file.endsWith(".bmp")
      );

      // Remove existing images (but NOT the temp uploaded file)
      for (const file of existingImages) {
        try {
          const filePath = path.join(IMAGE_FOLDER, file);
          // Don't remove the currently uploaded file if it was saved to uploads folder
          if (filePath !== imagePath) {
            await fs.promises.unlink(filePath);
            console.log(`Removed old image: ${file}`);
          }
        } catch (error) {
          console.warn(`Failed to remove old image ${file}:`, error);
        }
      }

      // THIRD: Perform OCR using OpenAI
      const openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an OCR assistant. Extract all text content from the provided image. Return only the extracted text without any additional commentary.",
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
                text: "Extract all text from this image.",
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const extractedText =
        response.choices[0]?.message?.content || "No text found in image.";

      // Store the extracted text in context (if needed for other operations)
      imageContext = extractedText;

      // FOURTH: Save the image with a clean name for chat functionality
      const newImagePath = path.join(
        IMAGE_FOLDER,
        `uploaded_image${path.extname(req.file.originalname)}`
      );

      // If the image was uploaded directly to uploads folder, rename it
      if (path.dirname(imagePath) === IMAGE_FOLDER) {
        await fs.promises.rename(imagePath, newImagePath);
      } else {
        // If it's in temp folder, copy it to uploads
        await fs.promises.copyFile(imagePath, newImagePath);
        await fs.promises.unlink(imagePath); // Remove temp file
      }

      console.log(
        `Saved new image as: uploaded_image${path.extname(
          req.file.originalname
        )}`
      );

      // Return the response format expected by frontend
      res.status(200).json({ text: extractedText });
    } catch (error: any) {
      console.error("Error processing image for OCR:", error.message);
      res.status(500).json({ error: "Something broke!" });

      // Cleanup on error
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (cleanupError) {
        console.warn("Failed to cleanup uploaded file:", cleanupError);
      }
    }
  }
}

export class UploadImageController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ error: "No image provided." });
      return;
    }

    // Używamy tej samej ścieżki co w routerze
    const uploadDir = IMAGE_FOLDER;
    console.log("Controller upload path:", uploadDir);
    console.log("Original file path:", req.file.path);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const newPath = path.join(uploadDir, req.file.originalname);
    console.log("New file path:", newPath);

    try {
      fs.renameSync(req.file.path, newPath);
      res.status(200).json({
        message: "Image uploaded successfully",
        path: newPath,
      });
    } catch (error) {
      console.error("Error moving file:", error);
      res.status(500).json({ error: "Failed to save image" });
    }
  }
}

export class GenerateImageController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        res.status(400).json({ error: "Prompt is required." });
        return;
      }

      console.log("Generating image with prompt:", prompt);

      const response = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "url",
        },
        {
          headers: {
            Authorization: `Bearer ${config.openai.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const imageUrl = response.data.data[0]?.url;

      if (!imageUrl) {
        res.status(500).json({ error: "Failed to generate image" });
        return;
      }

      // Download the image from OpenAI and save to uploads folder
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      const timestamp = Date.now();
      const filename = `generated_image_${timestamp}.png`;
      const filepath = path.join(IMAGE_FOLDER, filename);

      await fs.promises.writeFile(filepath, imageResponse.data);

      console.log(`Image saved to: ${filepath}`);

      res.json({
        message: "Obraz wygenerowany i zapisany pomyślnie!",
        filename: filename,
        imageUrl: imageUrl,
      });
    } catch (error: any) {
      console.error(
        "Error generating image:",
        error.response?.data || error.message
      );
      res.status(500).json({
        error: "Failed to generate image",
        details: error.response?.data?.error?.message || error.message,
      });
    }
  }
}
