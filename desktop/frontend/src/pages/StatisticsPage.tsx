import { useState, useEffect, useCallback } from "react";
import {
  GetStatisticsSummary, GetTimelineData, GetSessions,
} from "../wailsjs/go/main/App";
import { useAppStore } from "../stores/appStore";
import type { Summary, TimelineEntry, Session } from "../types";
import { LABEL_COLORS } from "../types";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

type Tab = "overview" | "timeline" | "history";

const TIME_RANGES = [
  { label: "Today",  ms: () => startOfDay(new Date()).getTime() },
  { label: "Week",   ms: () => startOfDay(mondayOfWeek(new Date())).getTime() },
  { label: "Month",  ms: () => startOfMonth(new Date()).getTime() },
  { label: "All",    ms: () => 0 },
];

export function StatisticsPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-1 px-4 py-2 border-b border-surface-700">
        {(["overview", "timeline", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors
              ${tab === t
                ? "bg-brand-500 text-white"
                : "text-gray-400 hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </header>
      <div className="flex-1 overflow-y-auto">
        {tab === "overview" && <OverviewTab />}
        {tab === "timeline" && <TimelineTab />}
        {tab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const labels = useAppStore((s) => s.labels);
  const [rangeIdx, setRangeIdx] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(() => {
    const afterMillis = TIME_RANGES[rangeIdx].ms();
    GetStatisticsSummary({ afterMillis }).then(setSummary).catch(console.error);
  }, [rangeIdx]);

  useEffect(() => { load(); }, [load]);

  const pieData = summary
    ? Object.entries(summary.perLabel).map(([name, minutes]) => ({
        name,
        value: minutes,
        color: LABEL_COLORS[(labels.find((l) => l.name === name)?.colorIndex ?? 0)],
      }))
    : [];

  return (
    <div className="p-4 flex flex-col gap-6">
      {/* Range selector */}
      <div className="flex gap-1">
        {TIME_RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRangeIdx(i)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${rangeIdx === i
                ? "bg-surface-700 text-white"
                : "text-gray-500 hover:text-gray-300"}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Focus" value={formatMinutes(summary?.totalWorkMinutes ?? 0)} />
        <StatCard label="Break" value={formatMinutes(summary?.totalBreakMinutes ?? 0)} />
        <StatCard label="Sessions" value={String(summary?.sessionCount ?? 0)} />
        <StatCard label="Labels" value={String(pieData.length)} />
      </div>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">By label</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatMinutes(value)}
                contentStyle={{ background: "#1e1e1e", border: "none", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-2">
            {pieData.map((d) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} · {formatMinutes(d.value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-semibold text-white tabular-nums">{value}</span>
    </div>
  );
}

// ─── Timeline tab ─────────────────────────────────────────────────────────────

function TimelineTab() {
  const labels = useAppStore((s) => s.labels);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  useEffect(() => {
    GetTimelineData({ labelNames: selectedLabels.length ? selectedLabels : undefined })
      .then(setEntries)
      .catch(console.error);
  }, [selectedLabels]);

  // Aggregate by day for bar chart (total work minutes per day)
  const byDay = Object.values(
    entries.reduce<Record<string, { date: string; minutes: number }>>((acc, e) => {
      const key = String(e.dateMillis);
      const date = new Date(e.dateMillis).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      acc[key] = { date, minutes: (acc[key]?.minutes ?? 0) + e.minutes };
      return acc;
    }, {})
  ).reverse().slice(0, 14); // last 14 days

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Label filter chips */}
      <div className="flex flex-wrap gap-2">
        {labels.map((l) => {
          const active = selectedLabels.includes(l.name);
          return (
            <button
              key={l.name}
              onClick={() =>
                setSelectedLabels((prev) =>
                  active ? prev.filter((n) => n !== l.name) : [...prev, l.name]
                )
              }
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${active
                  ? "bg-brand-500 text-white"
                  : "bg-surface-700 text-gray-400 hover:text-white"}`}
            >
              {l.name}
            </button>
          );
        })}
      </div>

      {byDay.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byDay} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <Tooltip
              formatter={(v: number) => formatMinutes(v)}
              contentStyle={{ background: "#1e1e1e", border: "none", borderRadius: 8 }}
              labelStyle={{ color: "#fff" }}
            />
            <Bar dataKey="minutes" fill="#c54af0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message="No sessions yet" />
      )}

      {/* Detailed list */}
      <ul className="divide-y divide-surface-700">
        {entries.slice(0, 50).map((e, i) => (
          <li key={i} className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-gray-400">
              {new Date(e.dateMillis).toLocaleDateString()}
            </span>
            <span className="text-gray-200">{e.labelName}</span>
            <span className="text-brand-400 font-medium tabular-nums">
              {formatMinutes(e.minutes)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── History tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    GetSessions({ limit: 100 }).then(setSessions).catch(console.error);
  }, []);

  return (
    <div className="p-4">
      {sessions.length === 0 ? (
        <EmptyState message="No sessions recorded yet" />
      ) : (
        <ul className="divide-y divide-surface-700">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const labels = useAppStore((s) => s.labels);
  const label = labels.find((l) => l.name === session.labelName);
  const color = LABEL_COLORS[label?.colorIndex ?? 0];

  return (
    <li className="flex items-center gap-3 py-3 text-sm">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-gray-200 truncate">{session.labelName}</span>
          <span className="text-brand-400 font-medium tabular-nums flex-shrink-0">
            {formatMinutes(session.duration)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          <span>{new Date(session.timestamp).toLocaleString()}</span>
          {session.deviceName && (
            <span className="px-1.5 py-0.5 bg-surface-700 rounded text-gray-400">
              {session.deviceName}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm gap-2">
      <span className="text-3xl">📊</span>
      <span>{message}</span>
    </div>
  );
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function mondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
