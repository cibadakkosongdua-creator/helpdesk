"use client"

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  MessageCircle,
  Search as SearchIcon,
  Send,
  Sparkles,
  Star,
  Ticket as TicketIcon,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { aiSearchService } from "@/lib/helpdesk/gemini-client"
import { FAQ_DATA, SERVICES, type Service } from "@/lib/helpdesk/data"
import { subscribeSettings, type ServiceStatus, type FaqItem, type ServiceConfig, type AnnouncementConfig, type MaintenanceSchedule } from "@/lib/helpdesk/settings-service"
import { subscribeTicketsByUser, subscribeTicketByCode, type Ticket, type TicketStatus as TStatus } from "@/lib/helpdesk/firestore-service"
import EmergencyContacts from "./emergency-contacts"
import type { ShowToastFn, View } from "./types"
import type { AuthSession } from "@/lib/helpdesk/auth-service"

function getGreeting(name?: string): string {
  const h = new Date().getHours()
  const g = h < 11 ? "Selamat Pagi" : h < 15 ? "Selamat Siang" : h < 18 ? "Selamat Sore" : "Selamat Malam"
  return name ? `${g}, ${name.split(" ")[0]} 👋` : `${g} 👋`
}

/** Animated number count-up dengan easeOutCubic */
function useCountUp(target: number, duration = 1400): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target) { setValue(0); return }
    let rafId: number
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setValue(Math.round(ease * target))
      if (p < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])
  return value
}

