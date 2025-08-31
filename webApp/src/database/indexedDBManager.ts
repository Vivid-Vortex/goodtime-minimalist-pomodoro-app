// IndexedDB-based database manager for browser compatibility
class IndexedDBManager {
  private dbName = 'goodtime-db';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('endTime', 'endTime', { unique: false });
          sessionsStore.createIndex('timerType', 'timerType', { unique: false });
          sessionsStore.createIndex('labelId', 'labelId', { unique: false });
        }

        // Create labels store
        if (!db.objectStoreNames.contains('labels')) {
          const labelsStore = db.createObjectStore('labels', { keyPath: 'id' });
          labelsStore.createIndex('orderIndex', 'orderIndex', { unique: false });
        }

        // Create timer profiles store
        if (!db.objectStoreNames.contains('timerProfiles')) {
          const profilesStore = db.createObjectStore('timerProfiles', { keyPath: 'name' });
        }

        // Create app settings store
        if (!db.objectStoreNames.contains('appSettings')) {
          db.createObjectStore('appSettings', { keyPath: 'key' });
        }
      };
    });
  }

  private async getTransaction(storeNames: string | string[], mode: IDBTransactionMode = 'readonly'): Promise<IDBTransaction> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!.transaction(storeNames, mode);
  }

  // Session methods
  async insertSession(session: {
    id: string;
    labelId?: string;
    timerType: string;
    duration: number;
    endTime: number;
    archived?: boolean;
    notes?: string;
  }): Promise<void> {
    const transaction = await this.getTransaction('sessions', 'readwrite');
    const store = transaction.objectStore('sessions');
    
    const sessionData = {
      id: session.id,
      labelId: session.labelId || null,
      timerType: session.timerType,
      duration: session.duration,
      endTime: session.endTime,
      archived: session.archived || false,
      notes: session.notes || null,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(sessionData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateSession(id: string, updates: any): Promise<void> {
    const transaction = await this.getTransaction('sessions', 'readwrite');
    const store = transaction.objectStore('sessions');

    return new Promise(async (resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (session) {
          Object.assign(session, updates);
          const updateRequest = store.put(session);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Session not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteSession(id: string): Promise<void> {
    const transaction = await this.getTransaction('sessions', 'readwrite');
    const store = transaction.objectStore('sessions');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSessions(): Promise<any[]> {
    const transaction = await this.getTransaction('sessions', 'readonly');
    const store = transaction.objectStore('sessions');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sessions = request.result.sort((a, b) => b.endTime - a.endTime);
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
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
    const sessions = await this.getAllSessions();
    const activeSessions = sessions.filter(s => !s.archived);
    
    const focusSessions = activeSessions.filter(s => s.timerType === 'FOCUS');
    const breakSessions = activeSessions.filter(s => s.timerType === 'BREAK' || s.timerType === 'LONG_BREAK');
    
    const totalFocusTime = focusSessions.reduce((acc, s) => acc + s.duration, 0);
    const totalBreakTime = breakSessions.reduce((acc, s) => acc + s.duration, 0);

    return {
      totalSessions: activeSessions.length,
      focusSessions: focusSessions.length,
      breakSessions: breakSessions.length,
      totalFocusTime,
      totalBreakTime,
      averageSessionDuration: activeSessions.length > 0 
        ? activeSessions.reduce((acc, s) => acc + s.duration, 0) / activeSessions.length 
        : 0
    };
  }

  // Label methods
  async insertLabel(label: {
    id: string;
    title: string;
    color: number;
    archived?: boolean;
    orderIndex: number;
  }): Promise<void> {
    const transaction = await this.getTransaction('labels', 'readwrite');
    const store = transaction.objectStore('labels');
    
    const labelData = {
      id: label.id,
      title: label.title,
      color: label.color,
      archived: label.archived || false,
      orderIndex: label.orderIndex,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(labelData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateLabel(id: string, updates: any): Promise<void> {
    const transaction = await this.getTransaction('labels', 'readwrite');
    const store = transaction.objectStore('labels');

    return new Promise(async (resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const label = getRequest.result;
        if (label) {
          Object.assign(label, updates);
          const updateRequest = store.put(label);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Label not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteLabel(id: string): Promise<void> {
    const transaction = await this.getTransaction('labels', 'readwrite');
    const store = transaction.objectStore('labels');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllLabels(): Promise<any[]> {
    const transaction = await this.getTransaction('labels', 'readonly');
    const store = transaction.objectStore('labels');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const labels = request.result.sort((a, b) => a.orderIndex - b.orderIndex);
        resolve(labels);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Timer profile methods
  async insertTimerProfile(profile: {
    name: string;
    isCountdown?: boolean;
    workDuration: number;
    isBreakEnabled?: boolean;
    breakDuration: number;
    isLongBreakEnabled?: boolean;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
    workBreakRatio: number;
  }): Promise<void> {
    const transaction = await this.getTransaction('timerProfiles', 'readwrite');
    const store = transaction.objectStore('timerProfiles');
    
    const profileData = {
      name: profile.name,
      isCountdown: profile.isCountdown !== false,
      workDuration: profile.workDuration,
      isBreakEnabled: profile.isBreakEnabled !== false,
      breakDuration: profile.breakDuration,
      isLongBreakEnabled: profile.isLongBreakEnabled || false,
      longBreakDuration: profile.longBreakDuration,
      sessionsBeforeLongBreak: profile.sessionsBeforeLongBreak,
      workBreakRatio: profile.workBreakRatio,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(profileData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateTimerProfile(name: string, updates: any): Promise<void> {
    const transaction = await this.getTransaction('timerProfiles', 'readwrite');
    const store = transaction.objectStore('timerProfiles');

    return new Promise(async (resolve, reject) => {
      const getRequest = store.get(name);
      getRequest.onsuccess = () => {
        const profile = getRequest.result;
        if (profile) {
          Object.assign(profile, updates);
          const updateRequest = store.put(profile);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Profile not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteTimerProfile(name: string): Promise<void> {
    const transaction = await this.getTransaction('timerProfiles', 'readwrite');
    const store = transaction.objectStore('timerProfiles');

    return new Promise((resolve, reject) => {
      const request = store.delete(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTimerProfiles(): Promise<any[]> {
    const transaction = await this.getTransaction('timerProfiles', 'readonly');
    const store = transaction.objectStore('timerProfiles');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const profiles = request.result.sort((a, b) => a.createdAt - b.createdAt);
        resolve(profiles);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // App settings methods
  async getSetting(key: string): Promise<string | null> {
    const transaction = await this.getTransaction('appSettings', 'readonly');
    const store = transaction.objectStore('appSettings');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting(key: string, value: string): Promise<void> {
    const transaction = await this.getTransaction('appSettings', 'readwrite');
    const store = transaction.objectStore('appSettings');

    const settingData = {
      key,
      value,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(settingData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Export/Import methods
  async exportData(): Promise<string> {
    const sessions = await this.getAllSessions();
    const labels = await this.getAllLabels();
    const profiles = await this.getAllTimerProfiles();
    const stats = await this.getSessionStats();

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      statistics: stats,
      sessions: sessions,
      labels: labels,
      timerProfiles: profiles
    };

    return JSON.stringify(exportData, null, 2);
  }

  async clearAllData(): Promise<void> {
    const transaction = await this.getTransaction(['sessions', 'labels', 'timerProfiles', 'appSettings'], 'readwrite');
    
    const promises = [
      this.clearStore(transaction.objectStore('sessions')),
      this.clearStoreExcept(transaction.objectStore('labels'), 'default'),
      this.clearStoreExcept(transaction.objectStore('timerProfiles'), '25/5'),
      this.clearStore(transaction.objectStore('appSettings'))
    ];

    await Promise.all(promises);
  }

  private clearStore(store: IDBObjectStore): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private clearStoreExcept(store: IDBObjectStore, exceptKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const deletePromises = request.result
          .filter(item => item.id !== exceptKey && item.name !== exceptKey)
          .map(item => {
            return new Promise<void>((deleteResolve, deleteReject) => {
              const deleteRequest = store.delete(item.id || item.name);
              deleteRequest.onsuccess = () => deleteResolve();
              deleteRequest.onerror = () => deleteReject(deleteRequest.error);
            });
          });
        
        Promise.all(deletePromises).then(() => resolve()).catch(reject);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export default IndexedDBManager;