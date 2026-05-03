import { useState, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useSessions } from '../queries/useSessions'
import { useLabels } from '../queries/useLabels'
import { useCloudStats } from '../queries/useCloudStats'
import { useRefreshCloudStats } from '../mutations/useRefreshCloudStats'
import { todayId, parseDateId, formatDateId } from '../lib/dateUtils'
import type { Session } from '../types/session'

const TABS = ['Overview', 'Timeline', 'History'] as const
type Tab = (typeof TABS)[number]

const DEFAULT_COLORS = [
  '#d975f7', '#60a5fa', '#4ade80', '#fbbf24',
  '#f87171', '#a78bfa', '#34d399', '#fb923c',
]

/** Always show raw minutes — never convert to h/m */
function fmtMin(min: number) {
  return `${Math.round(min)}m`
}

/** "dd-mm-yyyy" → "yyyy-mm-dd" for <input type="date"> */
function dateIdToInput(dateId: string): string {
  const [dd, mm, yyyy] = dateId.split('-')
  return `${yyyy}-${mm}-${dd}`
}

/** "yyyy-mm-dd" → "dd-mm-yyyy" (app date ID format) */
function inputToDateId(input: string): string {
  if (!input) return ''
  const [yyyy, mm, dd] = input.split('-')
  return `${dd}-${mm}-${yyyy}`
}

/** Merge local + cloud sessions, cloud wins for same date+label (no double-counting). */
function mergeSessions(local: Session[], cloud: Session[]): Session[] {
  if (cloud.length === 0) return local
  const cloudKeys = new Set(cloud.map((s) => `${s.date}|${s.labelName}`))
  const onlyLocal = local.filter((s) => !cloudKeys.has(`${s.date}|${s.labelName}`))
  return [...cloud, ...onlyLocal]
}

// Date range input component
function DateRangePicker({
  from, to, onFromChange, onToChange,
}: {
  from: string; to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span className="text-gray-600">From</span>
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="bg-[#111] border border-[#2a2a2a] rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-[#c54af0]"
      />
      <span className="text-gray-600">To</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="bg-[#111] border border-[#2a2a2a] rounded px-2 py-1 text-gray-300 text-xs focus:outline-none focus:border-[#c54af0]"
      />
    </div>
  )
}

// Default range helpers
function defaultFrom(days: number): string {
  return dateIdToInput(formatDateId(Date.now() - days * 24 * 60 * 60 * 1000))
}
function defaultTo(): string {
  return dateIdToInput(todayId())
}

