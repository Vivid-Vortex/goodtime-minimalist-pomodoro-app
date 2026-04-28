import { useEffect } from "react";
import { GetLabels, GetSettings, GetTimerProfiles } from "./wailsjs/go/main/App";
import { useTimerSubscription } from "./hooks/useTimer";
import { useAppStore } from "./stores/appStore";
import { TimerPage } from "./pages/TimerPage";
import { LabelsPage } from "./pages/LabelsPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  const { activeTab, setActiveTab, setLabels, setSettings, setTimerProfiles } = useAppStore();

  // Subscribe to backend timer ticks
  useTimerSubscription();

  // Load initial data
  useEffect(() => {
    GetLabels().then(setLabels).catch(console.error);
    GetSettings().then(setSettings).catch(console.error);
    GetTimerProfiles().then(setTimerProfiles).catch(console.error);
  }, [setLabels, setSettings, setTimerProfiles]);

  return (
    <div className="flex flex-col h-screen bg-surface-900 text-white select-none overflow-hidden">
      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "timer"    && <TimerPage />}
        {activeTab === "stats"    && <StatisticsPage />}
        {activeTab === "labels"   && <LabelsPage />}
        {activeTab === "settings" && <SettingsPage />}
      </main>

      {/* Bottom navigation bar */}
      <nav className="flex items-center border-t border-surface-700 bg-surface-900">
        <NavButton
          icon="⏱"
          label="Timer"
          active={activeTab === "timer"}
          onClick={() => setActiveTab("timer")}
        />
        <NavButton
          icon="📊"
          label="Stats"
          active={activeTab === "stats"}
          onClick={() => setActiveTab("stats")}
        />
        <NavButton
          icon="🏷"
          label="Labels"
          active={activeTab === "labels"}
          onClick={() => setActiveTab("labels")}
        />
        <NavButton
          icon="⚙"
          label="Settings"
          active={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />
      </nav>
    </div>
  );
}

interface NavButtonProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors
        ${active ? "text-brand-400" : "text-gray-600 hover:text-gray-400"}`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className={`text-xs font-medium ${active ? "opacity-100" : "opacity-60"}`}>
        {label}
      </span>
    </button>
  );
}
