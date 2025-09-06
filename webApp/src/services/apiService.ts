// API service for communicating with Express backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api';

export interface APISession {
  id: string;
  archived: boolean;
  duration: number;
  end: string;
  interruptions: number;
  is_break: boolean;
  label: string;
  notes: string;
}

export interface APILabel {
  id: string;
  title: string;
  color: number;
  archived: boolean;
  orderIndex: number;
}

export interface APITimerProfile {
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

class APIService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await fetch(url, {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request('/health');
  }

  // Session methods
  async getAllSessions(): Promise<APISession[]> {
    return this.request('/sessions');
  }

  async createSession(session: Partial<APISession>): Promise<APISession> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  async updateSession(id: string, updates: Partial<APISession>): Promise<APISession> {
    return this.request(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSession(id: string): Promise<{ message: string }> {
    return this.request(`/sessions/${id}`, {
      method: 'DELETE',
    });
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    focusSessions: number;
    breakSessions: number;
    totalFocusTime: number;
    totalBreakTime: number;
    averageSessionDuration: number;
  }> {
    return this.request('/sessions/stats');
  }

  // Label methods
  async getAllLabels(): Promise<APILabel[]> {
    console.log('🏷️ APIService: Fetching labels from:', `${this.baseURL}/labels`);
    const labels = await this.request<APILabel[]>('/labels');
    console.log('🏷️ APIService: Received labels:', labels);
    return labels;
  }

  async createLabel(label: Partial<APILabel>): Promise<APILabel> {
    return this.request('/labels', {
      method: 'POST',
      body: JSON.stringify(label),
    });
  }

  async updateLabel(id: string, updates: Partial<APILabel>): Promise<APILabel> {
    return this.request(`/labels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteLabel(id: string): Promise<{ message: string }> {
    return this.request(`/labels/${id}`, {
      method: 'DELETE',
    });
  }

  // Timer Profile methods
  async getAllTimerProfiles(): Promise<APITimerProfile[]> {
    return this.request('/timer-profiles');
  }

  async createTimerProfile(profile: Partial<APITimerProfile>): Promise<APITimerProfile> {
    return this.request('/timer-profiles', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  }

  async updateTimerProfile(name: string, updates: Partial<APITimerProfile>): Promise<APITimerProfile> {
    return this.request(`/timer-profiles/${name}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTimerProfile(name: string): Promise<{ message: string }> {
    return this.request(`/timer-profiles/${name}`, {
      method: 'DELETE',
    });
  }

  // Settings methods
  async getSetting(key: string): Promise<{ key: string; value: any }> {
    return this.request(`/settings/${key}`);
  }

  async setSetting(key: string, value: any): Promise<{ key: string; value: any }> {
    return this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  async getAllSettings(): Promise<Record<string, any>> {
    return this.request('/settings');
  }

  // Export methods
  async exportData(format: 'json' | 'csv' = 'json'): Promise<APISession[]> {
    return this.request(`/export?format=${format}`);
  }

  async exportStats(): Promise<any> {
    return this.request('/export/stats');
  }

  // Sync methods
  async syncData(data: {
    sessions?: any[];
    labels?: any[];
    timerProfiles?: any[];
  }): Promise<any> {
    return this.request('/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getChanges(since: number, deviceId: string): Promise<any[]> {
    return this.request(`/sync/changes?since=${since}&deviceId=${deviceId}`);
  }

  // Check if API is available
  async isAvailable(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.warn('API not available:', error);
      return false;
    }
  }
}

export default new APIService();