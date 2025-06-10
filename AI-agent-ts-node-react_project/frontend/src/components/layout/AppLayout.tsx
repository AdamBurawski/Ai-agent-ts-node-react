import React from "react";
import Navigation, { TabType } from "./Navigation";
import "./AppLayout.scss";

interface AppLayoutProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  return (
    <div className="app-layout">
      <div className="app-layout__navigation">
        <Navigation activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      <main className="app-layout__content">
        <div className="app-layout__container">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
