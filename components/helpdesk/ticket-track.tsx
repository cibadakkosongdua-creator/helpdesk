"use client"

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Search,
  Share2,
  Star,
  Ticket as TicketIcon,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { SERVICES } from "@/lib/helpdesk/data"
import {
  markTicketRead,
  rateTicket,
  subscribeTicketByCode,
  type Ticket,
  type TicketStatus,
} from "@/lib/helpdesk/firestore-service"
import { ReplyThread } from "./reply-thread"

export function TicketTrack({ code }: { code: string }) {
  const normalized = code.toUpperCase().trim()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [reporterName, setReporterName] = useState("")
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeTicketByCode(normalized, (t) => {
      setTicket(t)
      setLoading(false)
      if (t?.id && !t.id.startsWith("LOCAL-")) {
        void markTicketRead(t.id, "reporter")
      }
      if (t?.name && !reporterName) setReporterName(t.name)
    })
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized])

  const service = useMemo(
    () => (ticket ? SERVICES.find((s) => s.id === ticket.service) : null),
    [ticket],
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55%] h-[55%] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[140px]" />
      </div>

      <header className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">Beranda</Link>
            <span>/</span>
            <span>Lacak Tiket</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400">{normalized || "Cari"}</span>
          </nav>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
          <Search className="w-3.5 h-3.5" />
          Pelacakan Tiket Publik
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mengambil data tiket <span className="font-bold">{normalized}</span>...
            </p>
          </div>
        ) : !ticket ? (
          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-12 flex flex-col items-center text-center mt-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <TicketIcon className="w-7 h-7 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Tiket tidak ditemukan</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
              Kode <span className="font-mono font-bold">{normalized}</span> tidak cocok
              dengan tiket aktif. Pastikan kode sudah benar (contoh:{" "}
              <span className="font-mono">TKT-8F2A</span>) atau buat tiket baru.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:scale-105 active:scale-95 transition-all"
            >
              <TicketIcon className="w-4 h-4" /> Buat Tiket Baru
            </Link>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header card */}
            <section className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-6 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold tracking-widest uppercase mb-3">
                    <TicketIcon className="w-3 h-3" /> Kode Tiket
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-mono">
                    {ticket.code}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <ElapsedTime createdAt={ticket.createdAt} />
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={ticket.status} />
                  <button
                    onClick={handleShare}
                    title="Salin link tiket"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                      copied
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20"
                        : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    {copied ? "Tersalin!" : "Bagikan"}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetaCell label="Pelapor" value={ticket.name} sub={ticket.role} />
                <MetaCell
                  label="Layanan"
                  value={service?.name ?? ticket.service}
                  sub={service?.url}
                />
                <MetaCell label="Prioritas" value={ticket.priority} accent="amber" />
                <MetaCell label="Departemen" value={ticket.department} accent="indigo" />
              </div>

              <div className="mt-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Keluhan Awal
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 rounded-2xl p-4">
                  {ticket.details}
                </p>
              </div>

              {ticket.attachments?.length > 0 && (
                <div className="mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Lampiran ({ticket.attachments.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((a, i) => (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[160px]">{a.name}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Status timeline */}
            <StatusTimeline status={ticket.status} createdAt={ticket.createdAt} />

            {/* Rating (hanya muncul jika Resolved) */}
            {ticket.status === "Resolved" && (
              <TicketRating ticket={ticket} />
            )}

            {/* Reply thread */}
            <section className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-5 md:p-6 shadow-sm">
              <div className="mb-3">
                <div className="flex items-center justify-between w-full md:w-1/2 mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                    Nama Anda (pelapor)
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                    <Lock className="w-2.5 h-2.5" /> Dikunci
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={ticket.name}
                  className="w-full md:w-1/2 cursor-not-allowed opacity-70 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white select-none transition-all font-medium"
                />
              </div>
              <ReplyThread
                ticket={ticket}
                as="reporter"
                authorName={reporterName || ticket.name}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function StatusPill({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    Open: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20",
    "In Progress":
      "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20",
    Resolved:
      "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20",
  }
  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold border ${styles[status]}`}
    >
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      {status}
    </span>
  )
}

function MetaCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: "amber" | "indigo"
}) {
  const border =
    accent === "amber"
      ? "border-amber-200/60 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5"
      : accent === "indigo"
        ? "border-indigo-200/60 dark:border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-500/5"
        : "border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40"
  return (
    <div className={`p-3 rounded-2xl border ${border}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{sub}</p>}
    </div>
  )
}

