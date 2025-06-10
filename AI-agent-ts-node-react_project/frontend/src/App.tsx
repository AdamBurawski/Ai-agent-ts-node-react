import React, { useState } from "react";
import "./App.css";
import AppLayout from "./components/layout/AppLayout";
import { TabType } from "./components/layout/Navigation";
import AudioProcessorComponent from "./components/features/AudioProcessor/AudioProcessorComponent";
import ImageProcessorComponent from "./components/features/ImageProcessor/ImageProcessorComponent";
import VectorDatabaseComponent from "./components/features/VectorDatabase/VectorDatabaseComponent";
import GraphVisualizationComponent from "./components/features/GraphVisualization/GraphVisualizationComponent";
import SQLQueryComponent from "./components/features/SQLQuery/SQLQueryComponent";
import WebScraperTool from "./components/WebScraperTool";
import AgentComponent from "./components/AgentComponent";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { AppProvider } from "./contexts/AppContext";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("agent");

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "audio":
        return <AudioProcessorComponent />;
      case "image":
        return <ImageProcessorComponent />;
      case "vector":
        return <VectorDatabaseComponent />;
      case "graph":
        return <GraphVisualizationComponent />;
      case "scraper":
        return <WebScraperTool />;
      case "agent":
        return <AgentComponent />;
      case "sql":
        return <SQLQueryComponent />;
      default:
        return <AgentComponent />;
    }
  };

  return (
    <AppProvider>
      <ErrorBoundary>
        <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
          {renderActiveComponent()}
        </AppLayout>
      </ErrorBoundary>
    </AppProvider>
  );
}

export default App;
