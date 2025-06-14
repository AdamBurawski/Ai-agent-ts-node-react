import React, { useState } from "react";
import { apiService } from "../services/api";
import { useChat } from "../hooks/useChat";
import { useApiCall } from "../hooks/useApiCall";
import ChatInterface from "./chat/ChatInterface";
import "./AgentComponent.scss";

const AgentComponent: React.FC = () => {
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  const { messages, addMessage } = useChat();

  const { loading: agentLoading, execute: executeAgentQuery } = useApiCall(
    apiService.processAgentQuery
  );

  const handleSendMessage = async (message: string) => {
    addMessage(message, "user");

    try {
      // Convert frontend chat history to backend format
      const conversationHistory = messages
        .map((msg) => ({
          message: msg.content,
          role: msg.type === "user" ? "user" : "agent",
          timestamp: msg.timestamp,
        }))
        .concat([
          {
            message: message,
            role: "user" as const,
            timestamp: new Date(),
          },
        ]);

      const response = await apiService.processAgentQuery(
        message,
        conversationHistory
      );

      // Handle new response structure: { response: string, success: boolean }
      let content = "";
      if (response.response) {
        content = response.response;
      } else if (response.result) {
        // Fallback to old structure for compatibility
        content =
          typeof response.result === "string"
            ? response.result
            : JSON.stringify(response.result, null, 2);
      } else {
        content = "Otrzymano odpowiedź bez treści.";
      }

      addMessage(content, "agent", response.analysis);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while processing your request";

      addMessage(errorMessage, "system");
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageUploadLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const result = await apiService.uploadImage(formData);
      addMessage(
        `Image uploaded and analyzed successfully! Extracted text: "${result.text}". You can now ask questions about this image.`,
        "system"
      );
    } catch (error) {
      console.error("Upload error:", error);
      addMessage("Failed to upload image. Please try again.", "system");
    } finally {
      setImageUploadLoading(false);
    }
  };

  return (
    <div className="agent-container">
      <div className="agent-container__main">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={agentLoading}
          title="AI Assistant"
          placeholder="Ask me anything..."
          showAnalysis={true}
          className="agent-chat"
        />
      </div>

      <div className="agent-container__sidebar">
        <div className="image-upload-section">
          <h3>Upload Image for Analysis</h3>
          <div className="image-upload-form">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={imageUploadLoading}
              className="image-upload-input"
            />
            {imageUploadLoading && (
              <div className="upload-status">Uploading image...</div>
            )}
          </div>
          <p className="image-upload-hint">
            Upload an image to analyze its content and ask questions about it.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AgentComponent;
