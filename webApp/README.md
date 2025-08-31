# Goodtime Web App

A minimalist but powerful Pomodoro timer web application that runs in browsers and can be installed as a desktop app via PWA capabilities. This is part of the Goodtime Productivity monorepo, providing cross-platform Pomodoro timer functionality.

## ✨ Features

### 🎯 Core Timer Functionality
- ⏰ **Customizable Timer**: Configure focus, break, and long break durations (1-120 minutes)
- 🔄 **Multiple Timer Modes**: 
  - **Countdown Mode**: Traditional Pomodoro with set durations
  - **Stopwatch Mode**: Open-ended timing sessions
- ⚡ **Smart Break Management**: 
  - Regular breaks after focus sessions
  - Long breaks after configurable session count (2-10 sessions)
  - Optional break disable for continuous focus
- 🎵 **Audio & Visual Feedback**:
  - Browser notification alerts
  - Audio notification sounds
  - Color-coded timer states (Red=Focus, Green=Break, Blue=Long Break)

### 📊 Statistics & Data Export
- 📈 **Session Tracking**: Automatic tracking of completed sessions
- 📊 **Detailed Statistics**:
  - Total focus/break sessions count
  - Total focus time accumulation
  - Average session duration
  - Recent sessions history (last 10)
- 📋 **JSON Export**: Complete session data export with timestamps
- 🗑️ **Data Management**: Clear all session data option

### 📱 Progressive Web App (PWA)
- 🖥️ **Desktop Installation**: Install as native-like desktop app
- 📱 **Mobile Support**: Works on mobile devices with app-like experience
- 🔄 **Offline Support**: Functions without internet connection
- 💾 **Persistent Storage**: Settings and session data saved locally
- 🔔 **Background Notifications**: Timer alerts even when app is not active

### 🎨 User Experience
- 🎨 **Clean Minimalist UI**: Distraction-free design focused on productivity
- 🌈 **Visual Timer**: Circular progress indicator with color coding
- ⚙️ **Customizable Settings**: Easy-to-access configuration panel
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🖼️ **Dynamic Page Title**: Shows remaining time in browser tab

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and **npm** (or **yarn**/**pnpm**)
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Installation & Setup

```bash
# 1. Navigate to the webApp directory
cd webApp

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The app will be available at **`http://localhost:3000`**

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
│   │   ├── Timer.tsx      # Main timer interface
│   │   ├── Settings.tsx   # Settings modal
│   │   └── Statistics.tsx # Stats & export modal
│   ├── stores/           # Zustand state management
│   │   ├── timerStore.ts  # Timer state & logic
│   │   └── sessionStore.ts # Session tracking
│   ├── utils/            # Utility functions
│   │   ├── timer.ts       # Timer calculations & notifications
│   │   └── export.ts      # Data export functionality
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles (Tailwind CSS)
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## 🎯 Usage Guide

### Basic Timer Operation
1. **Start Timer**: Click the green play button
2. **Pause/Resume**: Click yellow pause button (play button while paused)
3. **Stop**: Click red stop button to end current session
4. **Skip**: Click blue skip button to move to next timer type
5. **Reset**: Click gray reset button to return to initial state

### Timer Configuration
1. Click the **⚙️ Settings** button (top-right corner)
2. Configure timer preferences:
   - **Timer Mode**: Choose Countdown or Stopwatch
   - **Focus Duration**: Set work session length (1-120 minutes)
   - **Break Settings**: Enable/disable breaks and set duration
   - **Long Break**: Configure long breaks and session intervals

### Viewing Statistics & Exporting Data
1. Complete some timer sessions (they're automatically tracked)
2. Click **"View Statistics"** button on the main timer screen
3. Review your productivity metrics:
   - Focus/break session counts
   - Total focus time
   - Average session duration
   - Recent session history
4. **Export Data**: Click **"Export JSON Report"** to download complete session data
5. **Clear Data**: Use "Clear Data" to reset all statistics (with confirmation)

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
- **[React 18](https://react.dev/)** - Modern UI framework with hooks
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework

### State Management & Storage
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **Browser LocalStorage** - Persistent settings and session storage

### PWA & Icons
- **[Vite PWA Plugin](https://vite-pwa-org.netlify.app/)** - Progressive Web App features
- **[Lucide React](https://lucide.dev/)** - Beautiful, consistent icons

### Development Tools
- **[ESLint](https://eslint.org/)** - Code linting and style enforcement  
- **[PostCSS](https://postcss.org/)** - CSS processing with Autoprefixer

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