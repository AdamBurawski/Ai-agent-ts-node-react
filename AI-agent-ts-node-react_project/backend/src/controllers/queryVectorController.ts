import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import config from '../config/config';
import * as fs from 'fs/promises';
import * as path from 'path';

class QueryVectorController {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (normA * normB);
  }

  async execute(req: Request, res: Response) {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required'
        });
      }

      // Generuj embedding dla zapytania używając modelu Ada
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });

      const queryEmbedding = response.data[0].embedding;

      // Wczytaj zapisane embeddingi
      const embeddingsPath = path.join(process.cwd(), 'uploads', 'embeddings.json');
      const embeddingsData = JSON.parse(await fs.readFile(embeddingsPath, 'utf-8'));

      // Znajdź 3 najbardziej podobne dokumenty
      const topDocuments = embeddingsData
        .map((item: { file: string; embedding: number[]; content: string }) => ({
          ...item,
          similarity: this.cosineSimilarity(queryEmbedding, item.embedding),
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      // Użyj GPT-4 do wygenerowania odpowiedzi na podstawie znalezionych dokumentów
      const context = topDocuments
        .map((doc, index) => 
          `Document ${index + 1}:\nFile name: ${doc.file}\nContent: ${doc.content}\n`
        )
        .join("\n");

      const completionResponse = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an assistant. Answer the user's question based on the content of the following documents."
          },
          {
            role: "user",
            content: `Here are the most relevant documents:\n\n${context}\n\nUser question: ${query}`
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      const answer = completionResponse.choices[0]?.message?.content.trim();

      return res.json({
        success: true,
        answer,
        topDocuments: topDocuments.map(doc => ({
          file: doc.file,
          content: doc.content,
          similarity: doc.similarity
        }))
      });

    } catch (error) {
      console.error('Error in QueryVectorController:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}

export const queryVectorController = new QueryVectorController();