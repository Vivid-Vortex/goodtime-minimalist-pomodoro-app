# Goodtime Web App - Complete Pomodoro Productivity Suite

A comprehensive web-based Pomodoro timer that matches all features of the Android version. Built with React, TypeScript, and PWA technology for a native app-like experience in any browser.

## ✨ Complete Feature Set

### 🎯 Core Timer Functionality
- ⏰ **Flexible Timer Duration**: Set any duration from 1-999 minutes (e.g., 25, 45, 72, 90 minutes)
- 🔄 **Multiple Timer Modes**: 
  - **Countdown Mode**: Traditional Pomodoro with set durations
  - **Stopwatch Mode**: Open-ended timing sessions
- ⚡ **Advanced Timer Controls**: 
  - Pause, resume, stop, skip sessions
  - **+60 Seconds Feature**: Extend current session by 60 seconds
  - Smart break management with configurable intervals
- 🎵 **Rich Audio & Visual Feedback**:
  - Browser notification alerts with custom messages
  - Configurable audio notification sounds with volume control
  - Dynamic color-coded timer states and favicon updates

### 🏷️ Labels & Organization System
- 🌈 **Colored Labels/Tags**: 25 beautiful predefined colors for session categorization
- 📝 **Label Management**: Create, edit, archive, and restore labels
- 🎨 **Visual Organization**: Color-coded sessions with intuitive interface
- 📊 **Label-based Statistics**: Track productivity by category/project

### ⚙️ Timer Profiles System
- 📋 **Pre-built Profiles**: 
  - Classic (25/5), Extended (45/15), Deep Work (90/20)
  - Sprint (15/3), Marathon (120/30), Custom profiles
- 🔧 **Profile Management**: Create, edit, delete custom timer configurations
- 🚀 **Quick Profile Switching**: Instantly switch between different work patterns

### 📊 Advanced Statistics & Data Management
- 💾 **Persistent Data Storage**: All data permanently stored in browser's IndexedDB
- 📈 **Comprehensive Session Tracking**: Every session automatically recorded with full history
- 📊 **Detailed Analytics**:
  - Total focus/break sessions with label breakdown
  - Focus time accumulation with daily/weekly views
  - Average session durations and productivity trends
  - Real-time statistics that persist across sessions
- 🔧 **Manual Session Editing**: 
  - Add sessions manually with custom date/time
  - Edit existing session details (duration, label, type, timestamp)
  - Delete unwanted sessions with confirmation
- 📋 **Advanced Data Export/Import**: 
  - Complete JSON export with session history, statistics, and metadata
  - Backup and restore functionality for data portability
  - Compatible export format for external analysis
- 🔄 **Cross-Session Persistence**: 
  - Data survives browser restarts, updates, and device changes
  - Automatic data initialization and migration
  - Robust error handling with fallback to local storage

### 🎛️ Advanced Settings & Personalization
- 🎨 **Theme System**: Light, Dark, and Auto themes with system detection
- 🔔 **Notification Control**: 
  - Browser notifications with custom messages
  - Audio alerts with volume control (0-100%)
  - Vibration support on mobile devices
- ⌨️ **Keyboard Shortcuts**: 
  - Space (play/pause), S (stop), R (reset), + (add 60s)
  - Configurable shortcuts for power users
- 📅 **Daily Goals**: Set and track daily focus time targets
- 🎯 **Behavior Settings**:
  - Auto-start breaks and next sessions
  - Break budget system for flexible scheduling
  - Long break triggers after session streaks
- 🛡️ **Privacy & Data Controls**:
  - Configurable data retention periods
  - Settings backup and restore
  - Anonymous analytics toggle

### 📱 Progressive Web App (PWA)
- 🖥️ **Desktop Installation**: Install as native-like desktop app
- 📱 **Mobile Support**: Works on mobile devices with app-like experience
- 🔄 **Offline Support**: Functions without internet connection
- 💾 **Persistent Storage**: Settings and session data saved locally
- 🔔 **Background Notifications**: Timer alerts even when app is not active

