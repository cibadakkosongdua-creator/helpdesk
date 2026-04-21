"use client"

import {
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileDown,
  FileText,
  Filter,
  Flame,
  History,
  Inbox,
  MessageSquare,
  Paperclip,
  Printer,
  Search,
  Settings,
  Shield,
  Star,
  Ticket as TicketIcon,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { AdminSession } from "@/lib/helpdesk/auth-service"
import { exportFeedbacksCSV, exportTicketsCSV, printReport } from "@/lib/helpdesk/csv-export"
import { useSettingsServices } from "@/hooks/use-settings-services"
import {
  deleteTicket,
  subscribeAuditLogs,
  subscribeFeedbacks,
  subscribeTickets,
  updateTicketStatus,
  type AuditLog,
  type Department,
  type Feedback,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/helpdesk/firestore-service"
import { saveSettings } from "@/lib/helpdesk/settings-service"
import { useBrowserNotification } from "@/hooks/use-browser-notification"
import { useSoundAlert } from "@/hooks/use-sound-alert"
import { AISummaryCard } from "./ai-summary-card"
import { AdminSettings } from "./admin-settings"
import { AnalyticsCharts } from "./analytics-charts"
import { TicketDetailDialog } from "./ticket-detail-dialog"
import type { ShowToastFn } from "./types"

type Tab = "tickets" | "analytics" | "surveys" | "audit" | "settings"
type DateRange = "all" | "today" | "7d" | "30d"

export function AdminDashboard({
  showToast,
  admin,
}: {
  showToast: ShowToastFn
  admin: AdminSession | null
}) {
  const settingsServices = useSettingsServices()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [audits, setAudits] = useState<AuditLog[]>([])
  const [tab, setTab] = useState<Tab>("tickets")
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true)

  const [openTicket, setOpenTicket] = useState<Ticket | null>(null)

  // filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all")
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">("all")
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [rangeFilter, setRangeFilter] = useState<DateRange>("all")
  const prevTicketsRef = useRef<Ticket[]>([])
  const { isGranted, requestPermission, showNotification } = useBrowserNotification()
  const { playSound } = useSoundAlert()

  useEffect(() => {
    const unsubT = subscribeTickets((list) => {
      // Check for new tickets
      const prevIds = new Set(prevTicketsRef.current.map(t => t.id))
      const newTickets = list.filter(t => !prevIds.has(t.id) && t.createdAt > Date.now() - 10000) // within 10s
      
      // Show notification for new tickets
      if (newTickets.length > 0 && prevTicketsRef.current.length > 0) {
        showNotification({
          title: `Tiket Baru (${newTickets.length})`,
          body: newTickets.length === 1 
            ? `${newTickets[0].code}: ${newTickets[0].name}`
            : `${newTickets.length} tiket baru masuk`,
          tag: "new-ticket",
        })
        playSound("new-ticket")

        // Send Telegram notification
        fetch("/api/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "new-ticket",
            data: {
              code: newTickets[0].code,
              name: newTickets[0].name,
              service: newTickets[0].service,
              priority: newTickets[0].priority,
              department: newTickets[0].department,
            },
          }),
        }).catch(() => {})
      }
      
      prevTicketsRef.current = list
      setTickets(list)
      setLoadingTickets(false)
    })
    const unsubF = subscribeFeedbacks((list) => {
      setFeedbacks(list)
      setLoadingFeedbacks(false)
    })
    const unsubA = subscribeAuditLogs(setAudits)
    return () => {
      unsubT()
      unsubF()
      unsubA()
    }
  }, [])

  // keep dialog in sync with live data
  useEffect(() => {
    if (!openTicket) return
    const fresh = tickets.find((t) => t.id === openTicket.id)
    if (fresh && fresh !== openTicket) setOpenTicket(fresh)
  }, [tickets, openTicket])

  const stats = useMemo(() => {
    const resolved = tickets.filter((t) => t.status === "Resolved").length
    const open = tickets.filter((t) => t.status === "Open").length
    const urgent = tickets.filter((t) => t.priority === "Urgent" && t.status !== "Resolved").length

    // Hitung rating dari feedbacks (sudah termasuk rating tiket baru)
    const feedbackRatingSum = feedbacks.reduce((a, b) => a + b.rating, 0)
    const feedbackRatingCount = feedbacks.length

    // Untuk backward compatibility: rating lama di tiket yang belum ada di feedbacks
    const feedbackTicketIds = new Set(feedbacks.filter((f) => f.ticketId).map((f) => f.ticketId))
    const oldTicketRatings = tickets.filter(
      (t) => t.rating && t.rating > 0 && !feedbackTicketIds.has(t.id)
    )
    const oldTicketRatingSum = oldTicketRatings.reduce((a, b) => a + (b.rating ?? 0), 0)
    const oldTicketRatingCount = oldTicketRatings.length

    // Gabungkan feedbacks + rating lama
    const totalRatingCount = feedbackRatingCount + oldTicketRatingCount
    const totalRatingSum = feedbackRatingSum + oldTicketRatingSum
    const avgRating =
      totalRatingCount === 0
        ? 0
        : Math.round((totalRatingSum / totalRatingCount) * 10) / 10

    return {
      total: tickets.length,
      resolved,
      open,
      urgent,
      totalRatings: totalRatingCount,
      avgRating,
    }
  }, [tickets, feedbacks])

  // Sync public stats to settings doc (public-readable) for the home page KPI
  useEffect(() => {
    if (loadingTickets || loadingFeedbacks) return
    if (stats.total === 0 && stats.totalRatings === 0) return
    const timeout = setTimeout(() => {
      void saveSettings({
        publicStats: {
          totalTickets: stats.total,
          totalSurveys: stats.totalRatings,
          avgRating: stats.avgRating,
          updatedAt: Date.now(),
        },
      })
    }, 2000) // debounce 2s to avoid rapid writes
    return () => clearTimeout(timeout)
  }, [stats.total, stats.totalRatings, stats.avgRating, loadingTickets, loadingFeedbacks])

  const filteredTickets = useMemo(() => {
    const now = Date.now()
    const rangeStart =
      rangeFilter === "today"
        ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
        : rangeFilter === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : rangeFilter === "30d"
            ? now - 30 * 24 * 60 * 60 * 1000
            : 0
    const q = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (rangeStart && t.createdAt < rangeStart) return false
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
      if (departmentFilter !== "all" && t.department !== departmentFilter) return false
      if (serviceFilter !== "all" && t.service !== serviceFilter) return false
      if (q) {
        const hay = `${t.code} ${t.name} ${t.details} ${t.service}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [tickets, rangeFilter, statusFilter, priorityFilter, departmentFilter, serviceFilter, search])

  const filteredFeedbacks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return feedbacks.filter((f) => {
      if (serviceFilter !== "all" && f.service !== serviceFilter) return false
      if (q) {
        const hay = `${f.service} ${f.feedback}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [feedbacks, serviceFilter, search])

  const handleStatus = async (id: string, status: TicketStatus) => {
    await updateTicketStatus(id, status, admin?.name ?? "admin")
    showToast(`Status tiket diubah ke "${status}".`, "success")
  }

  const serviceName = (id: string) => settingsServices.find((s) => s.id === id)?.name ?? id

  const clearFilters = () => {
    setStatusFilter("all")
    setPriorityFilter("all")
    setDepartmentFilter("all")
    setServiceFilter("all")
    setRangeFilter("all")
    setSearch("")
  }

  const hasActiveFilter =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    departmentFilter !== "all" ||
    serviceFilter !== "all" ||
    rangeFilter !== "all"

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase mb-3">
            <TrendingUp className="w-3.5 h-3.5" /> Admin Panel
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
            Dashboard Rekap Data
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Pantau tiket bantuan dan evaluasi IKM warga sekolah secara real-time.
          </p>
        </div>
        {admin && (
          <div className="inline-flex items-center gap-3 bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-white/10 rounded-2xl px-4 py-2.5 shadow-sm print:hidden">
            {/* Notification toggle */}
            <button
              onClick={requestPermission}
              className={`p-2 rounded-xl transition-colors ${
                isGranted
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
              title={isGranted ? "Notifikasi aktif" : "Aktifkan notifikasi"}
            >
              <Bell className="w-4 h-4" />
            </button>
            {admin.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={admin.photoURL || "/placeholder.svg"}
                alt={admin.name}
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {admin.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-xs font-bold text-slate-900 dark:text-white">{admin.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{admin.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Daily Summary */}
      <AISummaryCard tickets={tickets} feedbacks={feedbacks} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard icon={TicketIcon} label="Total Tiket" value={stats.total} accent="blue" subtitle={`${stats.open} belum ditangani`} />
        <StatCard icon={Flame} label="Urgent Aktif" value={stats.urgent} accent="red" subtitle={stats.urgent > 0 ? "Perlu segera ditangani" : "Tidak ada urgent"} />
        <StatCard icon={CheckCircle2} label="Tiket Selesai" value={stats.resolved} accent="emerald" subtitle={`${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% resolusi`} />
        <StatCard icon={ClipboardCheck} label="Total Rating" value={stats.totalRatings} accent="indigo" subtitle="Survei + Rating Tiket" />
        <StatCard
          icon={Star}
          label="Rata-rata Rating"
          value={stats.avgRating.toFixed(1)}
          suffix="/5"
          accent="amber"
          subtitle={stats.avgRating >= 4 ? "Sangat baik" : stats.avgRating >= 3 ? "Cukup baik" : stats.avgRating > 0 ? "Perlu perbaikan" : "Belum ada data"}
        />
      </div>

      {/* Tabs + quick actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 print:hidden">
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-1.5 inline-flex overflow-x-auto">
          <TabButton active={tab === "tickets"} onClick={() => setTab("tickets")}>
            <TicketIcon className="w-4 h-4" /> Tiket
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10">
              {tickets.length}
            </span>
          </TabButton>
          <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")}>
            <BarChart3 className="w-4 h-4" /> Analitik
          </TabButton>
          <TabButton active={tab === "surveys"} onClick={() => setTab("surveys")}>
            <Star className="w-4 h-4" /> Survei
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10">
              {feedbacks.length}
            </span>
          </TabButton>
          <TabButton active={tab === "audit"} onClick={() => setTab("audit")}>
            <Shield className="w-4 h-4" /> Audit
          </TabButton>
          <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>
            <Settings className="w-4 h-4" /> Pengaturan
          </TabButton>
        </div>

        <div className="flex items-center gap-2">
          {tab === "tickets" && (
            <button
              onClick={() => exportTicketsCSV(filteredTickets, serviceName)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
          {tab === "surveys" && (
            <button
              onClick={() => exportFeedbacksCSV(filteredFeedbacks, serviceName)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
          <button
            onClick={printReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
        </div>
      </div>

      {/* Filters */}
      {(tab === "tickets" || tab === "surveys") && (
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-3 md:p-4 print:hidden">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  tab === "tickets"
                    ? "Cari kode (TKT-XXXX), nama, keluhan..."
                    : "Cari ulasan / layanan..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {tab === "tickets" && (
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip
                  icon={Filter}
                  label="Status"
                  value={statusFilter}
                  options={[
                    { value: "all", label: "Semua Status" },
                    { value: "Open", label: "Open" },
                    { value: "In Progress", label: "In Progress" },
                    { value: "Resolved", label: "Resolved" },
                  ]}
                  onChange={(v) => setStatusFilter(v as any)}
                />
                <FilterChip
                  icon={Flame}
                  label="Prioritas"
                  value={priorityFilter}
                  options={[
                    { value: "all", label: "Semua Prioritas" },
                    { value: "Rendah", label: "Rendah" },
                    { value: "Sedang", label: "Sedang" },
                    { value: "Tinggi", label: "Tinggi" },
                    { value: "Urgent", label: "Urgent" },
                  ]}
                  onChange={(v) => setPriorityFilter(v as any)}
                />
                <FilterChip
                  icon={Shield}
                  label="Dept"
                  value={departmentFilter}
                  options={[
                    { value: "all", label: "Semua Dept" },
                    { value: "IT", label: "IT" },
                    { value: "Akademik", label: "Akademik" },
                    { value: "Kesiswaan", label: "Kesiswaan" },
                    { value: "Sarpras", label: "Sarpras" },
                    { value: "Tata Usaha", label: "Tata Usaha" },
                    { value: "Kepala Sekolah", label: "Kepala Sekolah" },
                  ]}
                  onChange={(v) => setDepartmentFilter(v as any)}
                />
                <FilterChip
                  icon={Inbox}
                  label="Layanan"
                  value={serviceFilter}
                  options={[
                    { value: "all", label: "Semua Layanan" },
                    ...settingsServices.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                  onChange={(v) => setServiceFilter(v)}
                />
                <FilterChip
                  icon={Clock}
                  label="Rentang"
                  value={rangeFilter}
                  options={[
                    { value: "all", label: "Semua Waktu" },
                    { value: "today", label: "Hari Ini" },
                    { value: "7d", label: "7 Hari" },
                    { value: "30d", label: "30 Hari" },
                  ]}
                  onChange={(v) => setRangeFilter(v as DateRange)}
                />
                {hasActiveFilter && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:scale-105 transition-all"
                  >
                    <X className="w-3 h-3" /> Reset
                  </button>
                )}
                <div className="ml-auto text-xs font-bold text-slate-500 dark:text-slate-400">
                  {filteredTickets.length} dari {tickets.length} tiket
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "tickets" &&
        (loadingTickets ? (
          <SkeletonGrid />
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title={hasActiveFilter ? "Tidak ada tiket yang cocok" : "Belum ada tiket"}
            description={
              hasActiveFilter
                ? "Coba kurangi filter atau reset untuk melihat semua tiket."
                : "Tiket dari warga sekolah akan muncul di sini secara real-time dari Firestore."
            }
          />
        ) : (
          <TicketsPanel
            tickets={filteredTickets}
            onStatus={handleStatus}
            onOpen={setOpenTicket}
            serviceName={serviceName}
          />
        ))}

      {tab === "analytics" && <AnalyticsCharts tickets={tickets} feedbacks={feedbacks} services={settingsServices} />}

      {tab === "surveys" &&
        (loadingFeedbacks ? (
          <SkeletonGrid />
        ) : filteredFeedbacks.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Belum ada survei"
            description="Jawaban survei IKM akan muncul di sini secara real-time dari Firestore."
          />
        ) : (
          <SurveysPanel feedbacks={filteredFeedbacks} serviceName={serviceName} />
        ))}

      {tab === "audit" && <AuditPanel audits={audits} />}

      {tab === "settings" && <AdminSettings showToast={showToast} />}

      {openTicket && (
        <TicketDetailDialog
          ticket={openTicket}
          onClose={() => setOpenTicket(null)}
          onDelete={async (id) => {
            await deleteTicket(id, admin?.name ?? "Admin")
            setOpenTicket(null)
            showToast("Tiket berhasil dihapus.", "success")
          }}
          adminName={admin?.name ?? "Admin"}
          showToast={showToast}
        />
      )}
    </div>
  )
}

function FilterChip({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: LucideIcon
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const active = value !== "all"
  const display = options.find((o) => o.value === value)?.label ?? label
  return (
    <div
      className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
      }`}
    >
      <Icon className="w-3.5 h-3.5 opacity-80" />
      <span>{display}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  accent,
  subtitle,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  suffix?: string
  accent: "blue" | "emerald" | "indigo" | "amber" | "red"
  subtitle?: string
}) {
  const accents: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20",
    emerald:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20",
    indigo:
      "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20",
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20",
    red: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20",
  }
  return (
    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${accents[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
        {value}
        {suffix && <span className="text-sm font-semibold text-slate-400 ml-0.5">{suffix}</span>}
      </p>
      {subtitle && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
        active
          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    Open: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20",
    "In Progress":
      "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20",
    Resolved:
      "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20",
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" />
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const styles: Record<TicketPriority, string> = {
    Rendah: "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300",
    Sedang: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    Tinggi: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Urgent: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300",
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${styles[priority]}`}>
      {priority === "Urgent" && <Flame className="w-2.5 h-2.5" />}
      {priority}
    </span>
  )
}

function TicketsPanel({
  tickets,
  onStatus,
  onOpen,
  serviceName,
}: {
  tickets: Ticket[]
  onStatus: (id: string, status: TicketStatus) => void
  onOpen: (t: Ticket) => void
  serviceName: (id: string) => string
}) {
  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-5 py-3">Kode</th>
              <th className="px-5 py-3">Pelapor</th>
              <th className="px-5 py-3">Layanan</th>
              <th className="px-5 py-3">Prioritas</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr
                key={t.id}
                onClick={() => onOpen(t)}
                className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <td className="px-5 py-4">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">{t.code}</div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(t.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                    {t.unreadForAdmin > 0 && (
                      <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">
                        {t.unreadForAdmin} baru
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-900 dark:text-white truncate max-w-[14ch]">{t.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
                </td>
                <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">
                  {serviceName(t.service)}
                  <div className="text-[10px] text-slate-400 mt-0.5">{t.department}</div>
                </td>
                <td className="px-5 py-4">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={t.status} />
                  {t.replyCount > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      <MessageSquare className="w-3 h-3" />
                      {t.replyCount} balasan
                    </div>
                  )}
                  {t.attachments?.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <Paperclip className="w-3 h-3" />
                      {t.attachments.length} lampiran
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <TicketActions id={t.id} status={t.status} onStatus={onStatus} onOpen={() => onOpen(t)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {tickets.map((t) => (
          <button
            key={t.id}
            onClick={() => onOpen(t)}
            className="w-full text-left bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-mono font-bold text-slate-900 dark:text-white">{t.code}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {t.name} &middot; {t.role}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3 line-clamp-2">{t.details}</p>
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(t.createdAt).toLocaleDateString("id-ID")}
                </span>
                {t.replyCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> {t.replyCount}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Buka &rarr;</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function TicketActions({
  id,
  status,
  onStatus,
  onOpen,
}: {
  id: string
  status: TicketStatus
  onStatus: (id: string, status: TicketStatus) => void
  onOpen: () => void
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {status === "Open" && (
        <button
          onClick={() => onStatus(id, "In Progress")}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/20 transition-colors"
        >
          Proses
        </button>
      )}
      {status !== "Resolved" && (
        <button
          onClick={() => onStatus(id, "Resolved")}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
        >
          Resolve
        </button>
      )}
      {status === "Resolved" && (
        <button
          onClick={() => onStatus(id, "Open")}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          Buka Lagi
        </button>
      )}
      <button
        onClick={onOpen}
        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 transition-transform"
      >
        Detail
      </button>
    </div>
  )
}

function SurveysPanel({
  feedbacks,
  serviceName,
}: {
  feedbacks: Feedback[]
  serviceName: (id: string) => string
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {feedbacks.map((f) => (
        <div
          key={f.id}
          className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                {serviceName(f.service)}
              </div>
              {f.ticketCode && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-200/60 dark:border-blue-500/20">
                  <TicketIcon className="w-3 h-3" />
                  {f.ticketCode}
                </div>
              )}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(f.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= f.rating
                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                    : "text-slate-200 dark:text-slate-700"
                }`}
              />
            ))}
            <span className="ml-2 text-xs font-bold text-slate-600 dark:text-slate-300">{f.rating}.0</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {f.feedback || <span className="italic text-slate-400">Tanpa ulasan teks.</span>}
          </p>
        </div>
      ))}
    </div>
  )
}

