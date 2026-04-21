import { describe, it, expect, beforeEach } from "vitest";
import { useTimerStore } from "../stores/timerStore";
import { useAppStore } from "../stores/appStore";

describe("timerStore", () => {
  beforeEach(() => {
    useTimerStore.setState({
      state: {
        kind: "RESET",
        timerType: "FOCUS",
        elapsedSeconds: 0,
        totalSeconds: 4320,
        completedSessions: 0,
        activeLabelName: "Default",
      },
    });
  });

  it("has default RESET state", () => {
    expect(useTimerStore.getState().state.kind).toBe("RESET");
  });

  it("setState updates the store", () => {
    const next = {
      kind: "RUNNING" as const,
      timerType: "FOCUS" as const,
      elapsedSeconds: 30,
      totalSeconds: 4320,
      completedSessions: 0,
      activeLabelName: "W1M",
    };
    useTimerStore.getState().setState(next);
    expect(useTimerStore.getState().state.kind).toBe("RUNNING");
    expect(useTimerStore.getState().state.elapsedSeconds).toBe(30);
    expect(useTimerStore.getState().state.activeLabelName).toBe("W1M");
  });
});

describe("appStore", () => {
  beforeEach(() => {
    useAppStore.setState({ labels: [], settings: null, timerProfiles: [], activeTab: "timer" });
  });

  it("starts on timer tab", () => {
    expect(useAppStore.getState().activeTab).toBe("timer");
  });

  it("setActiveTab changes tab", () => {
    useAppStore.getState().setActiveTab("stats");
    expect(useAppStore.getState().activeTab).toBe("stats");
  });

  it("setLabels updates labels", () => {
    const label = { name: "Test", colorIndex: 3, orderIndex: 0, useDefaultProfile: true, timerProfile: {} as never, isArchived: false };
    useAppStore.getState().setLabels([label]);
    expect(useAppStore.getState().labels).toHaveLength(1);
    expect(useAppStore.getState().labels[0].name).toBe("Test");
  });

  it("setSettings stores settings", () => {
    const s = {
      activeLabelName: "Work",
      defaultTimerProfileName: "72/5",
      theme: "dark" as const,
      workFinishedSound: "",
      breakFinishedSound: "",
      autoStartWork: false,
      autoStartBreak: true,
      enableDesktopNotifications: true,
      cloudBackupEnabled: false,
      lastSyncTimestamp: 0,
      cloudSyncSchedule: "",
    };
    useAppStore.getState().setSettings(s);
    expect(useAppStore.getState().settings?.autoStartBreak).toBe(true);
  });
});