### 🎨 User Experience & Interface
- 🎨 **Minimalist Mode**: Distraction-free interface option
- 🌈 **Visual Timer**: Circular progress indicator with color coding
- 📊 **Real-time Statistics**: Live productivity metrics display  
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile
- 🖼️ **Dynamic Elements**: 
  - Page title shows remaining time
  - Favicon changes based on timer type
  - Color-coded visual feedback
- 💾 **Reliable Data Persistence**: IndexedDB ensures data survives browser updates and restarts

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and **npm** (or **yarn**/**pnpm**)
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Installation & Setup

```bash
# 1. Clone the repository (if not already done)
git clone <your-repo-url>
cd goodtime-minimalist-pomodoro-app

# 2. Switch to the browser app branch
git checkout browser-app-v1

# 3. Navigate to the webApp directory
cd webApp

# 4. Install dependencies
npm install

# 5. Start development server
npm run dev
```

The app will be available at **`http://localhost:5173`**

## 📖 How-To Guide (Step-by-Step)

### 🏷️ How to Add Custom Tags/Labels (like "W1-Cmn")

1. **Open the app** in your browser
2. **Click the ⚙️ Settings button** (top-right corner)
3. **Click the "Labels" button** (blue button with tag icon)
4. **Click "Add New Label"** (+ icon at the top)
5. **Enter your tag name**: Type "W1-Cmn" (or any custom name)
6. **Choose a color**: Click on any of the 25 color options
7. **Click "Save"** - your new tag is now available!

**To use your new tag:**
- Select "W1-Cmn" from the dropdown above the timer before starting
- Your session will be tracked under this custom label

### ⏰ How to Change Default Timer Duration

**Method 1: Quick Timer Adjustment (Basic Settings)**
1. **Click ⚙️ Settings** (top-right)  
2. **Change "Focus Duration"**: 
   - Type any number from 1-999 minutes
   - Use +5/-5 buttons for quick adjustments
   - Example: Set to 72 for a 72-minute session
3. **Click "Save"** - this becomes your new default

**Method 2: Using Timer Profiles (Advanced)**
1. **Click ⚙️ Settings** → **"Profiles" button** (purple button)
2. **Create new profile**: Click "+ Add Profile" 
3. **Name your profile**: e.g., "Deep Work 72min"
4. **Set durations**:
   - Work Duration: 72 minutes
   - Break Duration: 15 minutes  
   - Long Break: 30 minutes
5. **Save profile** - now you can switch between different timer setups instantly

### 🔄 How to Switch Between Different Timer Setups

**From the main timer screen:**
- Look for the profile dropdown (shows current profile name)
- Click to see all your profiles: Classic (25/5), Extended (45/15), your custom ones
- Select any profile to instantly change timer durations

### 🎨 How to Customize App Appearance

1. **Click ⚙️ Settings** → **"Advanced" button** (green button)
2. **Choose theme**: Light, Dark, or Auto (follows system)
3. **Enable "Minimalist Mode"** for distraction-free interface
4. **Show/hide seconds** in timer display
5. **Configure notifications** and sound volume

### 📊 How to Track Your Productivity by Project

1. **Create labels** for each project (as shown above)
2. **Always select the appropriate label** before starting timer
3. **View statistics**: Click the "View Stats" button on main timer
4. **See breakdown**: Your time is automatically categorized by label
5. **Export data**: Click "Export JSON" to get detailed reports

### 🆘 Quick Troubleshooting

**"I can't find the Settings button"**
- Look for the ⚙️ gear icon in the **top-right corner** of the main timer screen

**"I don't see Labels/Profiles buttons in Settings"**  
- After clicking ⚙️ Settings, look for **3 colored buttons at the top**:
  - 🏷️ **Labels** (blue button)
  - ⏰ **Profiles** (purple button) 
  - ⚙️ **Advanced** (green button)

**"My custom timer duration isn't saving"**
- Make sure to click **"Save"** after changing the focus duration
- Timer duration must be between 1-999 minutes

**"I created a label but can't select it"**
- New labels appear in the **dropdown above the main timer**
- Click the dropdown (shows current label) to see all available labels

**"Timer keeps resetting to 25 minutes"**
- You might be switching profiles - check the profile dropdown on main screen
- Each profile has its own timer durations

### 🏗️ Building for Production

```bash
# Build optimized production version
npm run build

# Build with memory optimization (for low-RAM environments)
npm run build:prod

# Preview the production build locally
npm run preview

# The built files will be in the 'dist' directory
```

### 🚀 Production Deployment (Minimal RAM Usage)

For production environments with limited resources, this app is optimized for minimal RAM consumption:

#### Quick Production Setup
```bash
# 1. Build optimized version
npm run build:prod

# 2. Install serve globally (one-time setup)
npm install -g serve

# 3. Serve with minimal memory footprint (128MB RAM limit)
npm run serve:low-mem

# Alternative: Standard serving (uses more RAM but still optimized)
npm run serve
```

#### One-Line Production Deployment (Detached Mode)

**Complete Setup & Start (Linux/Mac):**
```bash
npm run build:prod && npm install -g serve && nohup npm run serve:low-mem > /dev/null 2>&1 & echo $! > minimal-pomodoro-webapp.pid && echo "✅ Minimal Pomodoro WebApp started with PID: $(cat minimal-pomodoro-webapp.pid) on http://localhost:3000"
```

**Simple Process Management:**
```bash
# Start server (if already built)
nohup npm run serve:low-mem > /dev/null 2>&1 & echo $! > minimal-pomodoro-webapp.pid && echo "✅ Started: PID $(cat minimal-pomodoro-webapp.pid)"

# Stop server
kill $(cat minimal-pomodoro-webapp.pid) 2>/dev/null && rm -f minimal-pomodoro-webapp.pid && echo "❌ Stopped: Minimal Pomodoro WebApp" || echo "⚠️  Server not running or PID file missing"

# Check status
[ -f minimal-pomodoro-webapp.pid ] && kill -0 $(cat minimal-pomodoro-webapp.pid) 2>/dev/null && echo "✅ Running: PID $(cat minimal-pomodoro-webapp.pid)" || echo "❌ Not running"

# Restart server
kill $(cat minimal-pomodoro-webapp.pid) 2>/dev/null; rm -f minimal-pomodoro-webapp.pid; nohup npm run serve:low-mem > /dev/null 2>&1 & echo $! > minimal-pomodoro-webapp.pid && echo "🔄 Restarted: PID $(cat minimal-pomodoro-webapp.pid)"
```

**Windows Commands:**
```cmd
REM Complete setup and start (Windows CMD)
npm run build:prod && npm install -g serve && start /B npm run serve:low-mem

REM Or using PowerShell for better process management
powershell -Command "npm run build:prod; npm install -g serve; $process = Start-Process -NoNewWindow -PassThru npm -ArgumentList 'run', 'serve:low-mem'; $process.Id | Out-File 'minimal-pomodoro-webapp.pid'; Write-Host 'Started with PID:' $process.Id"
```

#### Automated Management Script

For even simpler management, use the included shell script:

```bash
# Make script executable (one-time setup)
chmod +x manage-webapp.sh

# Complete setup and start
./manage-webapp.sh setup

# Or individual commands
./manage-webapp.sh build    # Build production version
./manage-webapp.sh start    # Start server in background
./manage-webapp.sh status   # Check if running (shows PID and memory usage)
./manage-webapp.sh stop     # Stop server
./manage-webapp.sh restart  # Restart server
```

**Features of management script:**
- ✅ Automatic `serve` installation if missing
- 🔍 Process status checking with memory usage
- 🛡️ Prevents duplicate instances
- 📝 Clear status messages with emojis
- 🔄 Safe restart functionality
- 🧹 Automatic cleanup of stale PID files

#### Manual Production Deployment
```bash
# Build with production optimizations
npm run build:prod

# Serve the dist folder with any static file server
# Examples:
npx serve dist -s -l 3000                    # Node.js serve
python -m http.server 3000 -d dist           # Python
php -S localhost:3000 -t dist                # PHP built-in server
```

#### Production Optimizations Applied
- **Terser minification** with console/debugger removal
- **Manual code splitting** to reduce memory usage during loading
- **Optimized dependency bundling** with vendor chunk separation
- **Asset optimization** with proper caching headers
- **Memory-limited Node.js** runtime (512MB for build, 128MB for serving)

#### Memory Usage Benchmarks
- **Build process**: ~512MB RAM (Node.js limited)
- **Static serving**: ~64-128MB RAM depending on concurrent users
- **Browser memory**: ~15-25MB per active tab
- **Storage**: ~5-10MB total disk space for built files

#### Deployment Platforms
The optimized build works on any static hosting service:
- **Netlify/Vercel**: Zero-config deployment from Git
- **Nginx/Apache**: Copy `dist/` to web root
- **Docker**: Use nginx:alpine base image (~5MB)
- **CDN**: Upload to AWS S3/CloudFront, Cloudflare Pages

### 📱 PWA Installation Guide

#### For Desktop (Chrome/Edge/Firefox):
1. Open the app in your browser
2. Look for the **"Install"** button in the address bar (or app menu)
3. Click **"Install"** to add as desktop app
4. The app will open in its own window without browser chrome

#### For Mobile (Android/iOS):
1. Open in mobile browser
2. Tap browser menu (⋮ or share button)
3. Select **"Add to Home Screen"** or **"Install App"**
4. Confirm installation

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run preview      # Preview production build

# Code Quality  
npm run lint         # Run ESLint for code linting
npm run typecheck    # Run TypeScript type checking

# Production
npm run build        # Create optimized production build
```

### 📁 Project Structure

```
webApp/
├── public/                 # Static assets
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker for offline support
│   └── icons/             # App icons for PWA
├── src/
│   ├── components/        # React components
│   │   ├── Timer.tsx           # Main timer interface with +60s feature
│   │   ├── Settings.tsx        # Basic timer settings
│   │   ├── AdvancedSettings.tsx # Comprehensive settings panel
│   │   ├── Labels.tsx          # Label/tag management system
│   │   ├── TimerProfiles.tsx   # Timer profile management
│   │   ├── SessionEditor.tsx   # Manual session editing
│   │   └── Statistics.tsx      # Stats, analytics & export
│   ├── stores/           # Zustand state management
│   │   ├── timerStore.ts       # Core timer logic & integration
│   │   ├── sessionStore.ts     # Session tracking & history with persistence
│   │   ├── labelStore.ts       # Label management with colors & persistence
│   │   ├── profileStore.ts     # Timer profiles & presets with persistence
│   │   └── appSettingsStore.ts # Advanced app configuration
│   ├── database/         # Data persistence layer
│   │   ├── indexedDBManager.ts # IndexedDB database management
│   │   ├── database.ts         # Database abstraction layer
│   │   ├── schema.sql          # Database schema documentation
│   │   └── services/           # Data access services
│   │       ├── sessionService.ts   # Session data operations
│   │       ├── labelService.ts     # Label data operations
│   │       └── profileService.ts   # Profile data operations
│   ├── hooks/            # React hooks
│   │   └── useDataInit.ts      # Data initialization hook
│   ├── utils/            # Utility functions
│   │   ├── timer.ts       # Timer calculations & notifications
│   │   └── export.ts      # Data export functionality
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles (Tailwind CSS)
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration with PWA
├── tailwind.config.js    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # Complete documentation (this file)
```

## 🎯 Complete Usage Guide

### Basic Timer Operation
1. **Start Timer**: Click the green play button
2. **Pause/Resume**: Click yellow pause button (play button while paused)  
3. **Stop**: Click red stop button to end current session
4. **Skip**: Click blue skip button to move to next timer type
5. **Reset**: Click gray reset button to return to initial state
6. **+60 Seconds**: Click the "+60s" button to extend current session

### Advanced Timer Features

#### Custom Timer Durations
- Set any duration from 1-999 minutes in Settings
- Examples: 25 min (classic), 45 min (extended), 72 min (custom), 90 min (deep work)
- Supports both countdown and stopwatch modes

#### Labels & Organization
1. Access **Labels** from Settings → Labels button
2. **Create Labels**: Add new colored labels for different projects/activities
3. **Manage Labels**: Edit names, change colors (25 options), or archive unused labels
4. **Session Labeling**: Select label before starting timer or assign to completed sessions
5. **Label Statistics**: View productivity breakdown by label/project

#### Timer Profiles
1. Access **Profiles** from Settings → Profiles button
2. **Use Presets**: Classic (25/5), Extended (45/15), Deep Work (90/20), etc.
3. **Create Custom**: Build profiles with specific work/break/long break durations
4. **Quick Switch**: Change profiles from main timer interface
5. **Profile Management**: Edit, duplicate, or delete profiles as needed

#### Manual Session Editing
1. Access **Statistics** → Session Editor (from advanced menu)
2. **Add Sessions**: Manually log past work sessions with custom times
3. **Edit Sessions**: Modify duration, labels, timestamps, or session type
4. **Flexible Duration Input**: Enter time as MM:SS (25:00) or HH:MM:SS (1:30:00)
5. **Delete Sessions**: Remove incorrect or unwanted session entries

### Advanced Settings & Personalization
1. Click **Settings** → **Advanced** button  
2. Configure comprehensive options:
   - **Appearance**: Theme (Light/Dark/Auto), minimalist mode, show seconds
   - **Notifications**: Browser alerts, sound volume, vibration on mobile
   - **Timer Behavior**: Auto-start breaks, break budgets, long break triggers
   - **Statistics**: Daily goals, week start day, label-based tracking
   - **Privacy**: Data retention, analytics settings, confirm deletions
   - **Keyboard Shortcuts**: Enable/disable shortcuts (Space, S, R, +)

### Statistics & Data Management
1. **Real-time Stats**: View current session progress and daily totals
2. **Detailed Analytics**: 
   - Total sessions by type and label
   - Focus time accumulation with goals tracking
   - Average session durations and productivity trends
3. **Data Export**: 
   - JSON export with complete session history
   - Includes timestamps, durations, labels, and metadata
4. **Settings Backup**: Export/import app settings for backup/restore
5. **Data Cleanup**: Clear specific sessions or reset all data

### JSON Export Format
The exported JSON file contains:
```json
{
  "exportDate": "2025-01-XX...",
  "totalSessions": 25,
  "statistics": {
    "totalSessions": 25,
    "focusSessions": 15,
    "breakSessions": 10,
    "totalFocusTime": 1500,
    "totalBreakTime": 300,
    "averageSessionDuration": 72
  },
  "sessions": [
    {
      "id": "uuid",
      "label": "Work",
      "timerType": "FOCUS",
      "duration": 1500,
      "endTime": "2025-01-XX...",
      "archived": false
    }
  ]
}
```

## 🗄️ Data Persistence Architecture

The web app now features a robust data persistence system that ensures your productivity data is never lost:

### 💾 Storage Technologies
- **Primary Storage**: **IndexedDB** - Browser-native database with full ACID compliance
- **Fallback Storage**: **LocalStorage** - Automatic fallback for compatibility
- **State Management**: **Zustand with Persistence** - Seamless state hydration

### 📊 Database Schema
- **Sessions Table**: Complete session history with timestamps, labels, and durations
- **Labels Table**: Color-coded project labels with custom ordering
- **Timer Profiles**: Multiple timer configurations with work/break patterns
- **App Settings**: User preferences and configuration data

### 🔄 Data Flow
1. **User Actions** → Zustand Store Updates
2. **Store Changes** → Database Service Layer 
3. **Database Layer** → IndexedDB Operations
4. **App Restart** → Automatic Data Loading & State Hydration

### 🛠️ Database Services
- **sessionService**: CRUD operations for session management
- **labelService**: Label creation, editing, and organization
- **profileService**: Timer profile management
- **Automatic Migration**: Seamless updates and data compatibility

### 📤 Export & Backup
```json
{
  "exportDate": "2025-01-31T...",
  "version": "1.0",
  "statistics": { /* aggregated stats */ },
  "sessions": [ /* complete session history */ ],
  "labels": [ /* user-defined labels */ ],
  "timerProfiles": [ /* custom timer configurations */ ]
}
```

### 🔒 Data Privacy & Security
- **Local Storage Only**: All data stays in your browser - no server uploads
- **No Tracking**: Zero analytics or telemetry unless explicitly enabled
- **Full Control**: Export, backup, or clear your data anytime
- **GDPR Compliant**: Complete data ownership and control

## 🏗️ Technology Stack

### Core Technologies
- **[React 18](https://react.dev/)** - Modern UI framework with hooks & concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript with full IntelliSense
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS for rapid UI development

### State Management & Storage  
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management with persistence
- **IndexedDB** - Browser-native database for robust data persistence
- **Zustand Persist Middleware** - Seamless hydration and state persistence
- **Custom Database Layer** - Structured data management with full CRUD operations
- **Automatic Data Migration** - Ensures compatibility across app updates

### PWA & User Experience
- **[Vite PWA Plugin](https://vite-pwa-org.netlify.app/)** - Complete Progressive Web App features  
- **[Workbox](https://developers.google.com/web/tools/workbox)** - Service worker with advanced caching
- **[Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)** - Native app-like installation
- **[Lucide React](https://lucide.dev/)** - Beautiful, consistent icon library

### Development & Quality Tools
- **[ESLint](https://eslint.org/)** - Code linting and style enforcement
- **[PostCSS](https://postcss.org/)** - CSS processing with Autoprefixer  
- **[TypeScript Config](https://www.typescriptlang.org/tsconfig)** - Strict type checking configuration

## 🌐 Browser Compatibility

### Fully Supported
- **Chrome/Chromium 90+** ✅ (Recommended)
- **Microsoft Edge 90+** ✅
- **Firefox 88+** ✅
- **Safari 14+** ✅ (macOS/iOS)

### PWA Installation Support
- **Chrome/Chromium** ✅ Full PWA support
- **Edge** ✅ Full PWA support  
- **Firefox** ✅ Basic PWA support
- **Safari** ⚠️ Limited PWA support (iOS 16.4+)

## 🔧 Advanced Configuration

### Environment Variables
Create a `.env.local` file for custom configuration:
```env
VITE_APP_TITLE=My Custom Pomodoro Timer
VITE_DEFAULT_WORK_DURATION=25
VITE_DEFAULT_BREAK_DURATION=5
```

### Custom Build Configuration
Modify `vite.config.ts` for advanced build settings:
- Change PWA settings
- Customize build output
- Add additional plugins

### Deployment Options
- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **Server Deployment**: Any web server (nginx, Apache)
- **CDN**: Cloudflare, AWS CloudFront

## 🤝 Integration with Goodtime Ecosystem

This web app is part of the larger Goodtime Productivity monorepo:
- **Android App** (`androidApp/`) - Native Android application
- **Shared Logic** (`shared/`) - Kotlin Multiplatform shared code
- **Web App** (`webApp/`) - This web/PWA application

### Shared Features Across Platforms
- Consistent timer logic and session tracking
- Similar UI/UX patterns and workflows  
- Compatible data export formats
- Unified branding and design language

## 📄 License

This project inherits the license from the main Goodtime repository. See the root `COPYING.md` file for details.

## 🐛 Troubleshooting

### Common Issues

**Timer not starting:**
- Check browser permissions for notifications
- Ensure JavaScript is enabled
- Try refreshing the page

**PWA installation not available:**
- Ensure you're using a supported browser
- Check that the site is served over HTTPS (required for PWA)
- Clear browser cache and try again

**Notifications not working:**
- Grant notification permissions when prompted
- Check browser notification settings
- Ensure the tab/app has focus when timer completes

**Data not persisting:**
- Check if IndexedDB is supported and enabled in your browser
- Ensure you're not in incognito/private mode (IndexedDB may be limited)
- Check browser storage permissions and quota
- Try clearing browser data and restarting the app
- Fallback to localStorage will be used if IndexedDB is unavailable

### Performance Optimization
- The app uses efficient state management with Zustand
- Service worker provides offline caching
- Minimal bundle size with code splitting
- Optimized for 60fps animations

## 🚀 Contributing

This web app is part of the Goodtime monorepo. To contribute:
1. Follow the main repository's contribution guidelines
2. Focus on web-specific improvements and features
3. Ensure compatibility with the existing Android app functionality
4. Test across multiple browsers and devices

---

**🍅 Start your productive Pomodoro sessions today!**