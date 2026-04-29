export const queryKeys = {
  labels: {
    all: ['labels'] as const,
    detail: (id: string) => ['labels', id] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  timerProfiles: {
    all: ['timerProfiles'] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    byDate: (date: string) => ['sessions', date] as const,
  },
  cloud: {
    timesheetEntry: (date: string) => ['cloud', 'timesheetEntry', date] as const,
    appHistory: (date: string) => ['cloud', 'appHistory', date] as const,
  },
  statistics: {
    overview: () => ['statistics', 'overview'] as const,
  },
  cloudStats: {
    all: ['cloudStats'] as const,
  },
}
