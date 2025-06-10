import { Request, Response } from "express";
import { BaseController } from "../types/controller";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import axios from "axios";
import config from "../config/config";

const EMBEDDINGS_FILE = path.join(__dirname, "../../uploads");

export class GenerateEmbeddingsController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    try {
      const txtFolder = path.resolve(__dirname, "../../uploads");
      const files = await fs.promises.readdir(txtFolder);
      const txtFiles = files.filter((file) => file.endsWith(".txt"));

      if (txtFiles.length === 0) {
        res.status(400).json({ error: "No text files found in the folder." });
        return;
      }

      const texts = await Promise.all(
        txtFiles.map(async (file) => {
          const filePath = path.join(txtFolder, file);
          const content = await fs.promises.readFile(filePath, "utf-8");
          return { file, content };
        })
      );

      const client = new OpenAI({ apiKey: config.openai.apiKey });
      const embeddings = [];

      for (const text of texts) {
        const response = await client.embeddings.create({
          model: "text-embedding-ada-002",
          input: text.content,
        });

        embeddings.push({
          file: text.file,
          content: text.content,
          embedding: response.data[0].embedding,
        });
      }

      fs.writeFileSync(
        path.join(txtFolder, "embeddings.json"),
        JSON.stringify(embeddings, null, 2)
      );

      res.json({ embeddings });
    } catch (error: any) {
      console.error("Error generating embeddings:", error.message);
      res.status(500).json({ error: "Failed to generate embeddings" });
    }
  }
}

export class QueryVectorController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    const { question } = req.body;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const embeddingsPath = path.join(uploadsDir, 'embeddings.json');

    // Jeśli nie ma pytania, generujemy embeddingi
    if (!question) {
      try {
        const files = await fs.promises.readdir(uploadsDir);
        const textFiles = files.filter(file => file.endsWith('.txt'));
        
        if (textFiles.length === 0) {
          res.status(400).json({ error: 'No text files found in uploads directory' });
          return;
        }

        const embeddings = await Promise.all(textFiles.map(async (file) => {
          const content = await fs.promises.readFile(path.join(uploadsDir, file), 'utf-8');
          return {
            filename: file,
            content,
            embedding: await this.generateEmbedding(content)
          };
        }));

        await fs.promises.writeFile(embeddingsPath, JSON.stringify(embeddings, null, 2));
        
        res.json({ 
          success: true, 
          message: `Generated embeddings for ${textFiles.length} files` 
        });
        return;
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to generate embeddings',
          details: error.message 
        });
        return;
      }
    }

    try {
      const client = new OpenAI({ apiKey: config.openai.apiKey });

      // Sprawdź czy plik istnieje
      if (!fs.existsSync(embeddingsPath)) {
        res.status(404).json({ error: "Embeddings file not found" });
        return;
      }

      // Generate embedding for the question
      const response = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: question,
      });

      const questionEmbedding = response.data[0].embedding;

      // Load embeddings and their content
      const embeddingsData = JSON.parse(
        fs.readFileSync(embeddingsPath, "utf-8")
      );

      // Find top 3 most similar documents
      const topDocuments = embeddingsData
        .map(
          (item: { file: string; embedding: number[]; content: string }) => ({
            ...item,
            similarity: this.cosineSimilarity(
              questionEmbedding,
              item.embedding
            ),
          })
        )
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, 3);

      if (topDocuments.length > 0) {
        const context = topDocuments
          .map(
            (doc: any, index: number) =>
              `Document ${index + 1}:\nFile name: ${doc.file}\nContent: ${
                doc.content
              }\n`
          )
          .join("\n");

        const completionResponse = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are an assistant. Answer the user's question based on the content of the following documents.",
            },
            {
              role: "user",
              content: `Here are the most relevant documents:\n\n${context}\n\nUser question: ${question}`,
            },
          ],
          max_tokens: 300,
          temperature: 0.5,
        });

        const answer = completionResponse.choices[0]?.message?.content.trim();

        if (answer) {
          res.json({ answer });
        } else {
          res.status(500).json({ error: "Failed to generate an answer." });
        }
      } else {
        res.status(404).json({ error: "No similar document found" });
      }
    } catch (error: any) {
      console.error("Error processing query:", error);
      res
        .status(500)
        .json({ error: "Failed to process query", details: error.message });
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const openai = new OpenAI({ apiKey: config.openai.apiKey });
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });
    return response.data[0].embedding;
  }
}

export class SummaryController implements BaseController {
  async execute(req: Request, res: Response): Promise<void> {
    const { question } = req.body;

    if (!question) {
      res.status(400).json({ error: "Question is required." });
      return;
    }

    try {
      // Build context from various sources
      const context = await this.buildContext();

      // Send to OpenAI
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant. Read the texts and send back the answer to the question. If you don't know the answer, write 'I don't know'.",
            },
            {
              role: "user",
              content: `Here is the context:\n${context}\n\nQuestion: ${question}`,
            },
          ],
          max_tokens: 3000,
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
      console.error("Error processing summary:", error.message);
      res.status(500).json({ error: "Failed to process summary request." });
    }
  }

  private async buildContext(): Promise<string> {
    const txtFolder = path.join(__dirname, "../../uploads");
    let context = "";

    try {
      // Read text files
      const files = await fs.promises.readdir(txtFolder);
      const textContents = await Promise.all(
        files
          .filter((file) => file.endsWith(".txt"))
          .map(async (file) => {
            const content = await fs.promises.readFile(
              path.join(txtFolder, file),
              "utf-8"
            );
            return `File: ${file}\nContent: ${content}`;
          })
      );

      context = textContents.join("\n\n");
    } catch (error) {
      console.error("Error building context:", error);
    }

    return context;
  }
}
