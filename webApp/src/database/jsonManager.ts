import defaultData from '../data/defaultData.json';

interface SessionData {
  id: string;
  label: string;
  timerType: string;
  duration: number;
  endTime: number;
  archived: boolean;
  notes?: string;
  interruptions?: number;
}

interface LabelData {
  id: string;
  title: string;
  color: number;
  archived?: boolean;
  orderIndex: number;
}

interface TimerProfileData {
  name: string;
  isCountdown?: boolean;
  workDuration: number;
  isBreakEnabled?: boolean;
  breakDuration: number;
  isLongBreakEnabled?: boolean;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  workBreakRatio: number;
}

interface DatabaseData {
  sessions: SessionData[];
  labels: LabelData[];
  timerProfiles: TimerProfileData[];
  settings: Record<string, string>;
}

class JsonManager {
  private static instance: JsonManager;
  private data: DatabaseData;
  private readonly storageKey = 'goodtime-json-data';

  private constructor() {
    this.data = this.loadData();
  }

  public static getInstance(): JsonManager {
    if (!JsonManager.instance) {
      JsonManager.instance = new JsonManager();
    }
    return JsonManager.instance;
  }

  private loadData(): DatabaseData {
    try {
      // Try to load from localStorage first
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
      
      // Fall back to default data
      return JSON.parse(JSON.stringify(defaultData));
    } catch (error) {
      console.error('Failed to load data:', error);
      return JSON.parse(JSON.stringify(defaultData));
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  // Session methods
  async insertSession(session: SessionData): Promise<void> {
    const existingIndex = this.data.sessions.findIndex(s => s.id === session.id);
    if (existingIndex !== -1) {
      this.data.sessions[existingIndex] = { ...session };
    } else {
      this.data.sessions.push({ ...session });
    }
    this.saveData();
  }

  async updateSession(id: string, updates: Partial<SessionData>): Promise<void> {
    const index = this.data.sessions.findIndex(s => s.id === id);
    if (index !== -1) {
      this.data.sessions[index] = { ...this.data.sessions[index], ...updates };
      this.saveData();
    }
  }

  async deleteSession(id: string): Promise<void> {
    this.data.sessions = this.data.sessions.filter(s => s.id !== id);
    this.saveData();
  }

  async getAllSessions(): Promise<SessionData[]> {
    return [...this.data.sessions].sort((a, b) => b.endTime - a.endTime);
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    focusSessions: number;
    breakSessions: number;
    totalFocusTime: number;
    totalBreakTime: number;
    averageSessionDuration: number;
  }> {
    const activeSessions = this.data.sessions.filter(s => !s.archived);
    const focusSessions = activeSessions.filter(s => s.timerType === 'FOCUS');
    const breakSessions = activeSessions.filter(s => s.timerType !== 'FOCUS');

    const totalFocusTime = focusSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalBreakTime = breakSessions.reduce((sum, s) => sum + s.duration, 0);
    const avgDuration = activeSessions.length > 0 
      ? activeSessions.reduce((sum, s) => sum + s.duration, 0) / activeSessions.length 
      : 0;

    return {
      totalSessions: activeSessions.length,
      focusSessions: focusSessions.length,
      breakSessions: breakSessions.length,
      totalFocusTime,
      totalBreakTime,
      averageSessionDuration: avgDuration
    };
  }

  // Label methods
  async insertLabel(label: LabelData): Promise<void> {
    const existingIndex = this.data.labels.findIndex(l => l.id === label.id);
    if (existingIndex !== -1) {
      this.data.labels[existingIndex] = { ...label };
    } else {
      this.data.labels.push({ ...label });
    }
    this.saveData();
  }

  async updateLabel(id: string, updates: Partial<LabelData>): Promise<void> {
    const index = this.data.labels.findIndex(l => l.id === id);
    if (index !== -1) {
      this.data.labels[index] = { ...this.data.labels[index], ...updates };
      this.saveData();
    }
  }

  async deleteLabel(id: string): Promise<void> {
    this.data.labels = this.data.labels.filter(l => l.id !== id);
    this.saveData();
  }

  async getAllLabels(): Promise<LabelData[]> {
    return [...this.data.labels].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  // Timer profile methods
  async insertTimerProfile(profile: TimerProfileData): Promise<void> {
    const existingIndex = this.data.timerProfiles.findIndex(p => p.name === profile.name);
    if (existingIndex !== -1) {
      this.data.timerProfiles[existingIndex] = { ...profile };
    } else {
      this.data.timerProfiles.push({ ...profile });
    }
    this.saveData();
  }

  async updateTimerProfile(name: string, updates: Partial<TimerProfileData>): Promise<void> {
    const index = this.data.timerProfiles.findIndex(p => p.name === name);
    if (index !== -1) {
      this.data.timerProfiles[index] = { ...this.data.timerProfiles[index], ...updates };
      this.saveData();
    }
  }

  async deleteTimerProfile(name: string): Promise<void> {
    this.data.timerProfiles = this.data.timerProfiles.filter(p => p.name !== name);
    this.saveData();
  }

  async getAllTimerProfiles(): Promise<TimerProfileData[]> {
    return [...this.data.timerProfiles].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Settings methods
  async getSetting(key: string): Promise<string | null> {
    return this.data.settings[key] || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.data.settings[key] = value;
    this.saveData();
  }

  // Export data in the desired JSON format
  async exportData(): Promise<string> {
    const sessions = await this.getAllSessions();
    
    const exportData = sessions.map(session => ({
      archived: session.archived,
      duration: Math.floor(session.duration / 60), // Convert to minutes
      end: new Date(session.endTime).toISOString(),
      interruptions: session.interruptions || 0,
      is_break: session.timerType !== 'FOCUS',
      label: session.label,
      notes: session.notes || ''
    }));

    return JSON.stringify(exportData);
  }

  // Import/Export for GitHub sync
  async exportFullData(): Promise<string> {
    return JSON.stringify(this.data, null, 2);
  }

  async importFullData(jsonData: string): Promise<void> {
    try {
      const imported: DatabaseData = JSON.parse(jsonData);
      
      // Validate the structure
      if (!imported.sessions || !imported.labels || !imported.timerProfiles || !imported.settings) {
        throw new Error('Invalid data structure');
      }

      this.data = imported;
      this.saveData();
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid JSON data format');
    }
  }

  async clearAllData(): Promise<void> {
    this.data = {
      sessions: [],
      labels: [],
      timerProfiles: [],
      settings: {}
    };
    this.saveData();
  }

  // File download/upload helpers
  async downloadAsFile(filename: string = 'goodtime-data.json'): Promise<void> {
    const dataStr = await this.exportFullData();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  uploadFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          await this.importFullData(content);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

export default JsonManager;