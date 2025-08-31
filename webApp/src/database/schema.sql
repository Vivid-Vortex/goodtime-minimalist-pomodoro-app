-- Goodtime Pomodoro Database Schema
-- This file contains the SQLite database schema for the Goodtime web application

-- Sessions table - stores completed pomodoro sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    label_id TEXT,
    timer_type TEXT NOT NULL CHECK (timer_type IN ('FOCUS', 'BREAK', 'LONG_BREAK')),
    duration INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    archived INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    notes TEXT,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE SET NULL
);

-- Labels table - stores session labels/categories
CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    color INTEGER NOT NULL,
    archived INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(title)
);

-- Timer profiles table - stores different timer configurations
CREATE TABLE IF NOT EXISTS timer_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_countdown INTEGER DEFAULT 1,
    work_duration INTEGER NOT NULL,
    is_break_enabled INTEGER DEFAULT 1,
    break_duration INTEGER NOT NULL,
    is_long_break_enabled INTEGER DEFAULT 0,
    long_break_duration INTEGER NOT NULL,
    sessions_before_long_break INTEGER NOT NULL,
    work_break_ratio INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(name)
);

-- App settings table - stores application configuration
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON sessions(end_time);
CREATE INDEX IF NOT EXISTS idx_sessions_timer_type ON sessions(timer_type);
CREATE INDEX IF NOT EXISTS idx_sessions_label_id ON sessions(label_id);
CREATE INDEX IF NOT EXISTS idx_labels_archived ON labels(archived);
CREATE INDEX IF NOT EXISTS idx_labels_order_index ON labels(order_index);

-- Insert default data
INSERT OR IGNORE INTO timer_profiles (id, name, is_countdown, work_duration, is_break_enabled, break_duration, is_long_break_enabled, long_break_duration, sessions_before_long_break, work_break_ratio) 
VALUES ('default', '25/5', 1, 25, 1, 5, 0, 15, 4, 3);

INSERT OR IGNORE INTO labels (id, title, color, archived, order_index) 
VALUES ('default', 'Default', 0, 0, 0);