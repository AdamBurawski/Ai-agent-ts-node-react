import React, { useState, useEffect } from "react";
import "./App.css";
import { Chart } from "chart.js";
import SQLQueryTool from "./SQLQueryTool";
import GraphComponent from "./GraphComponent";
import WebScraperTool from "./components/WebScraperTool";
import AgentComponent from "./components/AgentComponent";

interface Connection {
  source: string;
  target: string;
}
function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  interface Transcription {
    file: string;
    text: string;
  }

  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [textFiles, setTextFiles] = useState<
    { file: string; content: string }[]
  >([]);
  const [graphicData, setGraphicData] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "model"; message: string }[]
  >([]);

  const processFolder = async () => {
    setLoading(true);
    setError(null);
    try {
      const processResponse = await fetch(
        "http://127.0.0.1:3001/api/audio/process-folder",
        {
          method: "GET",
        }
      );
      if (!processResponse.ok) {
        throw new Error(`Błąd: ${processResponse.status}`);
      }
      const data: Transcription[] = await processResponse.json();
      setTranscriptions(data);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const readTextFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "http://127.0.0.1:3001/api/audio/read-text-files"
      );
      if (!response.ok) {
        throw new Error(`Błąd: ${response.status}`);
      }
      const data = await response.json();
      setTextFiles(data);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const generateGraphic = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "http://127.0.0.1:3001/api/vector/generate-graphic",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: "Generate a graphic for my data" }),
        }
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setGraphicData(data.graphicData);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    const fileInput = document.getElementById("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      alert("Please select an image to upload.");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await fetch("http://localhost:3001/api/image/ocr", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setOcrResult(result.text);
    } catch (err) {
      console.error("Error during image upload:", err);
      alert("An error occurred while uploading the image.");
    }
  };

  const handleChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const chatInput = document.getElementById("chatInput") as HTMLInputElement;
    const userMessage = chatInput.value.trim();

    if (!userMessage) {
      alert("Please enter a message.");
      return;
    }

    setChatMessages((prev) => [
      ...prev,
      { role: "user", message: userMessage },
    ]);

    try {
      const response = await fetch("http://localhost:3001/api/image/ocr/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "model", message: result.reply },
      ]);

      // Clear input
      chatInput.value = "";
    } catch (err) {
      console.error("Error during chat:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          message: "An error occurred while processing your message.",
        },
      ]);
    }
  };

  const processImages = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/api/image/process-images"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log("Image descriptions:", result.descriptions);
      alert("Images processed successfully!");
    } catch (error) {
      console.error("Error processing images:", error);
      alert("An error occurred while processing the images.");
    }
  };

  const generateEmbeddings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "http://127.0.0.1:3001/api/vector/generate-embeddings"
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "An unknown error occurred");
      }
      const data = await response.json();
      console.log("Generated Embeddings:", data.embeddings);
      alert("Embeddings generated successfully! Check console for details.");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error generating embeddings:", error.message);
        setError(
          error.message || "An error occurred while generating embeddings."
        );
      } else {
        console.error("Unexpected error:", error);
        setError("An unexpected error occurred while generating embeddings.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChatWithVectorDB = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      alert("Please enter a question.");
      return;
    }
    setChatMessages((prev) => [...prev, { role: "user", message: query }]);
    try {
      const response = await fetch("http://127.0.0.1:3001/api/vector/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "An unknown error occurred");
      }
      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "model", message: data.answer || "No relevant data found." },
      ]);
      setQuery("");
    } catch (error) {
      console.error("Error querying database:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          message: "An error occurred while querying the database.",
        },
      ]);
    }
  };

  const fetchGraphData = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/api/graph/get-connections"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setConnections(data.connections);
    } catch (error) {
      console.error("Error fetching graph data:", error);
      alert("Failed to fetch graph data. Check the console for details.");
    }
  };

  const fetchConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "http://127.0.0.1:3001/api/graph/get-connections"
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setConnections(data.connections);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const findShortestPath = async (from: string, to: string) => {
    try {
      const response = await fetch(
        "http://localhost:3001/api/graph/shortest-path",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to }),
        }
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      console.log("Shortest path:", data.path);
      alert(
        `Shortest path from ${from} to ${to}: ${JSON.stringify(data.path)}`
      );
    } catch (error) {
      console.error("Error finding shortest path:", error);
      alert("Failed to find shortest path. Check the console for details.");
    }
  };

  useEffect(() => {
    if (graphicData) {
      const ctx = document.getElementById("myChart") as HTMLCanvasElement;
      new Chart(ctx, {
        type: "bar",
        data: JSON.parse(graphicData),
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
    fetchConnections();
    fetchGraphData();
  }, [graphicData]);

  // Przygotowanie danych dla Vis Network
  const graphData = {
    nodes: Array.from(
      new Set([
        ...connections.map((c) => c.source),
        ...connections.map((c) => c.target),
      ])
    ).map((id) => ({ id, label: id })),
    edges: connections.map((c) => ({ from: c.source, to: c.target })),
  };

  const handleSummaryRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const summaryInput = document.getElementById(
      "summaryQuestion"
    ) as HTMLInputElement;
    const summaryQuestion = summaryInput.value.trim();
    if (!summaryQuestion) {
      alert("Please enter a question for the summary.");
      return;
    }
    setChatMessages((prev) => [
      ...prev,
      { role: "user", message: summaryQuestion },
    ]);
    try {
      const response = await fetch("http://localhost:3001/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: summaryQuestion }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "model", message: result.summary },
      ]);
      summaryInput.value = "";
    } catch (err) {
      console.error("Error during summary request:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          message: "An error occurred while processing your summary request.",
        },
      ]);
    }
  };
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>AI_Devs_3-Agent</h1>
      <button
        onClick={processFolder}
        disabled={loading}
        style={{
          padding: "10px 20px",
          backgroundColor: loading ? "#aaa" : "#007BFF",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Przetwarzanie..." : "Przetwarzaj pliki MP3"}
      </button>
      {error && <p style={{ color: "red" }}>Błąd: {error}</p>}
      <div style={{ marginTop: "20px" }}>
        {transcriptions.length > 0 ? (
          <ul>
            {transcriptions.map((transcription, index) => (
              <li key={index} style={{ marginBottom: "20px" }}>
                <p>
                  <strong>File name:</strong> {transcription.file}
                </p>
                <p>
                  <strong>Transcription:</strong>{" "}
                  {transcription.text || "Brak tekstu"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          !loading && <p>Brak transkrypcji do wyświetlenia.</p>
        )}
      </div>
      <form onSubmit={handleImageUpload} style={{ marginBottom: "20px" }}>
        <label htmlFor="file">Select an image:</label>
        <input type="file" id="file" name="image" accept="image/*" required />
        <button type="submit">Upload Image</button>
      </form>
      {ocrResult && (
        <p>
          <strong>OCR Result:</strong> {ocrResult}
        </p>
      )}
      <div>
        <h2>Chat about the Image</h2>
        <div
          id="chat-box"
          style={{
            border: "1px solid #ddd",
            padding: "10px",
            maxHeight: "300px",
            overflowY: "scroll",
          }}
        >
          {chatMessages.map((msg, index) => (
            <div key={index}>
              <strong>{msg.role === "user" ? "You" : "Model"}:</strong>{" "}
              {msg.message}
            </div>
          ))}
        </div>
        <form onSubmit={handleChatSubmit}>
          <input
            type="text"
            id="chatInput"
            placeholder="Ask something about the image..."
            required
          />
          <button type="submit">Send</button>
        </form>
      </div>
      <button onClick={readTextFiles}>Czytaj pliki TXT</button>
      {textFiles.length > 0 && (
        <div>
          {textFiles.map((textFile, index) => (
            <div key={index}>
              <h3>{textFile.file}</h3>
              <p>{textFile.content}</p>
            </div>
          ))}
        </div>
      )}
      <button onClick={handleSummaryRequest} disabled={loading}>
        Request Summary
      </button>
      <div
        id="chat-box"
        style={{
          border: "1px solid #ddd",
          padding: "10px",
          maxHeight: "300px",
          overflowY: "scroll",
        }}
      >
        {chatMessages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.role === "user" ? "You" : "Model"}:</strong>{" "}
            {msg.message}
          </div>
        ))}
      </div>
      <div>
        <h2>Ask for a Summary</h2>
        <form onSubmit={handleSummaryRequest}>
          <input
            type="text"
            id="summaryQuestion"
            placeholder="Enter your question for the summary"
            required
          />
          <button type="submit">Send</button>
        </form>
      </div>
      <button onClick={generateGraphic} disabled={loading}>
        {loading ? "Generating Graphic..." : "Generate Graphic"}
      </button>
      <button onClick={processImages}>Process Images in Folder</button>;
      {graphicData && (
        <div>
          <h3>Generated Graphic</h3>
          <canvas id="myChart"></canvas>
        </div>
      )}
      <button
        onClick={generateEmbeddings}
        style={{
          marginTop: "10px",
          padding: "10px",
          backgroundColor: "#007BFF",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Generate Embeddings
      </button>
      <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
        <h1>Wector_DataBases</h1>
        <div>
          <h2>Chat with Vector Database</h2>
          <div
            id="chat-box"
            style={{
              border: "1px solid #ddd",
              padding: "10px",
              maxHeight: "300px",
              overflowY: "scroll",
            }}
          >
            {chatMessages.map((msg, index) => (
              <div key={index} style={{ marginBottom: "10px" }}>
                <strong>{msg.role === "user" ? "You" : "Model"}:</strong>{" "}
                {msg.message}
              </div>
            ))}
          </div>
          <form onSubmit={handleChatWithVectorDB} style={{ marginTop: "10px" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask something..."
              required
              style={{
                padding: "10px",
                width: "300px",
                marginRight: "10px",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px",
                backgroundColor: "#007BFF",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
      <SQLQueryTool />
      <div>
        <h1>Graph Visualization</h1>
        <GraphComponent data={graphData} />
        <div>
          <h2>Find Shortest Path</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const from = (
                document.getElementById("fromUser") as HTMLInputElement
              ).value;
              const to = (document.getElementById("toUser") as HTMLInputElement)
                .value;
              findShortestPath(from, to);
            }}
          >
            <input
              type="text"
              id="fromUser"
              placeholder="From (e.g., Rafał)"
              required
            />
            <input
              type="text"
              id="toUser"
              placeholder="To (e.g., Barbara)"
              required
            />
            <button type="submit">Find Path</button>
          </form>
        </div>
      </div>
      <WebScraperTool />
      <AgentComponent />
    </div>
  );
}

export default App;
// Removed unused function setImageUploaded
