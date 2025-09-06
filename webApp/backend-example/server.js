// Simple Express.js backend for MongoDB integration
// Run this with: node server.js

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dpkcmn_db_user:X2RWEYOzQc5kreyk@pomodoro-web.sidvw0l.mongodb.net/?retryWrites=true&w=majority&appName=pomodoro-web';
const DB_NAME = process.env.DB_NAME || 'pomodoro-web';

let db;

// Connect to MongoDB
MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(DB_NAME);
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });

// WebSocket connections for real-time sync
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('WebSocket client connected');

  ws.on('message', (data) => {
    // Broadcast to all other clients
    const message = JSON.parse(data.toString());
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket client disconnected');
  });
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongodb: !!db });
});

// Sessions API
app.post('/api/sessions', async (req, res) => {
  try {
    const result = await db.collection('sessions').insertOne(req.body);
    res.json({ id: result.insertedId });
    console.log('Session created:', req.body.id);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await db.collection('sessions').find({}).toArray();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sessions/:id', async (req, res) => {
  try {
    await db.collection('sessions').updateOne(
      { id: req.params.id },
      { $set: req.body }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await db.collection('sessions').deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Labels API
app.post('/api/labels', async (req, res) => {
  try {
    const result = await db.collection('labels').insertOne(req.body);
    res.json({ id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/labels', async (req, res) => {
  try {
    const labels = await db.collection('labels').find({}).toArray();
    res.json(labels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/labels/:id', async (req, res) => {
  try {
    await db.collection('labels').updateOne(
      { id: req.params.id },
      { $set: req.body }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/labels/:id', async (req, res) => {
  try {
    await db.collection('labels').deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Timer Profiles API
app.post('/api/timer-profiles', async (req, res) => {
  try {
    const result = await db.collection('timerProfiles').insertOne(req.body);
    res.json({ id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/timer-profiles', async (req, res) => {
  try {
    const profiles = await db.collection('timerProfiles').find({}).toArray();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/timer-profiles/:name', async (req, res) => {
  try {
    await db.collection('timerProfiles').updateOne(
      { name: req.params.name },
      { $set: req.body }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/timer-profiles/:name', async (req, res) => {
  try {
    await db.collection('timerProfiles').deleteOne({ name: req.params.name });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings API
app.get('/api/settings/:key', async (req, res) => {
  try {
    const setting = await db.collection('settings').findOne({ key: req.params.key });
    res.json(setting || { value: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings/:key', async (req, res) => {
  try {
    await db.collection('settings').updateOne(
      { key: req.params.key },
      { $set: req.body },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export data in desired format
app.get('/api/export', async (req, res) => {
  try {
    const sessions = await db.collection('sessions').find({}).toArray();
    const labels = await db.collection('labels').find({}).toArray();
    
    // Create a map of label IDs to label titles for quick lookup
    const labelMap = {};
    labels.forEach(label => {
      labelMap[label.id] = label.title;
    });
    
    // Convert to desired format
    const exportData = sessions.map(session => ({
      archived: session.archived,
      duration: Math.round(session.duration / 60), // Convert seconds to minutes
      end: session.end,
      interruptions: session.interruptions,
      is_break: session.is_break,
      label: labelMap[session.label] || session.label, // Use label title, fallback to ID if not found
      notes: session.notes
    }));
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync endpoint - handles both local-to-remote and remote-to-local sync
app.post('/api/sync', async (req, res) => {
  try {
    const { sessions, labels, timerProfiles } = req.body;
    let syncResults = { sessions: 0, labels: 0, profiles: 0 };
    
    // Upsert sessions (insert if not exists, update if exists)
    if (sessions && sessions.length > 0) {
      for (const session of sessions) {
        await db.collection('sessions').updateOne(
          { id: session.id },
          { $set: session },
          { upsert: true }
        );
        syncResults.sessions++;
      }
    }
    
    // Upsert labels
    if (labels && labels.length > 0) {
      for (const label of labels) {
        await db.collection('labels').updateOne(
          { id: label.id },
          { $set: label },
          { upsert: true }
        );
        syncResults.labels++;
      }
    }
    
    // Upsert timer profiles
    if (timerProfiles && timerProfiles.length > 0) {
      for (const profile of timerProfiles) {
        await db.collection('timerProfiles').updateOne(
          { name: profile.name },
          { $set: profile },
          { upsert: true }
        );
        syncResults.profiles++;
      }
    }
    
    res.json({ success: true, synced: syncResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get changes since timestamp
app.get('/api/sync/changes', async (req, res) => {
  try {
    const since = parseInt(req.query.since) || 0;
    const deviceId = req.query.deviceId;
    
    // For simplicity, return all data for now
    // In production, you'd filter by timestamp
    const sessions = await db.collection('sessions').find({}).toArray();
    const labels = await db.collection('labels').find({}).toArray();
    const profiles = await db.collection('timerProfiles').find({}).toArray();
    
    res.json([
      ...sessions.map(s => ({ type: 'session', data: s, timestamp: Date.now() })),
      ...labels.map(l => ({ type: 'label', data: l, timestamp: Date.now() })),
      ...profiles.map(p => ({ type: 'profile', data: p, timestamp: Date.now() }))
    ]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics
app.get('/api/stats', async (req, res) => {
  try {
    const sessions = await db.collection('sessions').find({}).toArray();
    
    const focusSessions = sessions.filter(s => !s.is_break);
    const breakSessions = sessions.filter(s => s.is_break);
    const totalFocusTime = focusSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalBreakTime = breakSessions.reduce((sum, s) => sum + s.duration, 0);
    const averageSessionDuration = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length 
      : 0;

    res.json({
      totalSessions: sessions.length,
      focusSessions: focusSessions.length,
      breakSessions: breakSessions.length,
      totalFocusTime,
      totalBreakTime,
      averageSessionDuration
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all data endpoint (for cleanup)
app.delete('/api/clear-all', async (req, res) => {
  try {
    await db.collection('sessions').deleteMany({});
    await db.collection('labels').deleteMany({});
    await db.collection('timerProfiles').deleteMany({});
    await db.collection('settings').deleteMany({});
    res.json({ success: true, message: 'All data cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});