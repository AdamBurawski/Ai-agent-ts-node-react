import React from "react";
import { useAudioProcessor } from "../../../hooks/useAudioProcessor";
import "./AudioProcessorComponent.scss";

const AudioProcessorComponent: React.FC = () => {
  const {
    transcriptions,
    textFiles,
    loading,
    error,
    processFolder,
    readTextFiles,
    clearData,
  } = useAudioProcessor();

  return (
    <div className="audio-processor">
      <div className="audio-processor__header">
        <h2>Przetwarzanie Audio</h2>
        <div className="audio-processor__actions">
          <button
            onClick={processFolder}
            disabled={loading}
            className="btn btn--primary"
          >
            {loading ? "Przetwarzanie..." : "Przetwarzaj pliki MP3"}
          </button>
          <button
            onClick={readTextFiles}
            disabled={loading}
            className="btn btn--secondary"
          >
            Czytaj pliki TXT
          </button>
          {(transcriptions.length > 0 || textFiles.length > 0) && (
            <button onClick={clearData} className="btn btn--outline">
              Wyczyść dane
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="audio-processor__error">
          <p>Błąd: {error}</p>
        </div>
      )}

      {transcriptions.length > 0 && (
        <div className="audio-processor__section">
          <h3>Transkrypcje</h3>
          <div className="transcription-list">
            {transcriptions.map((transcription, index) => (
              <div key={index} className="transcription-item">
                <div className="transcription-item__header">
                  <strong>Plik:</strong> {transcription.file}
                </div>
                <div className="transcription-item__content">
                  <strong>Transkrypcja:</strong>{" "}
                  {transcription.text || "Brak tekstu"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {textFiles.length > 0 && (
        <div className="audio-processor__section">
          <h3>Pliki tekstowe</h3>
          <div className="text-files-list">
            {textFiles.map((textFile, index) => (
              <div key={index} className="text-file-item">
                <div className="text-file-item__header">
                  <h4>{textFile.file}</h4>
                </div>
                <div className="text-file-item__content">
                  <p>{textFile.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading &&
        transcriptions.length === 0 &&
        textFiles.length === 0 &&
        !error && (
          <div className="audio-processor__empty">
            <p>
              Brak danych do wyświetlenia. Użyj przycisków powyżej, aby
              rozpocząć przetwarzanie.
            </p>
          </div>
        )}
    </div>
  );
};

export default AudioProcessorComponent;