function StatusTimeline({
  status,
  createdAt,
}: {
  status: TicketStatus
  createdAt: number
}) {
  const steps: { key: TicketStatus; label: string; color: string; ringColor: string; bgDone: string; bgPending: string }[] = [
    {
      key: "Open",
      label: "Tiket Diterima",
      color: "text-amber-600 dark:text-amber-400",
      ringColor: "border-amber-400 dark:border-amber-500",
      bgDone: "bg-amber-500 border-amber-500 text-white",
      bgPending: "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-400",
    },
    {
      key: "In Progress",
      label: "Sedang Diproses",
      color: "text-blue-600 dark:text-blue-400",
      ringColor: "border-blue-400 dark:border-blue-500",
      bgDone: "bg-blue-600 border-blue-600 text-white",
      bgPending: "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-400",
    },
    {
      key: "Resolved",
      label: "Terselesaikan",
      color: "text-emerald-600 dark:text-emerald-400",
      ringColor: "border-emerald-400 dark:border-emerald-500",
      bgDone: "bg-emerald-500 border-emerald-500 text-white",
      bgPending: "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-400",
    },
  ]
  const currentIdx = steps.findIndex((s) => s.key === status)
  const progressPct = status === "Open" ? 25 : status === "In Progress" ? 65 : 100
  const progressColor = status === "Open" ? "bg-amber-500" : status === "In Progress" ? "bg-blue-500" : "bg-emerald-500"

  return (
    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Progres Penanganan
        </p>
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{progressPct}%</span>
      </div>
      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full mb-5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <ol className="flex items-start gap-2">
        {steps.map((s, i) => {
          const done = i <= currentIdx
          const isActive = i === currentIdx
          return (
            <li key={s.key} className="flex-1 flex flex-col items-center text-center gap-2">
              <div className="w-full flex items-center gap-2">
                {i > 0 && (
                  <span
                    className={`flex-1 h-[2px] rounded-full transition-all duration-700 ${
                      done ? (i <= currentIdx ? steps[i - 1].bgDone.includes("emerald") ? "bg-emerald-500" : steps[i - 1].bgDone.includes("blue") ? "bg-blue-500" : "bg-amber-500" : "bg-emerald-500") : "bg-slate-200 dark:bg-white/10"
                    }`}
                  />
                )}
                <div
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                    done ? s.bgDone : s.bgPending
                  } ${isActive ? "ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 " + s.ringColor : ""}`}
                >
                  {done ? (
                    <CheckCircle2 className={`w-4 h-4 ${isActive ? "animate-bounce-short" : ""}`} />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  {/* Animated pulse ring for active step */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-current" />
                  )}
                </div>
                {i < steps.length - 1 && (
                  <span
                    className={`flex-1 h-[2px] rounded-full transition-all duration-700 ${
                      i < currentIdx ? (s.bgDone.includes("emerald") ? "bg-emerald-500" : s.bgDone.includes("blue") ? "bg-blue-500" : "bg-amber-500") : "bg-slate-200 dark:bg-white/10"
                    }`}
                  />
                )}
              </div>
              <div>
                <p
                  className={`text-xs font-bold transition-colors ${
                    done ? s.color : "text-slate-400"
                  }`}
                >
                  {s.label}
                </p>
                {i === 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {new Date(createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function TicketRating({ ticket }: { ticket: Ticket }) {
  const [hover, setHover] = useState(0)
  const [selected, setSelected] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Jika sudah pernah rating
  if (ticket.rating || submitted) {
    const rating = ticket.rating || selected
    return (
      <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-emerald-200/80 dark:border-emerald-500/20 rounded-[2rem] p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Terima kasih atas penilaian Anda!</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Rating Anda membantu kami meningkatkan layanan.</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-6 h-6 ${star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"}`}
            />
          ))}
          <span className="ml-2 text-sm font-bold text-slate-700 dark:text-slate-200">{rating}/5</span>
        </div>
        {(ticket.ratingComment || comment) && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3 border border-slate-200/60 dark:border-white/5">
            &ldquo;{ticket.ratingComment || comment}&rdquo;
          </p>
        )}
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      await rateTicket(ticket.id, selected, comment)
      setSubmitted(true)
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-amber-200/60 dark:border-amber-500/20 rounded-[2rem] p-5 md:p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        Beri Penilaian
      </p>
      <p className="text-sm text-slate-700 dark:text-slate-200 mb-4">
        Tiket Anda telah diselesaikan. Bagaimana pengalaman Anda dengan layanan kami?
      </p>

      {/* Stars */}
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setSelected(star)}
            className="p-1 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:scale-125 active:scale-95 transition-all duration-200"
          >
            <Star
              className={`w-8 h-8 transition-all duration-200 ${
                star <= (hover || selected)
                  ? "text-amber-400 fill-amber-400 scale-110"
                  : "text-slate-300 dark:text-slate-600"
              }`}
            />
          </button>
        ))}
        {selected > 0 && (
          <span className="ml-2 text-sm font-bold text-amber-600 dark:text-amber-400 animate-in fade-in duration-200">
            {selected === 1 ? "Buruk" : selected === 2 ? "Kurang" : selected === 3 ? "Cukup" : selected === 4 ? "Baik" : "Sangat Baik"}
          </span>
        )}
      </div>

      {/* Comment */}
      {selected > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <textarea
            rows={2}
            placeholder="Tulis komentar (opsional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full resize-none bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all mb-3"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Star className="w-4 h-4" />
            )}
            Kirim Penilaian
          </button>
        </div>
      )}
    </div>
  )
}

function ElapsedTime({ createdAt }: { createdAt: number }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const diffMs = Date.now() - createdAt
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  let label: string
  const dateStr = new Date(createdAt).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  if (diffMins < 1) label = "Baru saja dibuat"
  else if (diffMins < 60) label = `${diffMins} menit lalu`
  else if (diffHours < 24) label = `${diffHours} jam ${diffMins % 60} menit lalu`
  else label = `${diffDays} hari lalu — ${dateStr}`

  return <span title={dateStr}>{label}</span>
}
