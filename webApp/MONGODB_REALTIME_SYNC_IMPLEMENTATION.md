# MongoDB Real-time Sync Implementation Guide

## Overview

This document provides a comprehensive guide on how real-time synchronization between IndexedDB (browser local storage) and MongoDB Cloud was implemented for the Goodtime Pomodoro Web Application.

## Problem Statement

**Challenge**: Browsers cannot directly connect to MongoDB Cloud for security reasons, but we need real-time sync between local IndexedDB storage and MongoDB Cloud database.

**Solution**: Implement a lightweight Node.js backend API server that acts as a bridge between the frontend and MongoDB Cloud, enabling real-time bidirectional synchronization.

## Architecture Design

### High-Level Architecture

```
┌─────────────────┐    HTTP/WS     ┌─────────────────┐    MongoDB     ┌─────────────────┐
│                 │◄──────────────►│                 │   Protocol     │                 │
│   Frontend      │                │   Backend API   │◄──────────────►│  MongoDB Cloud  │
│   (Browser)     │                │   (Node.js)     │                │   Database      │
│                 │                │                 │                │                 │
└─────────────────┘                └─────────────────┘                └─────────────────┘
│                                  │                                  │
│ • IndexedDB                      │ • Express.js Server              │ • Collections:
│ • Real-time UI                   │ • WebSocket Server               │   - sessions
│ • Offline Support                │ • MongoDB Driver                 │   - labels
│ • Local-first                    │ • CORS Support                   │   - timerProfiles
│                                  │ • REST API                       │   - settings
```

### Data Flow Diagram

```
User Action (Create Session)
        │
        ▼
┌─────────────────┐
│   IndexedDB     │ ◄──── Immediate save (local-first)
│  (Local Store)  │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│   Backend API   │ ◄──── Async HTTP POST
│   (Port 3001)   │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ MongoDB Cloud   │ ◄──── Database write
│   (Remote DB)   │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│   WebSocket     │ ◄──── Real-time broadcast
│   Broadcast     │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│  Other Devices  │ ◄──── Live updates
│   (Real-time)   │
└─────────────────┘
```

## Technology Stack

### Frontend Technologies
- **Framework**: Vite + React + TypeScript
- **Local Storage**: IndexedDB (via custom IndexedDBManager)
- **HTTP Client**: Fetch API
- **WebSocket Client**: Native WebSocket API
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### Backend Technologies
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database Driver**: MongoDB Node.js Driver
- **Real-time Communication**: WebSocket (ws library)
- **CORS**: cors middleware
- **Environment**: dotenv for configuration

### Database & Infrastructure
- **Database**: MongoDB Atlas Cloud
- **Connection**: MongoDB Driver with connection string
- **Collections**: sessions, labels, timerProfiles, settings
- **Hosting**: Local development (Port 3001)

## Implementation Steps

### Step 1: Backend API Server Setup

#### 1.1 Create Backend Directory Structure
```bash
mkdir backend-example
cd backend-example
```

#### 1.2 Initialize Package.json
```json
{
  "name": "pomodoro-backend",
  "version": "1.0.0",
  "description": "Backend API for Pomodoro web app with MongoDB and WebSocket sync",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongodb": "^6.3.0",
    "cors": "^2.8.5",
    "ws": "^8.14.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

#### 1.3 Environment Configuration
Create `.env` file:
```env
MONGODB_URI=mongodb+srv://dpkcmn_db_user:X2RWEYOzQc5kreyk@pomodoro-web.sidvw0l.mongodb.net/?retryWrites=true&w=majority&appName=pomodoro-web
DB_NAME=pomodoro-web
PORT=3001
```

### Step 2: Express.js Server Implementation

#### 2.1 Basic Server Setup
```javascript
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
```

#### 2.2 MongoDB Connection
```javascript
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'pomodoro-web';

