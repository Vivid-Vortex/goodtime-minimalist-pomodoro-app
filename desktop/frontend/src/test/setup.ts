import "@testing-library/jest-dom";

// Mock the Wails runtime and bindings so tests never touch the Go backend
vi.mock("../wailsjs/runtime/runtime", () => ({
  EventsOn: vi.fn(() => () => {}),
  EventsOff: vi.fn(),
  EventsOnce: vi.fn(),
}));

vi.mock("../wailsjs/go/main/App", () => ({
  StartTimer:              vi.fn().mockResolvedValue(undefined),
  PauseTimer:              vi.fn().mockResolvedValue(undefined),
  ResumeTimer:             vi.fn().mockResolvedValue(undefined),
  StopTimer:               vi.fn().mockResolvedValue(undefined),
  SkipTimer:               vi.fn().mockResolvedValue(undefined),
  GetTimerState:           vi.fn().mockResolvedValue({
    kind: "RESET", timerType: "FOCUS", elapsedSeconds: 0,
    totalSeconds: 4320, completedSessions: 0, activeLabelName: "Default",
  }),
  GetLabels:               vi.fn().mockResolvedValue([]),
  CreateLabel:             vi.fn().mockResolvedValue({ name: "New", colorIndex: 0, orderIndex: 0, useDefaultProfile: true, timerProfile: {}, isArchived: false }),
  UpdateLabel:             vi.fn().mockResolvedValue(undefined),
  DeleteLabel:             vi.fn().mockResolvedValue(undefined),
  ArchiveLabel:            vi.fn().mockResolvedValue(undefined),
  UnarchiveLabel:          vi.fn().mockResolvedValue(undefined),
  ReorderLabels:           vi.fn().mockResolvedValue(undefined),
  SetActiveLabel:          vi.fn().mockResolvedValue(undefined),
  GetSessions:             vi.fn().mockResolvedValue([]),
  UpdateSession:           vi.fn().mockResolvedValue(undefined),
  DeleteSessions:          vi.fn().mockResolvedValue(undefined),
  BulkEditLabel:           vi.fn().mockResolvedValue(undefined),
  GetStatisticsSummary:    vi.fn().mockResolvedValue({ totalWorkMinutes: 0, totalBreakMinutes: 0, sessionCount: 0, perLabel: {} }),
  GetTimelineData:         vi.fn().mockResolvedValue([]),
  GetSettings:             vi.fn().mockResolvedValue({
    activeLabelName: "Default", defaultTimerProfileName: "72/5", theme: "dark",
    workFinishedSound: "", breakFinishedSound: "",
    autoStartWork: false, autoStartBreak: false,
    enableDesktopNotifications: true, cloudBackupEnabled: false, lastSyncTimestamp: 0,
  }),
  UpdateSettings:          vi.fn().mockResolvedValue(undefined),
  GetTimerProfiles:        vi.fn().mockResolvedValue([]),
  SaveTimerProfile:        vi.fn().mockResolvedValue(undefined),
  DeleteTimerProfile:      vi.fn().mockResolvedValue(undefined),
  ExportBackup:            vi.fn().mockResolvedValue("/tmp/backup.json"),
  ImportBackup:            vi.fn().mockResolvedValue(undefined),
}));