function AuditPanel({ audits }: { audits: AuditLog[] }) {
  if (audits.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="Belum ada aktivitas audit"
        description="Setiap perubahan status, balasan, dan edit data akan tercatat di sini."
      />
    )
  }
  return (
    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200/60 dark:border-white/5">
        <History className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Log Aktivitas Terakhir ({audits.length})
        </h3>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-white/5">
        {audits.slice(0, 50).map((a) => (
          <li key={a.id} className="flex items-start gap-3 px-5 py-3 text-sm">
            <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-slate-700 dark:text-slate-200">
                <b>{a.actor}</b>
                <span className="text-slate-500 dark:text-slate-400"> · </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{a.action}</span>
                <span className="text-slate-500 dark:text-slate-400"> · </span>
                <span className="font-mono text-xs">{a.target}</span>
              </p>
              {a.meta && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{a.meta}</p>
              )}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
              {new Date(a.createdAt).toLocaleTimeString("id-ID")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-6 animate-pulse relative overflow-hidden"
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" />
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded-full" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded-full" />
              </div>
            </div>
            <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-full" />
          </div>
          <div className="space-y-3">
            <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full" />
            <div className="h-3 w-5/6 bg-slate-100 dark:bg-white/5 rounded-full" />
            <div className="h-3 w-4/6 bg-slate-100 dark:bg-white/5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-dashed border-slate-300 dark:border-white/10 rounded-[2rem] p-12 md:p-16 flex flex-col items-center text-center relative overflow-hidden group">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-700" />
      
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 bg-blue-100 dark:bg-blue-500/20 rounded-3xl rotate-6 group-hover:rotate-12 transition-transform duration-500" />
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-3xl -rotate-6 group-hover:-rotate-12 transition-transform duration-500" />
        <div className="absolute inset-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
          <Icon className="w-10 h-10 text-blue-500 dark:text-blue-400" />
        </div>
      </div>

      <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 relative z-10">
        {title}
      </h3>
      <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-md leading-relaxed relative z-10">
        {description}
      </p>
    </div>
  )
}
