import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useSessions } from '../queries/useSessions'
import { useLabels } from '../queries/useLabels'
import { todayId, parseDateId } from '../lib/dateUtils'

const TABS = ['Overview', 'Timeline', 'History'] as const
type Tab = (typeof TABS)[number]

const DEFAULT_COLORS = [
  '#d975f7', '#60a5fa', '#4ade80', '#fbbf24',
  '#f87171', '#a78bfa', '#34d399', '#fb923c',
]

function fmtMin(min: number) {
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

export default function StatisticsPage() {
  const [tab, setTab] = useState<Tab>('Overview')
  const { data: sessions = [] } = useSessions()
  const { data: labels = [] } = useLabels()

  const labelColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    labels.forEach((l, i) => { m[l.name] = l.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] })
    return m
  }, [labels])

  // ── Aggregation ────────────────────────────────────────────────────────────

  const today = todayId()
  const nowMs = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const monthMs = 30 * 24 * 60 * 60 * 1000

  const totalMin = sessions.reduce((s, x) => s + x.durationMinutes, 0)
  const todayMin = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.durationMinutes, 0)
  const weekMin = sessions
    .filter((s) => nowMs - parseDateId(s.date) < weekMs)
    .reduce((a, s) => a + s.durationMinutes, 0)
  const monthMin = sessions
    .filter((s) => nowMs - parseDateId(s.date) < monthMs)
    .reduce((a, s) => a + s.durationMinutes, 0)

  // Timeline: group by date, by label
  const timelineData = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>()
    for (const s of sessions) {
      const entry = byDate.get(s.date) ?? {}
      entry[s.labelName] = (entry[s.labelName] ?? 0) + s.durationMinutes
      byDate.set(s.date, entry)
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, labelMins]) => ({ date, ...labelMins }))
  }, [sessions])

  const uniqueLabels = useMemo(() =>
    [...new Set(sessions.map((s) => s.labelName))],
    [sessions]
  )

  // Pie: label breakdown (all time)
  const pieData = useMemo(() => {
    const acc: Record<string, number> = {}
    sessions.forEach((s) => { acc[s.labelName] = (acc[s.labelName] ?? 0) + s.durationMinutes })
    return Object.entries(acc).map(([name, value]) => ({ name, value }))
  }, [sessions])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 border-b border-[#2a2a2a] shrink-0">
        <h1 className="text-base font-semibold text-white mb-3">Statistics</h1>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
                tab === t
                  ? 'bg-[#1e1e1e] text-[#d975f7] border-t border-l border-r border-[#2a2a2a]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* ── Overview ──────────────────────────────────────────────────────── */}
        {tab === 'Overview' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Today', value: fmtMin(todayMin), sub: `${sessions.filter(s => s.date === today).length} sessions` },
                { label: 'This Week', value: fmtMin(weekMin), sub: 'last 7 days' },
                { label: 'This Month', value: fmtMin(monthMin), sub: 'last 30 days' },
                { label: 'Total', value: fmtMin(totalMin), sub: `${sessions.length} sessions` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-mono font-light text-white">{value}</p>
                  <p className="text-xs text-gray-600 mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* Pie chart */}
            {pieData.length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <h2 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">By Label</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name} ${fmtMin(value)}`} labelLine={false}>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={labelColorMap[entry.name] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
                    <Tooltip formatter={(v) => fmtMin(Number(v))} contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {sessions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600 space-y-1">
                <p className="text-sm">No sessions yet</p>
                <p className="text-xs">Complete a focus session to see stats</p>
              </div>
            )}
          </div>
        )}

        {/* ── Timeline ──────────────────────────────────────────────────────── */}
        {tab === 'Timeline' && (
          <div className="space-y-4">
            {timelineData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600 space-y-1">
                <p className="text-sm">No data yet</p>
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <h2 className="text-xs text-gray-500 mb-4 uppercase tracking-wider">Focus minutes — last 14 days</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={timelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(d) => d.slice(0, 5)} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                      labelStyle={{ color: '#e5e7eb', fontSize: 12 }}
                      formatter={(v, name) => [fmtMin(Number(v)), name]}
                    />
                    {uniqueLabels.map((name, i) => (
                      <Bar key={name} dataKey={name} stackId="a"
                        fill={labelColorMap[name] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                        radius={i === uniqueLabels.length - 1 ? [4, 4, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── History ──────────────────────────────────────────────────────── */}
        {tab === 'History' && (
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600 space-y-1">
                <p className="text-sm">No sessions recorded</p>
              </div>
            ) : (
              [...sessions]
                .sort((a, b) => b.endedAt - a.endedAt)
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: labelColorMap[s.labelName] ?? '#6b7280' }}
                    />
                    <span className="text-sm font-medium text-white w-12">{s.labelName}</span>
                    <span className="text-sm text-gray-400 flex-1">{fmtMin(s.durationMinutes)}</span>
                    <span className="text-xs text-gray-600">{s.date}</span>
                    <span className="text-xs text-gray-700">
                      {new Date(s.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
