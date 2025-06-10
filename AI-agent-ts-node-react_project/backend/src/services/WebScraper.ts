import axios from "axios";
import * as cheerio from "cheerio";
import { OpenAI } from "openai";
import * as neo4j from "neo4j-driver";
import { URL } from "url";
import fs from "fs";
import path from "path";

interface PageData {
  url: string;
  title: string;
  content: string;
  summary: string;
  keywords: string[];
  links: string[];
}

interface ScrapingStatus {
  pagesProcessed: number;
  totalPages: number;
  currentUrl?: string;
  completed: boolean;
  stopped: boolean; // Required flag, not optional
}

export class WebScraper {
  private openai: OpenAI;
  private neo4jDriver: neo4j.Driver;
  private visitedUrls: Set<string> = new Set();
  private baseUrl: string = "";
  private shouldStop: boolean = false;

  private status: ScrapingStatus = {
    pagesProcessed: 0,
    totalPages: 0,
    currentUrl: undefined,
    completed: false,
    stopped: false,
  };

  constructor(
    openaiApiKey: string,
    neo4jUri: string = "bolt://localhost:7687",
    neo4jUser: string = "neo4j",
    neo4jPassword: string = "pass1234"
  ) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.neo4jDriver = neo4j.driver(
      neo4jUri,
      neo4j.auth.basic(neo4jUser, neo4jPassword)
    );
  }

  getStatus(): ScrapingStatus {
    return this.status;
  }

  async stopCrawling() {
    console.log("Stopping crawler...");
    this.shouldStop = true;
    this.status.stopped = true;
    this.status.completed = true;
    console.log("Crawling stopped by user");
  }

  private isValidUrl(url: string, baseUrl: string): boolean {
    try {
      const parsedUrl = new URL(url, baseUrl);
      // Check if URL is from the same domain
      if (!parsedUrl.href.startsWith(this.baseUrl)) {
        return false;
      }
      // Remove anchor links (same page references)
      if (parsedUrl.hash) {
        const urlWithoutHash = parsedUrl.href.split("#")[0];
        if (urlWithoutHash === baseUrl) {
          return false;
        }
      }
      // Additional filters
      return (
        !parsedUrl.href.includes("javascript:") &&
        !parsedUrl.href.includes("mailto:") &&
        !parsedUrl.href.includes("tel:") &&
        !parsedUrl.protocol.startsWith("file:")
      );
    } catch {
      return false;
    }
  }

  private async initNeo4j() {
    const session = this.neo4jDriver.session();
    try {
      await session
        .run(
          `CREATE CONSTRAINT page_url IF NOT EXISTS
                     FOR (p:Page) REQUIRE p.url IS UNIQUE`
        )
        .catch((e) => console.log("Constraint exists:", e.message));
    } catch (error) {
      console.log(
        "Neo4j connection failed, continuing without database storage:",
        error.message
      );
    } finally {
      await session.close().catch(() => {
        // Ignore session close errors if connection failed
      });
    }
  }

  private async scrapeUrl(url: string): Promise<PageData | null> {
    // Check if scraping should stop
    if (this.shouldStop) {
      console.log("Scraping stopped, skipping URL:", url);
      return null;
    }

    try {
      console.log("Attempting to scrape:", url);

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        maxRedirects: 5,
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });

      // Debug response
      console.log("Response status:", response.status);
      console.log("Content type:", response.headers["content-type"]);

      if (!response.data || typeof response.data !== "string") {
        console.log("Invalid response data type:", typeof response.data);
        return null;
      }

      const $ = cheerio.load(response.data, {
        xmlMode: false,
      });

      $("script, style, noscript, iframe, img").remove();

      const title =
        $("title").text().trim() || $("h1").first().text().trim() || url;
      const content = $("body").text().replace(/\s+/g, " ").trim();

      // Extract links
      const links = new Set<string>();
      $("a").each((_, element) => {
        const href = $(element).attr("href");
        if (href && this.isValidUrl(href, url)) {
          const absoluteUrl = new URL(href, url).toString().split("#")[0];
          links.add(absoluteUrl);
        }
      });

      // Check again if should stop before heavy processing
      if (this.shouldStop) {
        return null;
      }

      const analysis = await this.analyzePage(content);

      return {
        url,
        title,
        content,
        summary: analysis.summary,
        keywords: analysis.keywords,
        links: Array.from(links),
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  }

  private async analyzePage(
    content: string,
    question?: string
  ): Promise<{ summary: string; keywords: string[]; answer?: string }> {
    try {
      const prompt = question
        ? `Analyze the webpage content and answer this question: "${question}". 
             Return a simple string as an answer, not an object. 
             Scrap the page until you find the answer, but if you can answer - do it immediately and stop scrapping.
             Avoid viewing all subpages unless necessary to provide the correct answer
             Provide response as JSON with fields:
             'summary' (brief page summary), 
             'keywords' (5-10 relevant terms), 
             'answer' (direct answer to the question as a string, or null if no relevant answer found)`
        : "Analyze the webpage content and provide a JSON object with 'summary' and 'keywords' fields.";

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: prompt + " Return raw JSON without markdown formatting.",
          },
          {
            role: "user",
            content: content.substring(0, 3000),
          },
        ],
      });

      const responseText = completion.choices[0].message.content || "{}";
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      try {
        const response = JSON.parse(cleanJson);
        return {
          summary: response.summary || "",
          keywords: Array.isArray(response.keywords) ? response.keywords : [],
          answer: typeof response.answer === "string" ? response.answer : null,
        };
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        return { summary: "", keywords: [], answer: null };
      }
    } catch (error) {
      console.error("Error analyzing page:", error);
      return { summary: "", keywords: [], answer: null };
    }
  }

  async scrapeWebsiteWithQuestion(
    startUrl: string,
    question: string,
    maxPages: number = 100
  ) {
    this.shouldStop = false;
    await this.initNeo4j();

    this.baseUrl = new URL(startUrl).origin;
    this.visitedUrls.clear();
    this.status = {
      pagesProcessed: 0,
      totalPages: maxPages,
      currentUrl: startUrl,
      completed: false,
      stopped: false,
    };

    const queue = [startUrl];
    let foundAnswer = null;

    while (
      queue.length > 0 &&
      this.visitedUrls.size < maxPages &&
      !this.shouldStop &&
      !foundAnswer
    ) {
      const url = queue.shift();
      if (!url || this.visitedUrls.has(url)) continue;

      this.status.currentUrl = url;
      console.log(
        `Analyzing ${url}... (${this.visitedUrls.size + 1}/${maxPages})`
      );

      const pageData = await this.scrapeUrl(url);

      if (pageData) {
        // Analyze page with the specific question
        const analysis = await this.analyzePage(pageData.content, question);

        if (analysis.answer) {
          foundAnswer = {
            url: url,
            title: pageData.title,
            answer: String(analysis.answer), // Ensure it's a string
          };
          console.log("Found answer on page:", url);
          break;
        }

        // Store page anyway for future reference
        await this.storePage({
          ...pageData,
          summary: analysis.summary,
          keywords: analysis.keywords,
        });

        this.visitedUrls.add(url);
        this.status.pagesProcessed++;

        // Only add new URLs to queue if we haven't found an answer
        if (!foundAnswer) {
          pageData.links.forEach((link) => {
            if (!this.visitedUrls.has(link) && !queue.includes(link)) {
              queue.push(link);
            }
          });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.status.completed = true;
    if (foundAnswer) {
      this.status.stopped = true;
      return foundAnswer;
    }

    return null;
  }

  private async storePage(page: PageData) {
    if (this.shouldStop) {
      return;
    }

    const session = this.neo4jDriver.session();
    try {
      const embedding = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: `${page.title} ${page.content.substring(0, 8000)}`,
      });

      await session.run(
        `MERGE (p:Page {url: $url})
                 SET p.title = $title,
                     p.summary = $summary,
                     p.lastUpdated = datetime(),
                     p.embedding = $embedding`,
        {
          url: page.url,
          title: page.title,
          summary: page.summary,
          embedding: embedding.data[0].embedding,
        }
      );

      for (const keyword of page.keywords) {
        if (this.shouldStop) break;
        await session.run(
          `MERGE (k:Keyword {name: $keyword})
                     WITH k
                     MATCH (p:Page {url: $url})
                     MERGE (p)-[r:HAS_KEYWORD]->(k)`,
          { keyword, url: page.url }
        );
      }
    } catch (error) {
      console.log(
        "Failed to store page in Neo4j, continuing without storage:",
        error.message
      );
      // Continue execution without storing to database
    } finally {
      await session.close().catch(() => {
        // Ignore session close errors if connection failed
      });
    }
  }

  async scrapeWebsite(startUrl: string, maxPages: number = 100) {
    if (this.shouldStop) {
      console.log("Scraping already stopped");
      return;
    }

    this.shouldStop = false;
    await this.initNeo4j();

    this.baseUrl = new URL(startUrl).origin;
    this.visitedUrls.clear();
    this.status = {
      pagesProcessed: 0,
      totalPages: maxPages,
      currentUrl: startUrl,
      completed: false,
      stopped: false,
    };

    const queue = [startUrl];

    while (
      queue.length > 0 &&
      this.visitedUrls.size < maxPages &&
      !this.shouldStop
    ) {
      const url = queue.shift();
      if (!url || this.visitedUrls.has(url)) continue;

      this.status.currentUrl = url;
      console.log(
        `Scraping ${url}... (${this.visitedUrls.size + 1}/${maxPages})`
      );

      const pageData = await this.scrapeUrl(url);

      if (pageData) {
        await this.storePage(pageData);
        this.visitedUrls.add(url);
        this.status.pagesProcessed++;

        if (this.shouldStop) {
          console.log("Stopping scraping as requested by user");
          break;
        }

        pageData.links.forEach((link) => {
          if (!this.visitedUrls.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.status.completed = true;
    if (this.shouldStop) {
      this.status.stopped = true;
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async queryContent(question: string) {
    const session = this.neo4jDriver.session();
    try {
      const questionEmbedding = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: question,
      });

      const result = await session.run(`
                MATCH (p:Page)
                RETURN p.url, p.title, p.summary, p.keywords, p.embedding
            `);

      const pages = result.records.map((record) => ({
        url: record.get("p.url"),
        title: record.get("p.title"),
        summary: record.get("p.summary"),
        keywords: record.get("p.keywords"),
        embedding: record.get("p.embedding"),
      }));

      return pages
        .map((page) => ({
          ...page,
          similarity: this.cosineSimilarity(
            questionEmbedding.data[0].embedding,
            page.embedding
          ),
        }))
        .filter((page) => page.similarity > 0.7)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.neo4jDriver.close();
  }
}
