import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { Timer, BarChart2, Tag, Settings } from 'lucide-react'
import TimerPage from './pages/TimerPage'
import StatisticsPage from './pages/StatisticsPage'
import LabelsPage from './pages/LabelsPage'
import SettingsPage from './pages/SettingsPage'

const NAV = [
  { to: '/',           icon: Timer,      label: 'Timer'      },
  { to: '/statistics', icon: BarChart2,  label: 'Statistics' },
  { to: '/labels',     icon: Tag,        label: 'Labels'     },
  { to: '/settings',   icon: Settings,   label: 'Settings'   },
]

export default function App() {
  return (
    <div className="flex h-screen bg-[#121212] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] flex flex-col border-r border-[#2a2a2a] shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#2a2a2a]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d975f7] to-[#c54af0] flex items-center justify-center text-white text-sm font-bold">
            G
          </div>
          <span className="font-semibold text-sm text-white">Goodtime</span>
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

        {/* Version */}
        <div className="px-5 py-4 text-xs text-gray-600 border-t border-[#2a2a2a]">
          v1.0.0 · Goodtime Pomodoro
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
