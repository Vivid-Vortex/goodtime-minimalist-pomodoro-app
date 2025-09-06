// Browser-compatible cloud database manager
// Uses REST API calls to communicate with MongoDB backend

interface CloudSession {
  id: string;
  archived: boolean;
  duration: number;
  end: string;
  interruptions: number;
  is_break: boolean;
  label: string;
  notes: string;
}

interface CloudLabel {
  id: string;
  title: string;
  color: number;
  archived: boolean;
  orderIndex: number;
}

interface CloudTimerProfile {
  name: string;
  isCountdown: boolean;
  workDuration: number;
  isBreakEnabled: boolean;
  breakDuration: number;
  isLongBreakEnabled: boolean;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  workBreakRatio: number;
}

class CloudDBManager {
  private baseUrl: string;
  private isConnected: boolean = false;

  constructor() {
    // Use MongoDB Cloud connection
    this.baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001/api';
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple ping
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        this.isConnected = true;
        console.log('Connected to cloud database API');
      } else {
        throw new Error('API health check failed');
      }
    } catch (error) {
      console.warn('Cloud database connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('Disconnected from cloud database');
  }

  // Session methods
  async insertSession(session: {
    id: string;
    labelId: string;
    timerType: string;
    duration: number;
    endTime: number;
    archived: boolean;
    notes?: string;
    interruptions?: number;
  }): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const cloudSession: CloudSession = {
      id: session.id,
      archived: session.archived,
      duration: session.duration,
      end: new Date(session.endTime).toISOString(),
      interruptions: session.interruptions || 0,
      is_break: session.timerType === 'BREAK' || session.timerType === 'LONG_BREAK',
      label: session.labelId,
      notes: session.notes || ''
    };

    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cloudSession)
    });

    if (!response.ok) {
      throw new Error(`Failed to insert session: ${response.statusText}`);
    }
  }

  async getAllSessions(): Promise<CloudSession[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/sessions`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }

    return response.json();
  }

  async updateSession(id: string, updates: Partial<CloudSession>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/sessions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update session: ${response.statusText}`);
    }
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/sessions/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.statusText}`);
    }
  }

  // Label methods
  async insertLabel(label: CloudLabel): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(label)
    });

    if (!response.ok) {
      throw new Error(`Failed to insert label: ${response.statusText}`);
    }
  }

  async getAllLabels(): Promise<CloudLabel[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/labels`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch labels: ${response.statusText}`);
    }

    return response.json();
  }

  async updateLabel(id: string, updates: Partial<CloudLabel>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/labels/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update label: ${response.statusText}`);
    }
  }

  async deleteLabel(id: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/labels/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete label: ${response.statusText}`);
    }
  }

  // Timer Profile methods
  async insertTimerProfile(profile: CloudTimerProfile): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/timer-profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile)
    });

    if (!response.ok) {
      throw new Error(`Failed to insert timer profile: ${response.statusText}`);
    }
  }

  async getAllTimerProfiles(): Promise<CloudTimerProfile[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/timer-profiles`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch timer profiles: ${response.statusText}`);
    }

    return response.json();
  }

  async updateTimerProfile(name: string, updates: Partial<CloudTimerProfile>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/timer-profiles/${name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update timer profile: ${response.statusText}`);
    }
  }

  async deleteTimerProfile(name: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/timer-profiles/${name}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete timer profile: ${response.statusText}`);
    }
  }

  // App Settings methods
  async getSetting(key: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/settings/${key}`);
    
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get setting: ${response.statusText}`);
    }

    const result = await response.json();
    return result.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/settings/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, value })
    });

    if (!response.ok) {
      throw new Error(`Failed to set setting: ${response.statusText}`);
    }
  }

  // Export data in the specified format
  async exportData(): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/export`);
    
    if (!response.ok) {
      throw new Error(`Failed to export data: ${response.statusText}`);
    }

    const sessions = await response.json();
    return JSON.stringify(sessions, null, 2);
  }

  // Sync methods for hybrid local/cloud storage
  async syncFromLocal(localData: {
    sessions: any[];
    labels: any[];
    timerProfiles: any[];
  }): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(localData)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync data: ${response.statusText}`);
    }
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    focusSessions: number;
    breakSessions: number;
    totalFocusTime: number;
    totalBreakTime: number;
    averageSessionDuration: number;
  }> {
    if (!this.isConnected) {
      throw new Error('Not connected to cloud database');
    }

    const response = await fetch(`${this.baseUrl}/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }

    return response.json();
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }
}

export default CloudDBManager;