export default function StatisticsPage() {
  const [tab, setTab] = useState<Tab>('Overview')
  const { data: localSessions = [] } = useSessions()
  const { data: cloudSessions = [] } = useCloudStats()
  const { data: labels = [] } = useLabels()
  const refresh = useRefreshCloudStats()
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)

  // Date range state — Timeline (default: last 30 days)
  const [tlFrom, setTlFrom] = useState(() => defaultFrom(30))
  const [tlTo, setTlTo] = useState(() => defaultTo())

  // Date range state — Overview (default: last 30 days)
  const [ovFrom, setOvFrom] = useState(() => defaultFrom(30))
  const [ovTo, setOvTo] = useState(() => defaultTo())

  const sessions = useMemo(
    () => mergeSessions(localSessions, cloudSessions),
    [localSessions, cloudSessions],
  )

  const labelColorMap = useMemo(() => {
    const m: Record<string, string> = {}
    labels.forEach((l, i) => { m[l.name] = l.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] })
    return m
  }, [labels])

  // ── Timeline aggregation (date-range filtered) ──────────────────────────────

  const timelineData = useMemo(() => {
    const fromMs = tlFrom ? parseDateId(inputToDateId(tlFrom)) : 0
    const toMs = tlTo ? parseDateId(inputToDateId(tlTo)) + 24 * 60 * 60 * 1000 : Infinity

    const byDate = new Map<string, Record<string, number>>()
    for (const s of sessions) {
      const dateMs = parseDateId(s.date)
      if (dateMs < fromMs || dateMs >= toMs) continue
      const entry = byDate.get(s.date) ?? {}
      entry[s.labelName] = (entry[s.labelName] ?? 0) + s.durationMinutes
      byDate.set(s.date, entry)
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => parseDateId(a) - parseDateId(b))  // correct date sort
      .map(([date, labelMins]) => ({ date, ...labelMins }))
  }, [sessions, tlFrom, tlTo])

  const uniqueLabels = useMemo(() =>
    [...new Set(sessions.map((s) => s.labelName))],
    [sessions]
  )

  // ── Overview aggregation (date-range filtered) ──────────────────────────────

  const filteredForOverview = useMemo(() => {
    const fromMs = ovFrom ? parseDateId(inputToDateId(ovFrom)) : 0
    const toMs = ovTo ? parseDateId(inputToDateId(ovTo)) + 24 * 60 * 60 * 1000 : Infinity
    return sessions.filter((s) => {
      const d = parseDateId(s.date)
      return d >= fromMs && d < toMs
    })
  }, [sessions, ovFrom, ovTo])

  const today = todayId()
  const totalMin = filteredForOverview.reduce((s, x) => s + x.durationMinutes, 0)
  const todayMin = filteredForOverview.filter((s) => s.date === today).reduce((a, s) => a + s.durationMinutes, 0)

  const pieData = useMemo(() => {
    const acc: Record<string, number> = {}
    filteredForOverview.forEach((s) => { acc[s.labelName] = (acc[s.labelName] ?? 0) + s.durationMinutes })
    return Object.entries(acc).map(([name, value]) => ({ name, value }))
  }, [filteredForOverview])

  async function handleRefresh() {
    setRefreshMsg(null)
    try {
      const result = await refresh.mutateAsync()
      setRefreshMsg(`Fetched ${result.length} cloud entr${result.length === 1 ? 'y' : 'ies'}.`)
    } catch {
      setRefreshMsg('Failed to fetch cloud data.')
    }
  }

  const hasCloudData = cloudSessions.length > 0

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 border-b border-[#2a2a2a] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-semibold text-white">Statistics</h1>
          <button
            onClick={handleRefresh}
            disabled={refresh.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#c54af0] hover:text-white disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={refresh.isPending ? 'animate-spin' : ''} />
            {refresh.isPending ? 'Refreshing…' : 'Refresh from Cloud'}
          </button>
        </div>

        {refreshMsg && (
          <p className="text-xs text-gray-500 mb-2">{refreshMsg}</p>
        )}

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
            {!hasCloudData && (
              <div className="bg-[#1a1a1a] border border-dashed border-[#2a2a2a] rounded-xl p-4 text-center space-y-2">
                <p className="text-xs text-gray-500">No cloud data loaded yet.</p>
                <button
                  onClick={handleRefresh}
                  disabled={refresh.isPending}
                  className="px-4 py-1.5 text-xs rounded-lg bg-[#c54af0] text-white hover:bg-[#d975f7] disabled:opacity-50 transition-colors"
                >
                  {refresh.isPending ? 'Refreshing…' : 'Refresh from Cloud'}
                </button>
              </div>
            )}

            {/* Date range picker */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Date Range</span>
              <DateRangePicker
                from={ovFrom} to={ovTo}
                onFromChange={setOvFrom} onToChange={setOvTo}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Today', value: fmtMin(todayMin), sub: `${filteredForOverview.filter(s => s.date === today).length} sessions` },
                { label: 'In Range', value: fmtMin(totalMin), sub: `${filteredForOverview.length} sessions` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-mono font-light text-white">{value}</p>
                  <p className="text-xs text-gray-600 mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {pieData.length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <h2 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">By Label (minutes)</h2>
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

            {filteredForOverview.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600 space-y-1">
                <p className="text-sm">No sessions in range</p>
                <p className="text-xs">Adjust the date range or refresh from cloud</p>
              </div>
            )}
          </div>
        )}

        {/* ── Timeline ──────────────────────────────────────────────────────── */}
        {tab === 'Timeline' && (
          <div className="space-y-4">
            {/* Date range picker */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Date Range</span>
              <DateRangePicker
                from={tlFrom} to={tlTo}
                onFromChange={setTlFrom} onToChange={setTlTo}
              />
            </div>

            {timelineData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600 space-y-1">
                <p className="text-sm">No data in range</p>
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <h2 className="text-xs text-gray-500 mb-4 uppercase tracking-wider">
                  Focus minutes — {timelineData.length} day{timelineData.length !== 1 ? 's' : ''}
                </h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={timelineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(d) => d.slice(0, 5)} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `${v}m`} />
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
                    {s.id.startsWith('cloud-') && (
                      <span className="text-xs text-[#c54af0]/60 bg-[#c54af0]/10 px-1.5 py-0.5 rounded">cloud</span>
                    )}
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
