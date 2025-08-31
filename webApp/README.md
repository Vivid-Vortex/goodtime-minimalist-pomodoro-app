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
- 📈 **Comprehensive Session Tracking**: Every session automatically recorded
- 📊 **Detailed Analytics**:
  - Total focus/break sessions with label breakdown
  - Focus time accumulation with daily/weekly views
  - Average session durations and productivity trends
- 🔧 **Manual Session Editing**: 
  - Add sessions manually with custom date/time
  - Edit existing session details (duration, label, type, timestamp)
  - Delete unwanted sessions
- 📋 **Flexible Data Export**: JSON export with complete session history

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

### 🏗️ Building for Production

```bash
# Build optimized production version
npm run build

# Preview the production build locally
npm run preview

# The built files will be in the 'dist' directory
```

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
│   │   ├── sessionStore.ts     # Session tracking & history
│   │   ├── labelStore.ts       # Label management with colors
│   │   ├── profileStore.ts     # Timer profiles & presets
│   │   └── appSettingsStore.ts # Advanced app configuration
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

## 🏗️ Technology Stack

### Core Technologies
- **[React 18](https://react.dev/)** - Modern UI framework with hooks & concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript with full IntelliSense
- **[Vite](https://vitejs.dev/)** - Lightning-fast build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS for rapid UI development

### State Management & Storage  
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management with persistence
- **Browser LocalStorage** - Automatic persistence for settings and session data
- **Zustand Persist Middleware** - Seamless hydration and state persistence

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
- Check if browser storage is enabled
- Ensure you're not in incognito/private mode
- Clear browser data and restart if issues persist

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