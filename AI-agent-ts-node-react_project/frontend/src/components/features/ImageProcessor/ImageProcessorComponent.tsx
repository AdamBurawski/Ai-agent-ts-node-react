import React, { useRef, useState } from "react";
import { useImageProcessor } from "../../../hooks/useImageProcessor";
import ChatInterface from "../../chat/ChatInterface";
import "./ImageProcessorComponent.scss";

const ImageProcessorComponent: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");

  const {
    ocrResult,
    loading,
    error,
    messages,
    handleImageUpload,
    handleChatSubmit,
    processImages,
    generateImage,
    clearResults,
  } = useImageProcessor();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerateImage = async () => {
    if (prompt.trim()) {
      await generateImage(prompt);
      setPrompt(""); // Wyczyść prompt po wygenerowaniu
    }
  };

  return (
    <div className="image-processor">
      <div className="image-processor__header">
        <h2>Przetwarzanie Obrazów</h2>
        <div className="image-processor__actions">
          <button
            onClick={handleUploadClick}
            disabled={loading}
            className="btn btn--primary"
          >
            {loading ? "Przesyłanie..." : "Wybierz obraz"}
          </button>
          <button
            onClick={processImages}
            disabled={loading}
            className="btn btn--secondary"
          >
            Przetwarzaj obrazy w folderze
          </button>
          {(ocrResult || messages.length > 0) && (
            <button onClick={clearResults} className="btn btn--outline">
              Wyczyść wyniki
            </button>
          )}
        </div>

        <div className="image-generator">
          <div className="image-generator__input">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Opisz obraz, który chcesz wygenerować..."
              disabled={loading}
              className="image-generator__prompt"
              onKeyPress={(e) => {
                if (e.key === "Enter" && !loading && prompt.trim()) {
                  handleGenerateImage();
                }
              }}
            />
            <button
              onClick={handleGenerateImage}
              disabled={loading || !prompt.trim()}
              className="btn btn--success"
            >
              {loading ? "Generowanie..." : "🎨 Generuj grafikę"}
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
      </div>

      {error && (
        <div className="image-processor__error">
          <p>Błąd: {error}</p>
        </div>
      )}

      <div className="image-processor__content">
        <div className="image-processor__main">
          {ocrResult && (
            <div className="ocr-result">
              <h3>Wynik OCR</h3>
              <div className="ocr-result__content">{ocrResult}</div>
            </div>
          )}

          <ChatInterface
            messages={messages}
            onSendMessage={handleChatSubmit}
            loading={loading}
            title="Czat o obrazie"
            placeholder="Zadaj pytanie o przesłany obraz..."
            className="image-chat"
          />
        </div>

        <div className="image-processor__info">
          <div className="info-card">
            <h4>Jak używać:</h4>
            <ul>
              <li>Wybierz obraz z dysku</li>
              <li>System automatycznie wykona OCR</li>
              <li>Zadawaj pytania o zawartość obrazu</li>
              <li>Możesz też przetwarzać cały folder obrazów</li>
              <li>🎨 Generuj nowe obrazy przez AI używając DALL-E</li>
            </ul>
          </div>

          <div className="info-card">
            <h4>Obsługiwane formaty:</h4>
            <p>JPG, PNG, GIF, BMP, WebP</p>
          </div>

          <div className="info-card">
            <h4>Generator obrazów:</h4>
            <p>
              Opisz obraz, a AI DALL-E go wygeneruje. Obrazy są zapisywane w
              folderze uploads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageProcessorComponent;
