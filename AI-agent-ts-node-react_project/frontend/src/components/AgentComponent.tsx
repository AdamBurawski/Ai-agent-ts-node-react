import React, { useState } from "react";
import './AgentComponent.scss';

interface AgentResponse {
  analysis: {
    selectedTool: string;
    reasoning: string;
    plan: string[];
    parameters: Record<string, string | number | boolean>;
  };
  result: Record<string, unknown>;
}

const AgentComponent: React.FC = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{
    type: 'user' | 'agent' | 'system';
    content: string;
    analysis?: any;
  }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedQuery = query.trim();
    // Add user message to chat
    setChatHistory(prev => [...prev, { type: 'user', content: trimmedQuery }]);

    try {
      const result = await fetch("http://localhost:3001/api/agent/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
      });

      if (!result.ok) throw new Error("Failed to process request");
      const data: AgentResponse = await result.json();
      
      // Add agent response to chat
      setChatHistory(prev => [...prev, {
        type: 'agent',
        content: typeof data.result === 'string' ? data.result : JSON.stringify(data.result),
        analysis: data.analysis
      }]);
      
      setQuery(""); // Clear input after successful submission
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:3001/api/image/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      setChatHistory(prev => [...prev, {
        type: 'system',
        content: 'Image uploaded successfully! You can now ask questions about it.'
      }]);
    } catch (error) {
      console.error('Upload error:', error);
      setChatHistory(prev => [...prev, {
        type: 'system',
        content: 'Failed to upload image. Please try again.'
      }]);
    }
  };

  return (
    <div className="agent-container">
      <div className="chat-container">
        <div className="chat-container__header">
          <h2>AI Assistant</h2>
        </div>

        <div className="chat-container__main">
          <div className="chat-container__messages">
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`message ${message.type === 'user' ? 'message--user' : message.type === 'agent' ? 'message--ai' : 'message--system'}`}
              >
                <div className="message__bubble">
                  <div className="message__bubble-header">
                    {message.type === 'user' ? 'You' : message.type === 'agent' ? 'AI Assistant' : 'System'}
                  </div>
                  <div className="message__bubble-content">
                    {message.content}
                  </div>
                  {message.analysis && (
                    <div className="message__bubble-analysis">
                      <div>Tool: {message.analysis.selectedTool}</div>
                      <div>Reasoning: {message.analysis.reasoning}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="chat-container__error">
              {error}
            </div>
          )}

          {/* Pojedynczy formularz */}
          <form onSubmit={handleSubmit} className="chat-container__input-form">
            <div className="input-group">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type your message..."
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button type="submit" disabled={loading || !query.trim()}>
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="image-upload-section">
        <h3>Upload Image for Analysis</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ marginBottom: '1rem' }}
        />
      </div>

      <div className="chat-section">
        {/* ... existing chat input ... */}
      </div>
    </div>
  );
};

export default AgentComponent;