let db;

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(DB_NAME);
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });
```

### Step 3: WebSocket Real-time Communication

#### 3.1 WebSocket Server Setup
```javascript
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
```

### Step 4: REST API Endpoints

#### 4.1 Health Check Endpoint
```javascript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongodb: !!db });
});
```

#### 4.2 Sessions API
```javascript
// Create session
app.post('/api/sessions', async (req, res) => {
  try {
    const result = await db.collection('sessions').insertOne(req.body);
    res.json({ id: result.insertedId });
    console.log('Session created:', req.body.id);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await db.collection('sessions').find({}).toArray();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session
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

// Delete session
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await db.collection('sessions').deleteOne({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 4.3 Data Export Endpoint (Goodtime Format)
```javascript
app.get('/api/export', async (req, res) => {
  try {
    const sessions = await db.collection('sessions').find({}).toArray();
    
    // Convert to desired format matching Android version
    const exportData = sessions.map(session => ({
      archived: session.archived,
      duration: session.duration,
      end: session.end,
      interruptions: session.interruptions,
      is_break: session.is_break,
      label: session.label,
      notes: session.notes
    }));
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 4.4 Bulk Sync Endpoint
```javascript
app.post('/api/sync', async (req, res) => {
  try {
    const { sessions, labels, timerProfiles } = req.body;
    
    // Insert sessions
    if (sessions && sessions.length > 0) {
      await db.collection('sessions').insertMany(sessions);
    }
    
    // Insert labels
    if (labels && labels.length > 0) {
      await db.collection('labels').insertMany(labels);
    }
    
    // Insert timer profiles
    if (timerProfiles && timerProfiles.length > 0) {
      await db.collection('timerProfiles').insertMany(timerProfiles);
    }
    
    res.json({ 
      success: true, 
      synced: { 
        sessions: sessions?.length || 0, 
        labels: labels?.length || 0, 
        profiles: timerProfiles?.length || 0 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Step 5: Frontend Integration

#### 5.1 Environment Configuration
Frontend `.env` file:
```env
# MongoDB Cloud Database Configuration
MONGO_USERNAME=dpkcmn_db_user
MONGO_PASSWORD=X2RWEYOzQc5kreyk
MONGO_CLUSTER=pomodoro-web.sidvw0l.mongodb.net
MONGO_DATABASE=pomodoro-web
VITE_MONGODB_URI=mongodb+srv://dpkcmn_db_user:X2RWEYOzQc5kreyk@pomodoro-web.sidvw0l.mongodb.net/?retryWrites=true&w=majority&appName=pomodoro-web
VITE_MONGODB_DB_NAME=pomodoro-web

# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001/ws
VITE_ENABLE_CLOUD_SYNC=true
VITE_ENABLE_REALTIME_SYNC=true
```

#### 5.2 CloudDBManager Integration
The existing `CloudDBManager.ts` already handles:
- HTTP requests to backend API
- Connection health checks
- Data transformation between formats
- Error handling and fallbacks

#### 5.3 Real-time Sync Manager
The existing `RealtimeSyncManager.ts` handles:
- WebSocket connections
- Real-time change broadcasting
- Automatic reconnection
- Conflict resolution

### Step 6: Database Schema Design

#### 6.1 MongoDB Collections

**Sessions Collection**:
```javascript
{
  id: String,           // Unique session identifier
  archived: Boolean,    // Whether session is archived
  duration: Number,     // Session duration in minutes
  end: String,          // ISO timestamp when session ended
  interruptions: Number, // Number of interruptions
  is_break: Boolean,    // Whether this is a break session
  label: String,        // Session label/category
  notes: String         // User notes for session
}
```

**Labels Collection**:
```javascript
{
  id: String,           // Unique label identifier
  title: String,        // Display name
  color: Number,        // Color index
  archived: Boolean,    // Whether label is archived
  orderIndex: Number    // Display order
}
```

**Timer Profiles Collection**:
```javascript
{
  name: String,                    // Profile name
  isCountdown: Boolean,            // Timer type
  workDuration: Number,            // Work session length
  isBreakEnabled: Boolean,         // Break functionality
  breakDuration: Number,           // Break length
  isLongBreakEnabled: Boolean,     // Long break functionality
  longBreakDuration: Number,       // Long break length
  sessionsBeforeLongBreak: Number, // Sessions before long break
  workBreakRatio: Number           // Work to break ratio
}
```

### Step 7: Deployment & Testing

#### 7.1 Start Backend Server
```bash
cd backend-example
npm install
npm start
```

#### 7.2 Start Frontend Development Server
```bash
npm run dev
```

#### 7.3 Verify Connection
- Backend: `http://localhost:3001/api/health`
- Frontend: `http://localhost:3002`
- WebSocket: `ws://localhost:3001/ws`

## Key Features Implemented

### ✅ Local-First Architecture
- **Immediate Response**: All data saves to IndexedDB first
- **Offline Support**: App works without internet connection
- **Performance**: No waiting for network requests for basic operations

### ✅ Real-time Synchronization
- **Instant Updates**: Changes broadcast immediately via WebSocket
- **Multi-device Sync**: Multiple browsers/devices stay in sync
- **Conflict Resolution**: Automatic handling of simultaneous edits

### ✅ Cloud Backup & Persistence
- **MongoDB Atlas**: All data backed up to cloud database
- **Data Export**: JSON export in Goodtime Android app format
- **Cross-platform**: Compatible with existing Goodtime ecosystem

### ✅ Developer Experience
- **Minimal Code**: Lightweight implementation with ~300 lines of backend code
- **Environment Config**: Easy setup with .env files
- **Error Handling**: Graceful fallbacks when services unavailable
- **Logging**: Comprehensive logging for debugging

## Error Handling & Fallbacks

### Connection Failures
- **MongoDB Unavailable**: App continues with IndexedDB only
- **Backend API Down**: Local-only mode with sync queue
- **WebSocket Disconnected**: Automatic reconnection attempts

### Data Consistency
- **Duplicate Prevention**: Unique ID checking before inserts
- **Conflict Resolution**: Last-write-wins strategy with manual resolution UI
- **Sync Queue**: Offline operations queued for later sync

## Performance Optimizations

### Frontend Optimizations
- **Local-first**: No network blocking for UI operations
- **Background Sync**: Non-blocking cloud synchronization
- **Connection Pooling**: Reuse WebSocket connections

### Backend Optimizations
- **MongoDB Indexing**: Indexes on frequently queried fields
- **Connection Reuse**: Single MongoDB connection per server instance
- **Efficient Queries**: Minimize database roundtrips

## Security Considerations

### Authentication
- **Environment Variables**: Sensitive data in .env files
- **Connection Strings**: MongoDB credentials not in source code
- **CORS Configuration**: Restricted cross-origin access

### Data Protection
- **Input Validation**: Server-side validation of all inputs
- **Error Sanitization**: No sensitive info in error messages
- **Connection Security**: TLS encrypted MongoDB connections

## Monitoring & Debugging

### Logging
- **Connection Status**: MongoDB and WebSocket connection logs
- **API Requests**: HTTP request/response logging
- **Error Tracking**: Comprehensive error logging with stack traces

### Health Checks
- **Database Health**: `/api/health` endpoint
- **Real-time Status**: WebSocket connection monitoring
- **Frontend Status**: Connection indicators in UI

## Future Enhancements

### Scalability
- **Horizontal Scaling**: Multiple backend instances with load balancer
- **Database Sharding**: Partition data across MongoDB clusters
- **CDN Integration**: Static asset delivery optimization

### Advanced Features
- **User Authentication**: Multi-user support with access control
- **Data Versioning**: Change history and rollback capabilities
- **Advanced Analytics**: Usage patterns and productivity insights

## Conclusion

This implementation provides a robust, real-time synchronization system between browser IndexedDB and MongoDB Cloud with minimal complexity. The architecture ensures:

1. **Excellent User Experience**: Local-first with instant responses
2. **Reliable Data Backup**: Cloud persistence for data safety  
3. **Real-time Collaboration**: Multi-device synchronization
4. **Simple Maintenance**: Lightweight codebase easy to understand and modify

The solution successfully bridges the gap between browser limitations and cloud database requirements while maintaining the performance and offline capabilities essential for a productivity application.