export function HomeView({
  setView,
  showToast,
  onTrackTicket,
  user,
}: {
  setView: (v: View) => void
  showToast: ShowToastFn
  onTrackTicket: (code: string) => void
  user?: AuthSession | null
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [trackCode, setTrackCode] = useState("")
  const [serviceStatus, setServiceStatus] = useState<Record<string, ServiceStatus>>({})
  const [faqItems, setFaqItems] = useState<FaqItem[]>(FAQ_DATA)
  const [dynamicServices, setDynamicServices] = useState<ServiceConfig[] | null>(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [announcement, setAnnouncement] = useState<AnnouncementConfig | null>(null)
  const [announcementDismissed, setAnnouncementDismissed] = useState(false)
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>([])
  const [myTickets, setMyTickets] = useState<Ticket[]>([])
  // Public KPI stats from settings (public-readable doc)
  const [publicTickets, setPublicTickets] = useState(0)
  const [publicSurveys, setPublicSurveys] = useState(0)
  const [publicAvgRating, setPublicAvgRating] = useState(0)

  // Animated KPI counters (easeOutCubic, mulai dari 0 saat data masuk)
  const animTickets = useCountUp(publicTickets)
  const animSurveys = useCountUp(publicSurveys)
  const animRatingX10 = useCountUp(Math.round(publicAvgRating * 10))

  const [aiFinding, setAiFinding] = useState(false)
  const [aiResult, setAiResult] = useState<
    | (Service & { explanation: string })
    | { notFound: true; explanation: string; suggestedFaqs?: FaqItem[] }
    | null
  >(null)
  const [redirecting, setRedirecting] = useState<Service | null>(null)
  const clearRedirect = useCallback(() => setRedirecting(null), [])
  const [lastTicket, setLastTicket] = useState<{ code: string; status: string } | null>(null)
  const [lastTicketData, setLastTicketData] = useState<Ticket | null>(null)

  // Load last ticket from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("helpdesk_last_ticket")
      if (stored) setLastTicket(JSON.parse(stored))
    } catch {}
  }, [user?.uid])

  // Subscribe to last ticket realtime untuk dapat unread count
  useEffect(() => {
    if (!lastTicket?.code) return
    const unsub = subscribeTicketByCode(lastTicket.code, (t) => {
      setLastTicketData(t)
      if (t) {
        // Sync status ke localStorage
        try {
          localStorage.setItem("helpdesk_last_ticket", JSON.stringify({ code: t.code, status: t.status }))
          setLastTicket((prev) => prev ? { ...prev, status: t.status } : null)
        } catch {}
      }
    })
    return () => unsub()
  }, [lastTicket?.code])

  // Jika user balik via Back (bfcache restore), tutup overlay jika ada
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setRedirecting(null)
    }
    window.addEventListener("pageshow", handlePageShow)
    return () => window.removeEventListener("pageshow", handlePageShow)
  }, [])

  useEffect(() => {
    // Cek apakah user pernah dismiss announcement ini (by text hash)
    try {
      const dismissed = localStorage.getItem("hd_ann_dismissed")
      if (dismissed) setAnnouncementDismissed(true)
    } catch { /* ignore */ }
  }, [])

  // Subscribe tiket milik user yang sedang login
  useEffect(() => {
    if (!user?.uid) { setMyTickets([]); return }
    const unsub = subscribeTicketsByUser(user.uid, (tickets) => {
      setMyTickets(tickets.slice(0, 5)) // max 5 terbaru
    })
    return () => unsub()
  }, [user?.uid])

  useEffect(() => {
    const unsub = subscribeSettings((s) => {
      if (Object.keys(s.serviceStatus).length > 0) setServiceStatus(s.serviceStatus)
      if (s.faq.length > 0) setFaqItems(s.faq)
      if (s.services.length > 0) setDynamicServices(s.services)
      // Announcement & maintenance
      setAnnouncement(s.announcement ?? null)
      setMaintenanceSchedules(s.maintenanceSchedules ?? [])
      // Reset dismiss jika teks pengumuman berubah
      if (s.announcement?.text) {
        const key = `hd_ann_${s.announcement.text.slice(0, 20)}`
        const wasDismissed = localStorage.getItem("hd_ann_dismissed")
        if (wasDismissed && wasDismissed !== key) {
          setAnnouncementDismissed(false)
          localStorage.removeItem("hd_ann_dismissed")
        }
      }
      // Read public stats from settings doc
      if (s.publicStats) {
        setPublicTickets(s.publicStats.totalTickets ?? 0)
        setPublicSurveys(s.publicStats.totalSurveys ?? 0)
        setPublicAvgRating(s.publicStats.avgRating ?? 0)
      }
      setSettingsLoaded(true)
    })
    return () => unsub()
  }, [])

  // Merge dynamic services with static icon map
  const displayServices: Service[] = dynamicServices
    ? dynamicServices.map((ds) => {
        const match = SERVICES.find((s) => s.id === ds.id)
        return { ...ds, icon: match?.icon ?? AlertCircle }
      })
    : SERVICES

  // Auto-override serviceStatus berdasarkan jadwal maintenance aktif
  const effectiveStatus = { ...serviceStatus }
  const now = Date.now()
  for (const schedule of maintenanceSchedules) {
    if (now >= schedule.from && now <= schedule.to) {
      effectiveStatus[schedule.serviceId] = "maintenance"
    }
  }

  // Sort: online → maintenance → offline
  const sortedServices = [...displayServices].sort((a, b) => {
    const order: Record<string, number> = { online: 0, maintenance: 1, offline: 2 }
    const sa = effectiveStatus[a.id] ?? 'online'
    const sb = effectiveStatus[b.id] ?? 'online'
    return (order[sa] ?? 0) - (order[sb] ?? 0)
  })

  const dismissAnnouncement = () => {
    setAnnouncementDismissed(true)
    try {
      const key = `hd_ann_${announcement?.text?.slice(0, 20) ?? ""}`
      localStorage.setItem("hd_ann_dismissed", key)
    } catch { /* ignore */ }
  }

  const showAnnouncement = announcement?.active && announcement.text && !announcementDismissed

  const handleFindService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setAiFinding(true)
    setAiResult(null)
    try {
      const { serviceId, explanation } = await aiSearchService(searchQuery)
      const svc = serviceId ? SERVICES.find((s) => s.id === serviceId) : null
      if (svc) {
        setAiResult({ ...svc, explanation })
      } else {
        const keywords = searchQuery.toLowerCase().split(/\s+/)
        const suggestions = faqItems.filter((faq) => {
          const content = `${faq.question} ${faq.answer}`.toLowerCase()
          return keywords.some((kw) => kw.length > 3 && content.includes(kw))
        }).slice(0, 2)

        setAiResult({
          notFound: true,
          explanation:
            explanation ||
            "Saya belum menemukan layanan yang cocok. Silakan buat tiket kendala agar tim kami membantu langsung.",
          suggestedFaqs: suggestions.length > 0 ? suggestions : undefined,
        })
      }
    } catch (err) {
      setAiResult({
        notFound: true,
        explanation: "Asisten AI tidak merespons. Silakan coba lagi atau gunakan menu Lapor Kendala.",
      })
    } finally {
      setAiFinding(false)
    }
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
      {/* Announcement Banner */}
      {showAnnouncement && (
        <div className={`relative rounded-2xl px-5 py-4 border animate-in fade-in slide-in-from-top-4 duration-500 ${
          announcement.type === "info" ? "bg-blue-50/80 dark:bg-blue-500/10 text-blue-800 dark:text-blue-200 border-blue-200/80 dark:border-blue-500/20"
          : announcement.type === "warning" ? "bg-amber-50/80 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-200/80 dark:border-amber-500/20"
          : "bg-emerald-50/80 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-200/80 dark:border-emerald-500/20"
        }`}>
          <div className="flex items-start gap-3">
            <div className={`shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
              announcement.type === "info" ? "bg-blue-500" : announcement.type === "warning" ? "bg-amber-500" : "bg-emerald-500"
            }`}>
              {announcement.type === "info" ? "i" : announcement.type === "warning" ? "!" : "✓"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-relaxed">{announcement.text}</p>
              {announcement.link && (
                <a
                  href={announcement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs font-bold underline underline-offset-2 hover:no-underline transition-all"
                >
                  {announcement.linkLabel || "Selengkapnya →"}
                </a>
              )}
            </div>
            <button
              onClick={dismissAnnouncement}
              className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-current opacity-60 hover:opacity-100"
              aria-label="Tutup pengumuman"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          {/* Greeting — selalu tampil, nama hanya jika login */}
          <p className="text-lg md:text-xl font-semibold text-slate-700 dark:text-slate-300 animate-in fade-in slide-in-from-left-4 duration-500">
            {getGreeting(user?.name ?? undefined)}
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sistem Terpadu &middot; v2.0</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-balance">
            <span className="text-slate-900 dark:text-white">Ekosistem Digital </span>
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">SDN 02 Cibadak.</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg max-w-xl leading-relaxed text-pretty">
            Akses seluruh portal layanan informasi, administrasi, dan pembelajaran dalam satu pusat kontrol cerdas.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full md:w-fit">
          <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{displayServices.length} Layanan Aktif</span>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
            <KpiCard
              value={animTickets}
              empty={settingsLoaded && !publicTickets}
              label="Tiket"
              color="text-blue-600 dark:text-blue-400"
            />
            <KpiCard
              value={animSurveys}
              empty={settingsLoaded && !publicSurveys}
              label="Survei"
              color="text-indigo-600 dark:text-indigo-400"
            />
            <KpiCard
              value={animRatingX10}
              empty={settingsLoaded && !publicAvgRating}
              label="Rating"
              color="text-amber-600 dark:text-amber-400"
              suffix="/5"
              divisor={10}
            />
          </div>
        </div>
      </section>

      {/* Last Ticket Widget — hanya muncul jika ada tiket terakhir di localStorage */}
      {lastTicket && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/60 dark:border-white/10 shadow-sm">
            <div className="relative w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
              <TicketIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {/* Unread badge */}
              {lastTicketData && lastTicketData.unreadForReporter > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center px-1 text-[9px] font-black bg-red-500 text-white rounded-full shadow-lg shadow-red-500/40 animate-in zoom-in duration-300">
                  {lastTicketData.unreadForReporter > 9 ? "9+" : lastTicketData.unreadForReporter}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tiket Terakhir Saya</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{lastTicket.code}</p>
              {lastTicketData && lastTicketData.unreadForReporter > 0 && (
                <p className="text-[10px] font-bold text-red-500 dark:text-red-400 mt-0.5 animate-pulse">
                  {lastTicketData.unreadForReporter} pesan baru dari admin
                </p>
              )}
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              lastTicket.status === "Resolved"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20"
                : lastTicket.status === "In Progress"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20"
            }`}>
              {lastTicket.status === "Resolved" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {lastTicket.status}
            </span>
            <a
              href={`/tiket/${lastTicket.code}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shrink-0 ${
                lastTicketData && lastTicketData.unreadForReporter > 0
                  ? "bg-red-500 text-white shadow-sm shadow-red-500/30"
                  : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
              {lastTicketData && lastTicketData.unreadForReporter > 0 ? "Lihat Balasan" : "Lacak"}
            </a>
          </div>
        </div>
      )}

      {/* AI Smart Search */}
      <form onSubmit={handleFindService} className="relative group z-20">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Sparkles
            className={`w-5 h-5 ${aiFinding ? "text-blue-500 animate-pulse" : "text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500"} transition-colors`}
          />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tanya AI: 'Saya ingin meminjam buku bacaan...'"
          className="w-full bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl pl-12 pr-28 md:pr-36 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 transition-all font-medium shadow-sm"
        />
        <button
          type="submit"
          disabled={aiFinding || !searchQuery.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs md:text-sm font-bold px-3 md:px-4 py-2 md:py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center"
        >
          {aiFinding ? (
            <span className="w-4 h-4 border-2 border-slate-400/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
          ) : (
            "Cari AI"
          )}
        </button>
      </form>

      {aiResult && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 -mt-6">
          {"notFound" in aiResult ? (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-300">Layanan Tidak Ditemukan</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    {aiResult.explanation}
                  </p>
                  <button
                    onClick={() => {
                      setAiResult(null)
                      setView("ticket")
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 hover:scale-[1.02] active:scale-95 transition-all shadow-sm shadow-amber-500/20"
                  >
                    Buat Tiket Baru <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline FAQ Suggestions */}
              {aiResult.suggestedFaqs && aiResult.suggestedFaqs.length > 0 && (
                <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <SearchIcon className="w-4 h-4 text-blue-500" />
                    Mungkin Ini Yang Anda Cari?
                  </h4>
                  <div className="space-y-3">
                    {aiResult.suggestedFaqs.map((faq) => (
                      <div key={faq.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{faq.question}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-md border border-blue-200/60 dark:border-blue-500/20 rounded-2xl p-1 shadow-lg dark:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]">
              <div className="bg-white/70 dark:bg-slate-900/60 rounded-[14px] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                    <aiResult.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-lg text-slate-900 dark:text-white">{aiResult.name}</h4>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider rounded-full">
                        Rekomendasi AI
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm">{aiResult.explanation}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRedirecting(aiResult as Service)}
                  className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-colors text-center shrink-0 shadow-md shadow-blue-500/30"
                >
                  Buka Portal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tiket Saya — muncul jika user login */}
      {user && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TicketIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tiket Saya</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {myTickets.length}
              </span>
            </div>
            <button
              onClick={() => document.getElementById("lacak-tiket")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Lacak Tiket Lain
            </button>
          </div>
          {myTickets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <TicketIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum ada tiket</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Buat tiket pertama Anda melalui layanan di bawah ini. Semua tiket akan muncul di sini.
              </p>
            </div>
          ) : (
          <div className="space-y-2">
            {myTickets.map((t) => {
              const statusStyle: Record<TStatus, string> = {
                "Open": "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20",
                "In Progress": "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20",
                "Resolved": "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20",
              }
              return (
                <button
                  key={t.id}
                  onClick={() => onTrackTicket(t.code)}
                  className="w-full flex items-center gap-4 bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-white/5 rounded-2xl px-5 py-4 hover:border-blue-300 dark:hover:border-blue-500/30 hover:shadow-md transition-all group text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{t.code}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle[t.status]}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {t.status}
                      </span>
                      {t.unreadForReporter > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {t.unreadForReporter} baru
                        </span>
                      )}
                      {t.rating && (
                        <span className="inline-flex items-center gap-0.5 text-amber-500">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= t.rating! ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
                          ))}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{t.details}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(t.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span>&middot;</span>
                      <span>{t.service}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                </button>
              )
            })}
          </div>
          )}
        </section>
      )}

      {/* Bento Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Portal Layanan
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sembilan sub-sistem yang terintegrasi penuh.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {!settingsLoaded ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden min-h-[200px] flex flex-col justify-between"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="absolute inset-0 animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-slate-100/80 dark:via-white/[0.06] to-transparent" />
                <div className="flex justify-between items-start relative z-10">
                  <div className="w-12 h-12 bg-slate-200/80 dark:bg-white/10 rounded-2xl animate-pulse" />
                  <div className="h-5 w-20 bg-slate-200/80 dark:bg-white/10 rounded-full animate-pulse" />
                </div>
                <div className="relative z-10 mt-6 space-y-3">
                  <div className="h-5 w-3/5 bg-slate-200/60 dark:bg-white/[0.07] rounded-full animate-pulse" />
                  <div className="h-3 w-4/5 bg-slate-100/80 dark:bg-white/[0.04] rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                  <div className="h-3 w-full bg-slate-100/80 dark:bg-white/[0.04] rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            ))
          ) : sortedServices.map((service, index) => {
            const status: ServiceStatus = effectiveStatus[service.id] ?? "online"
            const statusConfig: Record<ServiceStatus, { label: string; dotClass: string; bgClass: string; textClass: string; glowClass: string }> = {
              online: {
                label: "Online",
                dotClass: "bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]",
                bgClass: "bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20",
                textClass: "text-emerald-700 dark:text-emerald-400",
                glowClass: "from-emerald-500/[0.07] dark:from-emerald-400/[0.09]",
              },
              offline: {
                label: "Offline",
                dotClass: "bg-slate-400 dark:bg-slate-500",
                bgClass: "bg-slate-50/80 dark:bg-slate-500/10 border-slate-200/60 dark:border-slate-500/20",
                textClass: "text-slate-600 dark:text-slate-400",
                glowClass: "from-slate-400/[0.05] dark:from-slate-400/[0.05]",
              },
              maintenance: {
                label: "Maintenance",
                dotClass: "bg-amber-500 dark:bg-amber-400 animate-pulse",
                bgClass: "bg-amber-50/80 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20",
                textClass: "text-amber-700 dark:text-amber-400",
                glowClass: "from-amber-500/[0.07] dark:from-amber-400/[0.09]",
              },
            }
            const sc = statusConfig[status]
            return (
            <button
              key={service.id}
              onClick={() => {
                if (status === "offline") return
                setRedirecting(service)
              }}
              style={{ animationDelay: `${index * 90}ms`, animationFillMode: "both" }}
              className={`group relative bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/80 dark:border-white/5 rounded-[2rem] p-6 shadow-sm hover:shadow-xl dark:shadow-none dark:hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.15)] hover:border-slate-300 dark:hover:border-blue-500/30 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 overflow-hidden flex flex-col justify-between min-h-[200px] animate-in fade-in slide-in-from-bottom-4 text-left ${status === "offline" ? "opacity-60 pointer-events-none" : ""}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-500/5 dark:to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex justify-between items-start relative z-10">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:border-blue-100 dark:group-hover:border-blue-500/20 transition-colors duration-500">
                  <service.icon className="w-6 h-6 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
                <div className={`flex items-center gap-1.5 backdrop-blur-sm px-2.5 py-1 rounded-full border ${sc.bgClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dotClass}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${sc.textClass}`}>
                    {sc.label}
                  </span>
                </div>
              </div>
              <div className="relative z-10 mt-6">
                <h3 className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {service.name}
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-1">
                  {service.url}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{service.description}</p>
              </div>
              {/* Subtle bottom status glow */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-20 pointer-events-none bg-gradient-to-t ${sc.glowClass} to-transparent rounded-b-[2rem] transition-opacity duration-500`}
              />
              {/* Service icon watermark — tekstur sangat halus di pojok kanan bawah */}
              <div className="absolute bottom-3 right-3 pointer-events-none select-none">
                <service.icon
                  className="w-14 h-14 text-slate-900/[0.04] dark:text-white/[0.03] group-hover:text-slate-900/[0.07] dark:group-hover:text-white/[0.06] transition-all duration-500"
                  strokeWidth={1}
                />
              </div>
            </button>
          )
          })}
        </div>
      </section>

      {/* Lacak Tiket */}
      <section id="lacak-tiket" className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-md p-6 md:p-8 shadow-sm scroll-mt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-3">
              <SearchIcon className="w-3 h-3" /> Cek Status Tiket
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Punya kode tiket? Lacak di sini.
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Masukkan kode tiket (contoh: <span className="font-mono font-semibold">TKT-8F2A</span>) untuk melihat status, balasan, dan progres tindak lanjut.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const code = trackCode.trim().toUpperCase()
              if (!code) return
              onTrackTicket(code)
            }}
            className="flex gap-2 w-full md:w-auto"
          >
            <input
              type="text"
              value={trackCode}
              onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
              placeholder="TKT-XXXX"
              aria-label="Kode tiket"
              className="flex-1 md:w-64 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
            <button
              type="submit"
              disabled={!trackCode.trim()}
              className="px-5 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              Lacak
            </button>
          </form>
        </div>
      </section>

      {/* Emergency Contacts */}
      <EmergencyContacts />

      {/* Quick Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setView("/lapor")}
          className="group text-left bg-gradient-to-br from-slate-900 to-slate-800 dark:from-blue-600 dark:to-indigo-700 text-white rounded-3xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] overflow-hidden relative"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3 h-3" /> Butuh Bantuan?
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight mb-2">Lapor Kendala Sekarang</h3>
            <p className="text-sm text-white/70 max-w-md">
              Login dengan akun Google untuk membuat tiket. Tim IT & admin siap menindaklanjuti dalam 1x24 jam kerja.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 font-bold text-sm group-hover:gap-3 transition-all">
              Buat Tiket <Send className="w-4 h-4" />
            </div>
          </div>
        </button>

        <button
          onClick={() => setView("/survei")}
          className="group text-left bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-xl transition-all hover:scale-[1.02] overflow-hidden relative"
        >
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3 h-3" /> Bantu Kami
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight mb-2 text-slate-900 dark:text-white">
              Isi Survei Kepuasan
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Suara Anda penting untuk peningkatan kualitas layanan ekosistem sekolah.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white group-hover:gap-3 transition-all">
              Isi Survei IKM <Send className="w-4 h-4" />
            </div>
          </div>
        </button>
      </section>

      {/* FAQ */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
            <MessageCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Pertanyaan Populer
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Solusi cepat untuk kendala umum yang sering ditanyakan.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {!settingsLoaded ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/5 rounded-2xl p-5 animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="h-4 w-3/5 bg-slate-200 dark:bg-white/10 rounded-full" />
                  <div className="w-7 h-7 bg-slate-200 dark:bg-white/10 rounded-full" />
                </div>
              </div>
            ))
          ) : faqItems.map((faq, index) => (
            <FaqItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      {/* Redirect Loading Overlay — at root level to avoid clipping */}
      {redirecting && (
        <PortalRedirectOverlay
          service={redirecting}
          onDone={clearRedirect}
        />
      )}
    </div>
  )
}

/** KPI card kecil di hero — menampilkan angka animasi dari useCountUp */
function KpiCard({
  value,
  empty,
  label,
  color,
  suffix,
  divisor = 1,
}: {
  value: number
  empty: boolean
  label: string
  color: string
  suffix?: string
  divisor?: number
}) {
  const display = divisor > 1 ? (value / divisor).toFixed(1) : value
  return (
    <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm text-center">
      <p className={`text-2xl font-extrabold tabular-nums ${color}`}>
        {empty ? "—" : value === 0 ? <span className="opacity-30 text-slate-400">0</span> : (
          <>
            {display}
            {suffix && value > 0 && <span className="text-sm font-semibold text-slate-400">{suffix}</span>}
          </>
        )}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div
      className={`bg-white dark:bg-slate-900/40 backdrop-blur-md border rounded-2xl transition-all duration-300 overflow-hidden ${
        isOpen
          ? "border-blue-300 dark:border-blue-500/40 shadow-md dark:shadow-[0_0_20px_-5px_rgba(59,130,246,0.15)]"
          : "border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
      >
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 pr-6 text-sm md:text-base">{question}</h4>
        <div
          className={`shrink-0 p-1.5 rounded-full transition-transform duration-300 ${
            isOpen
              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rotate-180"
              : "bg-slate-50 dark:bg-slate-800 text-slate-400"
          }`}
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <p className="p-5 pt-0 text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-800/50 mt-2">
            {answer}
          </p>
        </div>
      </div>
    </div>
  )
}

function PortalRedirectOverlay({
  service,
  onDone,
}: {
  service: Service
  onDone: () => void
}) {
  // CSS transition: mulai 0% lalu langsung ke 100% lewat state
  const [started, setStarted] = useState(false)
  const duration = 700

  useEffect(() => {
    // Trigger CSS transition pada frame berikutnya
    const frame = requestAnimationFrame(() => setStarted(true))

    // Navigasi setelah durasi animasi selesai
    const timer = setTimeout(() => {
      window.open(`https://${service.url}`, "_blank", "noopener,noreferrer")
      onDone()
    }, duration)

    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDone() }
    window.addEventListener("keydown", handleKey)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      window.removeEventListener("keydown", handleKey)
    }
  }, [service.url, onDone])

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex flex-col items-center gap-5 w-80">
            <div className="relative">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                <service.icon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="absolute -inset-1.5 border-[3px] border-blue-500/30 border-t-blue-500 rounded-2xl animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Membuka {service.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                {service.url}
              </p>
            </div>
            {/* Progress bar — CSS transition, tidak bergantung rAF */}
            <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all ease-linear"
                style={{
                  width: started ? "100%" : "0%",
                  transitionDuration: `${duration}ms`,
                }}
              />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Menghubungkan ke {service.name}...
            </p>
          </div>
        </div>
        <button
          onClick={onDone}
          className="text-sm text-white/60 hover:text-white/90 transition-colors"
        >
          Batal
        </button>
      </div>
    </div>,
    document.body
  )
}

