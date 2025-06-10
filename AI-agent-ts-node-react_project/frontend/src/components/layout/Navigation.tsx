import React from "react";
import "./Navigation.scss";

export type TabType =
  | "audio"
  | "image"
  | "vector"
  | "graph"
  | "scraper"
  | "agent"
  | "sql";

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "audio" as TabType, label: "Audio/Tekst", icon: "🎵✏️" },
    { id: "image" as TabType, label: "Obrazy", icon: "🖼️" },
    { id: "vector" as TabType, label: "Baza Wektorowa", icon: "🔍" },
    { id: "graph" as TabType, label: "Graf", icon: "🕸️" },
    { id: "scraper" as TabType, label: "Web Scraper", icon: "🕷️" },
    { id: "agent" as TabType, label: "AI Agent", icon: "🤖" },
    { id: "sql" as TabType, label: "SQL", icon: "💾" },
  ];

  return (
    <nav className="navigation">
      <div className="navigation__header">
        <h1 className="navigation__title">Asist 🐜 Ant </h1>
        <p className="navigation__subtitle">
          Your personal multimodal AI-agent
        </p>
      </div>

      <div className="navigation__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`navigation__tab ${
              activeTab === tab.id ? "navigation__tab--active" : ""
            }`}
          >
            <span
              style={{
                background: "linear-gradient(45deg, #fff, #e0e7ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              className="navigation__tab-icon"
            >
              {tab.icon}
            </span>
            <span className="navigation__tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
