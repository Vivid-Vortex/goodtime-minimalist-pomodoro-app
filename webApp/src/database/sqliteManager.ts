import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

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

class SqliteManager {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.SQL = await initSqlJs({
        locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}`
      });

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem('goodtime-sqlite-db');
      if (savedDb) {
        const binaryData = new Uint8Array(JSON.parse(savedDb));
        this.db = new this.SQL.Database(binaryData);
      } else {
        this.db = new this.SQL.Database();
      }

      this.createTables();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SQLite:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Sessions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        timer_type TEXT NOT NULL,
        duration INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        archived INTEGER DEFAULT 0,
        notes TEXT,
        interruptions INTEGER DEFAULT 0
      )
    `);

    // Labels table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        color INTEGER NOT NULL,
        archived INTEGER DEFAULT 0,
        order_index INTEGER NOT NULL
      )
    `);

    // Timer profiles table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS timer_profiles (
        name TEXT PRIMARY KEY,
        is_countdown INTEGER DEFAULT 1,
        work_duration INTEGER NOT NULL,
        is_break_enabled INTEGER DEFAULT 1,
        break_duration INTEGER NOT NULL,
        is_long_break_enabled INTEGER DEFAULT 0,
        long_break_duration INTEGER NOT NULL,
        sessions_before_long_break INTEGER NOT NULL,
        work_break_ratio INTEGER NOT NULL
      )
    `);

    // Settings table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  private saveToLocalStorage(): void {
    if (!this.db) return;
    
    const data = this.db.export();
    localStorage.setItem('goodtime-sqlite-db', JSON.stringify(Array.from(data)));
  }

  // Session methods
  async insertSession(session: SessionData): Promise<void> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare(`
      INSERT OR REPLACE INTO sessions 
      (id, label, timer_type, duration, end_time, archived, notes, interruptions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      session.id,
      session.label,
      session.timerType,
      session.duration,
      session.endTime,
      session.archived ? 1 : 0,
      session.notes || '',
      session.interruptions || 0
    ]);
    
    stmt.free();
    this.saveToLocalStorage();
  }

  async updateSession(id: string, updates: Partial<SessionData>): Promise<void> {
    if (!this.db) await this.initialize();

    const fields = [];
    const values = [];

    if (updates.label !== undefined) {
      fields.push('label = ?');
      values.push(updates.label);
    }
    if (updates.timerType !== undefined) {
      fields.push('timer_type = ?');
      values.push(updates.timerType);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }
    if (updates.endTime !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.endTime);
    }
    if (updates.archived !== undefined) {
      fields.push('archived = ?');
      values.push(updates.archived ? 1 : 0);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.interruptions !== undefined) {
      fields.push('interruptions = ?');
      values.push(updates.interruptions);
    }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = this.db!.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(values);
    stmt.free();
    this.saveToLocalStorage();
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.saveToLocalStorage();
  }

  async getAllSessions(): Promise<SessionData[]> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare('SELECT * FROM sessions ORDER BY end_time DESC');
    const results = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as string,
        label: row.label as string,
        timerType: row.timer_type as string,
        duration: row.duration as number,
        endTime: row.end_time as number,
        archived: Boolean(row.archived),
        notes: row.notes as string || '',
        interruptions: row.interruptions as number || 0
      });
    }
    
    stmt.free();
    return results;
  }

  async getSessionStats(): Promise<{
    totalSessions: number;
    focusSessions: number;
    breakSessions: number;
    totalFocusTime: number;
    totalBreakTime: number;
    averageSessionDuration: number;
  }> {
    if (!this.db) await this.initialize();

    const stats = {
      totalSessions: 0,
      focusSessions: 0,
      breakSessions: 0,
      totalFocusTime: 0,
      totalBreakTime: 0,
      averageSessionDuration: 0
    };

    const stmt = this.db!.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN timer_type = 'FOCUS' THEN 1 ELSE 0 END) as focus_count,
        SUM(CASE WHEN timer_type = 'FOCUS' THEN duration ELSE 0 END) as focus_time,
        SUM(CASE WHEN timer_type != 'FOCUS' THEN duration ELSE 0 END) as break_time,
        AVG(duration) as avg_duration
      FROM sessions WHERE archived = 0
    `);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stats.totalSessions = row.total as number;
      stats.focusSessions = row.focus_count as number;
      stats.breakSessions = stats.totalSessions - stats.focusSessions;
      stats.totalFocusTime = row.focus_time as number;
      stats.totalBreakTime = row.break_time as number;
      stats.averageSessionDuration = row.avg_duration as number || 0;
    }

    stmt.free();
    return stats;
  }

  // Label methods
  async insertLabel(label: LabelData): Promise<void> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare(`
      INSERT OR REPLACE INTO labels (id, title, color, archived, order_index)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      label.id,
      label.title,
      label.color,
      label.archived ? 1 : 0,
      label.orderIndex
    ]);
    
    stmt.free();
    this.saveToLocalStorage();
  }

  async updateLabel(id: string, updates: Partial<LabelData>): Promise<void> {
    if (!this.db) await this.initialize();

    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.archived !== undefined) {
      fields.push('archived = ?');
      values.push(updates.archived ? 1 : 0);
    }
    if (updates.orderIndex !== undefined) {
      fields.push('order_index = ?');
      values.push(updates.orderIndex);
    }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = this.db!.prepare(`UPDATE labels SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(values);
    stmt.free();
    this.saveToLocalStorage();
  }

  async deleteLabel(id: string): Promise<void> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare('DELETE FROM labels WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    this.saveToLocalStorage();
  }

  async getAllLabels(): Promise<LabelData[]> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare('SELECT * FROM labels ORDER BY order_index');
    const results = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as string,
        title: row.title as string,
        color: row.color as number,
        archived: Boolean(row.archived),
        orderIndex: row.order_index as number
      });
    }
    
    stmt.free();
    return results;
  }

  // Timer profile methods
  async insertTimerProfile(profile: TimerProfileData): Promise<void> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare(`
      INSERT OR REPLACE INTO timer_profiles 
      (name, is_countdown, work_duration, is_break_enabled, break_duration, 
       is_long_break_enabled, long_break_duration, sessions_before_long_break, work_break_ratio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      profile.name,
      profile.isCountdown !== false ? 1 : 0,
      profile.workDuration,
      profile.isBreakEnabled !== false ? 1 : 0,
      profile.breakDuration,
      profile.isLongBreakEnabled === true ? 1 : 0,
      profile.longBreakDuration,
      profile.sessionsBeforeLongBreak,
      profile.workBreakRatio
    ]);
    
    stmt.free();
    this.saveToLocalStorage();
  }

  async updateTimerProfile(name: string, updates: Partial<TimerProfileData>): Promise<void> {
    if (!this.db) await this.initialize();

    const fields = [];
    const values = [];

    if (updates.isCountdown !== undefined) {
      fields.push('is_countdown = ?');
      values.push(updates.isCountdown ? 1 : 0);
    }
    if (updates.workDuration !== undefined) {
      fields.push('work_duration = ?');
      values.push(updates.workDuration);
    }
    if (updates.isBreakEnabled !== undefined) {
      fields.push('is_break_enabled = ?');
      values.push(updates.isBreakEnabled ? 1 : 0);
    }
    if (updates.breakDuration !== undefined) {
      fields.push('break_duration = ?');
      values.push(updates.breakDuration);
    }
    if (updates.isLongBreakEnabled !== undefined) {
      fields.push('is_long_break_enabled = ?');
      values.push(updates.isLongBreakEnabled ? 1 : 0);
    }
    if (updates.longBreakDuration !== undefined) {
      fields.push('long_break_duration = ?');
      values.push(updates.longBreakDuration);
    }
    if (updates.sessionsBeforeLongBreak !== undefined) {
      fields.push('sessions_before_long_break = ?');
      values.push(updates.sessionsBeforeLongBreak);
    }
    if (updates.workBreakRatio !== undefined) {
      fields.push('work_break_ratio = ?');
      values.push(updates.workBreakRatio);
    }

    if (fields.length === 0) return;

    values.push(name);
    const stmt = this.db!.prepare(`UPDATE timer_profiles SET ${fields.join(', ')} WHERE name = ?`);
    stmt.run(values);
    stmt.free();
    this.saveToLocalStorage();
  }

  async deleteTimerProfile(name: string): Promise<void> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare('DELETE FROM timer_profiles WHERE name = ?');
    stmt.run([name]);
    stmt.free();
    this.saveToLocalStorage();
  }

  async getAllTimerProfiles(): Promise<TimerProfileData[]> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare('SELECT * FROM timer_profiles ORDER BY name');
    const results = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        name: row.name as string,
        isCountdown: Boolean(row.is_countdown),
        workDuration: row.work_duration as number,
        isBreakEnabled: Boolean(row.is_break_enabled),
        breakDuration: row.break_duration as number,
        isLongBreakEnabled: Boolean(row.is_long_break_enabled),
        longBreakDuration: row.long_break_duration as number,
        sessionsBeforeLongBreak: row.sessions_before_long_break as number,
        workBreakRatio: row.work_break_ratio as number
      });
    }
    
    stmt.free();
    return results;
  }

  // Settings methods
  async getSetting(key: string): Promise<string | null> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare('SELECT value FROM settings WHERE key = ?');
    stmt.bind([key]);
    
    if (stmt.step()) {
      const value = stmt.getAsObject().value as string;
      stmt.free();
      return value;
    }
    
    stmt.free();
    return null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) await this.initialize();
    
    const stmt = this.db!.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run([key, value]);
    stmt.free();
    this.saveToLocalStorage();
  }

  // Export data in the desired JSON format
  async exportData(): Promise<string> {
    if (!this.db) await this.initialize();
    
    const sessions = await this.getAllSessions();
    
    // Convert to the desired export format
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

  async clearAllData(): Promise<void> {
    if (!this.db) await this.initialize();
    
    this.db!.run('DELETE FROM sessions');
    this.db!.run('DELETE FROM labels');
    this.db!.run('DELETE FROM timer_profiles');
    this.db!.run('DELETE FROM settings');
    
    this.saveToLocalStorage();
  }
}

export default SqliteManager;