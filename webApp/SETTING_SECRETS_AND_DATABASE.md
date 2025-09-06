# Setting Up Secrets and Database Configuration

This document explains how to configure MongoDB Cloud Database and manage secrets for the Goodtime Pomodoro Web Application.

## Overview

The application uses a comprehensive real-time sync system with multiple layers:
- **Local Storage**: IndexedDB for offline functionality and fast local access
- **Cloud Storage**: MongoDB Cloud Database via REST API for data synchronization and backup
- **Real-time Sync**: WebSocket connections for instant cross-device synchronization
- **Background Sync**: Service Worker for offline-first functionality and queue management
- **Conflict Resolution**: Automatic and manual conflict resolution for simultaneous edits

## MongoDB Cloud Database Setup

### Database Details
- **Username**: `dpkcmn_db_user`
- **Connection String**: `mongodb+srv://dpkcmn_db_user:[PASSWORD]@pomodoro-web.sidvw0l.mongodb.net/?retryWrites=true&w=majority&appName=pomodoro-web`
- **Database Name**: `pomodoro-web`
- **GitHub Repository**: `https://github.com/Vivid-Vortex/goodtime-minimalist-pomodoro-app.git`
- **Branch**: `browser-app-v1`

## Manual Environment Setup

The application uses local environment variables for MongoDB configuration.

Create a `.env` file in your project root with the following content:

```env
# MongoDB Cloud Database Configuration
MONGO_USERNAME=dpkcmn_db_user
MONGO_PASSWORD=
MONGO_CLUSTER=pomodoro-web.sidvw0l.mongodb.net
MONGO_DATABASE=pomodoro-web
VITE_MONGODB_URI=mongodb+srv://dpkcmn_db_user:@pomodoro-web.sidvw0l.mongodb.net/?retryWrites=true&w=majority&appName=pomodoro-web
VITE_MONGODB_DB_NAME=pomodoro-web

# API Configuration (for backend implementation)
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001/ws
VITE_ENABLE_CLOUD_SYNC=true
VITE_ENABLE_REALTIME_SYNC=true

# Note: Please enter your MongoDB password in MONGO_PASSWORD field above
# This app will work in local-only mode without backend API
# Data will be stored in IndexedDB and synced when backend is available
```

## NPM Commands

### Environment Management
```bash
# Check environment configuration
npm run check-env

# Development with automatic env check
npm run dev

# Build with automatic env check
npm run build
```

### Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:prod

# Lint code
npm run lint

# Type checking
npm run typecheck

# Serve built application
npm run serve
```

## How Environment Checking Works

The application performs automatic environment checking:

1. **Pre-development/build**: Runs `scripts/check-env.js` before starting dev server or building
2. **Environment detection**: Checks for `.env` file and required variables
3. **Auto-instructions**: Provides step-by-step instructions for GitHub Actions workflow
4. **Fallback creation**: Creates template `.env` file if none exists
5. **Graceful degradation**: App works in local-only mode without cloud configuration

## Data Export Format

The application exports session data in the following JSON format (as specified in CLAUDE.md):

```json
[
  {
    "archived": false,
    "duration": 72,
    "end": "2025-06-06T20:55:14.977",
    "interruptions": 0,
    "is_break": false,
    "label": "W1 main",
    "notes": ""
  },
  {
    "archived": false,
    "duration": 5,
    "end": "2025-06-06T15:23:04.292",
    "interruptions": 0,
    "is_break": true,
    "label": "W1 main",
    "notes": ""
  }
]
```

## Architecture Notes

### Browser Compatibility
- The MongoDB Node.js driver is not browser-compatible
- Instead, we use a REST API approach via `CloudDBManager`
- Local IndexedDB provides offline functionality
- Cloud sync happens through API calls to a backend service

### Database Collections
When implementing the backend API, use these MongoDB collections:
- `sessions` - Pomodoro session data
- `labels` - Session labels/categories
- `timerProfiles` - Timer configuration profiles
- `settings` - Application settings

### Security Considerations
- Secrets are managed through GitHub Actions
- Environment variables are prefixed with `VITE_` for Vite access
- Connection strings are never committed to the repository
- Local `.env` files should be in `.gitignore`

## Troubleshooting

### Environment Issues
```bash
# If environment check fails
npm run check-env

# View current environment status
ls -la .env

# Recreate environment from template
rm .env && npm run check-env
```

### MongoDB Connection Issues
- Verify `MONGO_PASSWORD` is correctly set in your `.env` file
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure the connection string format is correct
- Test the backend API endpoint if using cloud sync

### Build Issues
```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

## Development vs Production

### Development Mode
- Uses local IndexedDB primarily
- Attempts cloud sync if API is available
- Provides detailed logging and error messages

### Production Mode
- Builds with optimizations
- Cloud sync depends on backend API availability
- Gracefully falls back to local-only mode

## Next Steps

To enable full cloud functionality:
1. Implement a backend API server with the endpoints defined in `CloudDBManager`
2. Deploy the backend API to your preferred hosting service
3. Update `VITE_API_BASE_URL` to point to your deployed API
4. Ensure the backend API connects to your MongoDB Cloud database

The current implementation provides a comprehensive real-time sync system with:

## Real-Time Sync Features

### ✅ Implemented Features

1. **WebSocket Real-time Sync**
   - Instant cross-device synchronization
   - Real-time updates when other users/devices make changes
   - Automatic reconnection with exponential backoff
   - Device identification and conflict prevention

2. **Background Sync with Service Worker**
   - Offline-first functionality
   - Automatic queue management for offline operations
   - Sync when network becomes available
   - Retry mechanism with exponential backoff

3. **Conflict Resolution System**
   - Automatic last-write-wins resolution
   - Manual conflict resolution UI
   - Conflict detection and notification
   - Field-level conflict tracking

4. **Sync Status Indicators**
   - Real-time connection status display
   - Sync queue length indicator
   - Conflict count badge
   - Last sync timestamp
   - Network status monitoring

5. **Hybrid Storage Architecture**
   - Local IndexedDB for immediate access
   - Cloud sync for backup and multi-device
   - Graceful degradation when offline
   - Automatic sync on reconnection

### 🔄 Real-Time Data Flow

```
User Action → Local IndexedDB (immediate) → Cloud API (async) → WebSocket Broadcast → Other Devices Update
     ↓
Background Sync Queue (if offline) → Process when online → Conflict Resolution (if needed)
```

### 📊 Sync Status Display

The sync status indicator shows:
- **Connected** (green): Real-time sync active
- **Connecting** (blue): Establishing connection
- **Syncing** (blue, spinning): Data synchronization in progress
- **Offline** (red): No network connection
- **Error** (red): Connection or sync error
- **Pending Items**: Number of changes waiting to sync
- **Conflicts**: Number of unresolved conflicts

### 🔧 Background Implementation

The sync system automatically:
- Queues operations when offline
- Detects network changes
- Processes sync queue when online
- Handles WebSocket reconnections
- Resolves data conflicts
- Updates UI in real-time

This provides a seamless experience whether online or offline, with automatic synchronization and conflict management.