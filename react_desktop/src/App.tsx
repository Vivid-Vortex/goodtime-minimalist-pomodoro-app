import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { Timer, BarChart2, Tag, Settings, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { useAuth } from './hooks/useAuth'
import TimerPage from './pages/TimerPage'
import StatisticsPage from './pages/StatisticsPage'
import LabelsPage from './pages/LabelsPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'

const NAV = [
  { to: '/',           icon: Timer,      label: 'Timer'      },
  { to: '/statistics', icon: BarChart2,  label: 'Statistics' },
  { to: '/labels',     icon: Tag,        label: 'Labels'     },
  { to: '/settings',   icon: Settings,   label: 'Settings'   },
]

export default function App() {
  const { user, loading } = useAuth()

  // While Firebase checks stored auth state, show a minimal dark screen
  if (loading) {
    return (
      <div className="flex h-screen bg-[#121212] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#c54af0] border-t-transparent animate-spin" />
      </div>
    )
  }

  // Not signed in — show login
  if (!user) return <LoginPage />

  return (
    <div className="flex h-screen bg-[#121212] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] flex flex-col border-r border-[#2a2a2a] shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#2a2a2a]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d975f7] to-[#c54af0] flex items-center justify-center text-white text-sm font-bold">
            P
          </div>
          <span className="font-semibold text-sm text-white">Pomodoro Auto</span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                   ? 'bg-[#2d0a3f] text-[#d975f7] border-l-2 border-[#c54af0] pl-[10px]'
                   : 'text-gray-400 hover:text-white hover:bg-[#1e1e1e]'
                 }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + sign-out */}
        <div className="px-4 py-4 border-t border-[#2a2a2a] flex items-center gap-3">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'User'}
              className="w-7 h-7 rounded-full shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#2d0a3f] flex items-center justify-center text-[#d975f7] text-xs font-bold shrink-0">
              {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate font-medium leading-tight">
              {user.displayName ?? 'Signed in'}
            </p>
            <p className="text-[10px] text-gray-500 truncate leading-tight">
              {user.email}
            </p>
          </div>
          <button
            onClick={() => signOut(auth)}
            title="Sign out"
            className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/"           element={<TimerPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/labels"     element={<LabelsPage />} />
          <Route path="/settings"   element={<SettingsPage />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
