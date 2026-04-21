"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ServiceConfig } from "@/lib/helpdesk/settings-service"
import type { Feedback, Ticket, TicketPriority } from "@/lib/helpdesk/firestore-service"

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  Rendah: "#94a3b8",
  Sedang: "#3b82f6",
  Tinggi: "#f59e0b",
  Urgent: "#ef4444",
}

function startOfWeek(ts: number) {
  const d = new Date(ts)
  const day = d.getDay() // 0..6, Sunday=0
  const monDelta = (day + 6) % 7 // make Monday=0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - monDelta)
  return d.getTime()
}

export function AnalyticsCharts({
  tickets,
  feedbacks,
  services,
}: {
  tickets: Ticket[]
  feedbacks: Feedback[]
  services: ServiceConfig[]
}) {
  const trend = useMemo(() => {
    const now = Date.now()
    const buckets = new Map<number, number>()
    for (let w = 7; w >= 0; w--) {
      const s = startOfWeek(now - w * 7 * 24 * 60 * 60 * 1000)
      buckets.set(s, 0)
    }
    for (const t of tickets) {
      const s = startOfWeek(t.createdAt)
      if (buckets.has(s)) buckets.set(s, (buckets.get(s) ?? 0) + 1)
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ts, count]) => ({
        label: new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        value: count,
      }))
  }, [tickets])

  const priorityDist = useMemo(() => {
    const map = new Map<TicketPriority, number>()
    for (const t of tickets) map.set(t.priority, (map.get(t.priority) ?? 0) + 1)
    const order: TicketPriority[] = ["Rendah", "Sedang", "Tinggi", "Urgent"]
    return order.map((p) => ({
      name: p,
      value: map.get(p) ?? 0,
      color: PRIORITY_COLOR[p],
    }))
  }, [tickets])

  const ikmRadar = useMemo(() => {
    const grouped = new Map<string, { sum: number; count: number }>()
    for (const f of feedbacks) {
      const cur = grouped.get(f.service) ?? { sum: 0, count: 0 }
      cur.sum += f.rating
      cur.count += 1
      grouped.set(f.service, cur)
    }
    return services.map((s) => {
      const g = grouped.get(s.id)
      return {
        aspek: s.name.replace(/^(Portal|Sistem|Manajemen|Galeri|Ujian)\s+/i, ""),
        skor: g && g.count ? Number((g.sum / g.count).toFixed(2)) : 0,
      }
    })
  }, [feedbacks, services])

  const heatmap = useMemo(() => {
    // hour x day matrix, 24 rows x 7 cols
    const matrix: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0))
    for (const t of tickets) {
      const d = new Date(t.createdAt)
      const hour = d.getHours()
      const day = (d.getDay() + 6) % 7 // Monday=0
      matrix[hour][day] += 1
    }
    let max = 0
    for (const row of matrix) for (const v of row) if (v > max) max = v
    return { matrix, max }
  }, [tickets])

  const cardClass =
    "bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-sm"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Weekly trend */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Tren Tiket / Minggu
            </p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              8 Minggu Terakhir
            </h3>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
            Total {tickets.length}
          </span>
        </div>
        <div className="h-52 -mx-3">
          <ResponsiveContainer>
            <AreaChart data={trend} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/5" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-slate-500 dark:text-slate-400"
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-slate-500 dark:text-slate-400"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "white",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#cbd5e1" }}
              />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#gradBlue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority distribution */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Distribusi Prioritas
            </p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Level Tiket</h3>
          </div>
        </div>
        <div className="h-52 flex items-center">
          <div className="w-1/2 h-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={priorityDist.filter((d) => d.value > 0)}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {priorityDist.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-1/2 space-y-2">
            {priorityDist.map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="font-bold text-slate-700 dark:text-slate-200">{d.name}</span>
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* IKM Radar */}
      <div className={cardClass}>
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Skor IKM per Aspek
          </p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Radar Kepuasan Layanan</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <RadarChart data={ikmRadar}>
              <PolarGrid stroke="currentColor" className="text-slate-300 dark:text-white/10" />
              <PolarAngleAxis
                dataKey="aspek"
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-slate-600 dark:text-slate-300"
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fontSize: 9, fill: "currentColor" }}
                className="text-slate-500 dark:text-slate-400"
              />
              <Radar dataKey="skor" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "white",
                  fontSize: 12,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className={cardClass}>
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Jam Sibuk Laporan
          </p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Heatmap Hari x Jam</h3>
        </div>
        <Heatmap matrix={heatmap.matrix} max={heatmap.max} />
      </div>

      {/* Tickets by department */}
      <div className={`${cardClass} lg:col-span-2`}>
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Distribusi Departemen
          </p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Beban Kerja Tim</h3>
        </div>
        <DepartmentBar tickets={tickets} />
      </div>
    </div>
  )
}

function DepartmentBar({ tickets }: { tickets: Ticket[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tickets) map.set(t.department, (map.get(t.department) ?? 0) + 1)
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [tickets])
  return (
    <div className="h-52 -mx-3">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/5" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-slate-500 dark:text-slate-400"
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "currentColor" }}
            className="text-slate-500 dark:text-slate-400"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "white",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Heatmap({ matrix, max }: { matrix: number[][]; max: number }) {
  const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
  // show only waking hours 6..22 to save space
  const hoursToShow = Array.from({ length: 17 }, (_, i) => i + 6)

  return (
    <div className="flex gap-2">
      <div className="flex flex-col justify-between py-1">
        {hoursToShow
          .filter((_, i) => i % 2 === 0)
          .map((h) => (
            <span key={h} className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
      </div>
      <div className="flex-1 grid grid-rows-[auto_1fr] gap-1">
        <div className="grid grid-cols-7 gap-1 text-[10px] font-bold uppercase text-center text-slate-500 dark:text-slate-400">
          {days.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((_, col) => (
            <div key={col} className="flex flex-col gap-[2px]">
              {hoursToShow.map((hour) => {
                const v = matrix[hour][col] ?? 0
                const intensity = max > 0 ? v / max : 0
                return (
                  <div
                    key={hour}
                    title={`${days[col]} ${String(hour).padStart(2, "0")}:00 — ${v} tiket`}
                    className="rounded-[3px] aspect-[3/1]"
                    style={{
                      background:
                        intensity === 0
                          ? "rgba(148,163,184,0.12)"
                          : `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
