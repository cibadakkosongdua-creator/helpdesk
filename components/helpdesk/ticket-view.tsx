"use client"

import * as Select from "@radix-ui/react-select"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Flame,
  Lock,
  LogIn,
  Plus,
  Search,
  Send,
  Sparkles,
  Ticket as TicketIcon,
  MessageCircle,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useSettingsServices } from "@/hooks/use-settings-services"
import {
  findRecentTicketsByService,
  saveTicket,
  subscribeTicketsByUser,
  type Attachment,
  type Department,
  type Ticket,
  type TicketPriority,
} from "@/lib/helpdesk/firestore-service"
import { aiAnalyzeTicket, aiDuplicateCheck } from "@/lib/helpdesk/gemini-client"
import { signInWithGoogle, type AuthSession } from "@/lib/helpdesk/auth-service"
import { useSoundEffect } from "@/lib/helpdesk/use-sound"
import { AttachmentUpload, type PendingFile } from "./attachment-upload"
import type { ShowToastFn } from "./types"
import { VoiceInput } from "./voice-input"

const PRIORITIES: { value: TicketPriority; label: string; tone: string }[] = [
  { value: "Rendah", label: "Rendah", tone: "text-slate-500" },
  { value: "Sedang", label: "Sedang", tone: "text-blue-600 dark:text-blue-400" },
  { value: "Tinggi", label: "Tinggi", tone: "text-amber-600 dark:text-amber-400" },
  { value: "Urgent", label: "Urgent", tone: "text-red-600 dark:text-red-400" },
]

const DEPARTMENTS: Department[] = [
  "IT",
  "Akademik",
  "Kesiswaan",
  "Sarpras",
  "Tata Usaha",
  "Kepala Sekolah",
]

const DRAFT_KEY = "helpdesk_ticket_draft"

export function TicketView({
  showToast,
  onTrackTicket,
  user,
}: {
  showToast: ShowToastFn
  onTrackTicket?: (code: string) => void
  user: AuthSession | null
}) {
  const settingsServices = useSettingsServices()
  const [loginLoading, setLoginLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiTip, setAiTip] = useState("")
  const [duplicate, setDuplicate] = useState<{ codes: string[]; reason: string } | null>(null)
  const [created, setCreated] = useState<Ticket | null>(null)
  const [copied, setCopied] = useState(false)
  const [myTickets, setMyTickets] = useState<Ticket[]>([])
  const { playChime } = useSoundEffect()

  const [formData, setFormData] = useState({
    name: "",
    role: "Siswa",
    service: "perpus",
    details: "",
    priority: "Sedang" as TicketPriority,
    department: "IT" as Department,
    attachments: [] as Attachment[],
    website: "",
  })
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [draftSaved, setDraftSaved] = useState(false)

  // Load draft on mount (after hydration)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({
          ...prev,
          role: parsed.role ?? prev.role,
          service: parsed.service ?? prev.service,
          details: parsed.details ?? prev.details,
          priority: parsed.priority ?? prev.priority,
          department: parsed.department ?? prev.department,
        }))
      }
    } catch { /* ignore */ }
  }, [])

  // Auto-fill name when user logs in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({ ...prev, name: user.name }))
    }
  }, [user])

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!formData.details && !formData.service) return
    const interval = setInterval(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          role: formData.role,
          service: formData.service,
          details: formData.details,
          priority: formData.priority,
          department: formData.department,
        }))
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      } catch { /* ignore */ }
    }, 30000)
    return () => clearInterval(interval)
  }, [formData])

  // Subscribe to user's tickets
  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeTicketsByUser(user.uid, setMyTickets)
    return () => unsub()
  }, [user?.uid])

  const handleUserLogin = async () => {
    setLoginLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      showToast(err?.message || "Gagal login.", "error")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleAIAssist = async () => {
    if (!formData.details || formData.details.length < 10) {
      showToast("Ceritakan kendala Anda lebih detail terlebih dahulu (min. 10 karakter).", "error")
      return
    }
    setAiLoading(true)
    try {
      const { tip, serviceId } = await aiAnalyzeTicket(formData.details)
      if (serviceId && settingsServices.some((s) => s.id === serviceId)) {
        setFormData((prev) => ({ ...prev, service: serviceId }))
      }
      setAiTip(tip)
      showToast("AI menemukan saran perbaikan dan layanan paling relevan.", "success")

      // Also run duplicate check in the background
      try {
        const since = Date.now() - 7 * 24 * 60 * 60 * 1000
        const existing = await findRecentTicketsByService(serviceId ?? formData.service, since)
        if (existing.length > 0) {
          const res = await aiDuplicateCheck({
            candidate: { service: serviceId ?? formData.service, details: formData.details },
            existing: existing.map((t) => ({
              code: t.code,
              service: t.service,
              details: t.details,
              createdAt: t.createdAt,
            })),
          })
          if (res.duplicateCodes.length > 0) {
            setDuplicate({ codes: res.duplicateCodes, reason: res.reason })
          }
        }
      } catch {
        /* ignore */
      }
    } catch (err: any) {
      showToast(err?.message || "AI tidak merespons. Coba lagi.", "error")
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Honeypot
    if (formData.website.trim().length > 0) {
      // silently accept but never persist
      showToast("Tiket diterima.", "success")
      return
    }
    if (!formData.name.trim() || !formData.details.trim()) {
      showToast("Lengkapi nama dan deskripsi kendala.", "error")
      return
    }
    setLoading(true)
    try {
      // Upload pending files to Drive first
      let allAttachments = [...formData.attachments]
      for (const pf of pendingFiles) {
        try {
          const form = new FormData()
          form.append("file", pf.file)
          const res = await fetch("/api/upload", { method: "POST", body: form })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || "Upload gagal")
          allAttachments.push({ name: data.name, url: data.url, size: data.size, mime: data.mimeType })
        } catch (uploadErr) {
          showToast(`Gagal unggah ${pf.file.name}: ${(uploadErr as Error)?.message}`, "error")
          setLoading(false)
          return
        }
      }

      const saved = await saveTicket({
        name: formData.name,
        role: formData.role,
        service: formData.service,
        details: formData.details,
        priority: formData.priority,
        department: formData.department,
        attachments: allAttachments,
        reporterEmail: user?.email,
        reporterUid: user?.uid,
      })
      setCreated(saved)
      try {
        localStorage.setItem("helpdesk_last_ticket", JSON.stringify({ code: saved.code, status: saved.status }))
        localStorage.removeItem(DRAFT_KEY)
      } catch {}
      if (navigator.vibrate) navigator.vibrate([10, 40, 10])
      playChime()
    } catch (err: any) {
      showToast(err?.message || "Gagal mengirim tiket.", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.code)
      setCopied(true)
      if (navigator.vibrate) navigator.vibrate(10)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      showToast("Tidak dapat menyalin otomatis. Salin manual kodenya.", "error")
    }
  }

  const resetForm = () => {
    setCreated(null)
    setAiTip("")
    setDuplicate(null)
    setFormData({
      name: user?.name ?? "",
      role: "Siswa",
      service: "perpus",
      details: "",
      priority: "Sedang",
      department: "IT",
      attachments: [],
      website: "",
    })
    setPendingFiles([])
  }

  /* ---------- success state ---------- */
  if (created) {
    const trackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/tiket/${created.code}`
    return (
      <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-6 md:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Check className="w-7 h-7" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Tiket berhasil dikirim
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
              Simpan kode tiket di bawah. Anda dapat mengeceknya kapan saja tanpa login, dan
              berkomunikasi dengan admin sekolah.
            </p>

            <div className="mt-6 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 font-mono text-3xl md:text-4xl font-extrabold tracking-widest">
              {created.code}
            </div>

            <div className="flex flex-col gap-2 mt-5 w-full max-w-md">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Tersalin" : "Salin Kode"}
                </button>
                <a
                  href={`/tiket/${created.code}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/30"
                >
                  <Search className="w-4 h-4" /> Lacak Tiket
                </a>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Halo Admin SDN 02 Cibadak, saya baru saja membuat tiket bantuan dengan kode *${created.code}*.\n\nLink Pelacakan: ${trackUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm transition-all shadow-md shadow-[#25D366]/30"
              >
                <MessageCircle className="w-4 h-4" /> Beritahu Admin via WhatsApp
              </a>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 break-all">
              Link pelacakan: <span className="font-mono">{trackUrl}</span>
            </p>

            <button
              onClick={resetForm}
              className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <Plus className="w-3.5 h-3.5" /> Buat Tiket Lain
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- login gate ---------- */
  if (!user) {
    return (
      <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase mb-4">
            <TicketIcon className="w-3.5 h-3.5" />
            <span>Helpdesk &middot; Tiket Bantuan</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
            Lapor Kendala
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-base md:text-lg">
            Login terlebih dahulu untuk membuat dan melacak tiket bantuan Anda.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-8 md:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
              <LogIn className="w-7 h-7" />
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Login Diperlukan
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
              Untuk membuat tiket, Anda perlu login dengan akun Google. Ini memastikan identitas Anda
              terverifikasi dan tiket dapat dilacak dengan mudah.
            </p>
            <button
              onClick={handleUserLogin}
              disabled={loginLoading}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
            >
              {loginLoading ? (
                <span className="w-5 h-5 border-2 border-slate-400/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Login dengan Google
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4">
              Akun Google diperlukan untuk verifikasi identitas pelapor.
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- form state ---------- */
  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase">
            <TicketIcon className="w-3.5 h-3.5" />
            <span>Helpdesk &middot; Tiket Bantuan</span>
          </div>
          {draftSaved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold animate-in fade-in duration-300">
              ✓ Draft tersimpan
            </span>
          )}
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
          Lapor Kendala
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-base md:text-lg">
          Login sebagai <span className="font-bold text-slate-700 dark:text-slate-200">{user.name}</span> ({user.email}). Setiap tiket mendapat kode unik untuk pelacakan mandiri.
        </p>
      </div>

      {/* My Tickets */}
      {myTickets.length > 0 && (
        <div className="mb-8 bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-5 md:p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Tiket Saya ({myTickets.length})
          </p>
          <div className="space-y-2">
            {myTickets.slice(0, 5).map((t) => (
              <a
                key={t.id}
                href={`/tiket/${t.code}`}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{t.code}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.details.slice(0, 60)}...</p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  t.status === "Open" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20" :
                  t.status === "In Progress" ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20" :
                  "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {t.status}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-6 md:p-8 shadow-xl dark:shadow-2xl dark:shadow-black/40 space-y-7 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />

        {/* Honeypot - visually hidden */}
        <div
          aria-hidden="true"
          className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none"
        >
          <label>
            Website
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
          <FieldInput
            label="Nama Lengkap"
            required
            readOnly
            placeholder="Auto-isi dari akun Google"
            value={formData.name}
            onChange={(v) => setFormData({ ...formData, name: v })}
          />
          <FieldSelect
            label="Peran / Status"
            value={formData.role}
            onChange={(v) => setFormData({ ...formData, role: v })}
            options={[
              { value: "Siswa", label: "Siswa" },
              { value: "Guru / Staff", label: "Guru / Staff" },
              { value: "Orang Tua", label: "Orang Tua / Wali" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
          <FieldSelect
            label="Layanan Terkendala"
            value={formData.service}
            onChange={(v) => setFormData({ ...formData, service: v })}
            options={settingsServices.map((s) => ({ value: s.id, label: s.name }))}
          />
          <FieldSelect
            label="Departemen Tujuan"
            value={formData.department}
            onChange={(v) => setFormData({ ...formData, department: v as Department })}
            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          />
        </div>

        <div className="space-y-2 relative z-10">
          <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 uppercase ml-1">
            Tingkat Prioritas
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRIORITIES.map((p) => {
              const active = formData.priority === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p.value })}
                  aria-pressed={active}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-xs font-bold transition-all border ${
                    active
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm"
                      : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  {p.value === "Urgent" && (
                    <Flame className={`w-3.5 h-3.5 ${active ? "" : "text-red-500"}`} />
                  )}
                  <span>{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between gap-2 ml-1">
            <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 uppercase">
              Deskripsi Detail
            </label>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold tabular-nums ${
                formData.details.length > 450 ? 'text-red-500' : formData.details.length > 200 ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
              }`}>
                {formData.details.length}/500
              </span>
              <VoiceInput
                onTranscript={(t) =>
                  setFormData((prev) => ({
                    ...prev,
                    details: prev.details ? `${prev.details} ${t}` : t,
                  }))
                }
              />
            </div>
          </div>
          <textarea
            required
            rows={5}
            maxLength={500}
            placeholder="Jelaskan secara spesifik kendala yang dialami, kapan terjadi, dan apa yang sudah dicoba..."
            value={formData.details}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            className="w-full resize-none bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">
              Semakin detail, semakin cepat tim menindaklanjuti.
            </p>
            <button
              type="button"
              onClick={handleAIAssist}
              disabled={aiLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border border-blue-500/20 dark:border-blue-400/20 text-blue-700 dark:text-blue-300 text-sm font-bold transition-all disabled:opacity-50"
            >
              {aiLoading ? (
                <span className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-700 dark:border-t-blue-300 rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Analisis dengan AI</span>
            </button>
          </div>
        </div>

        {aiTip && (
          <div className="relative z-10 p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-500/20 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">
                  Saran AI Helpdesk (Gemini)
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1 leading-relaxed whitespace-pre-wrap">
                  {aiTip}
                </p>
              </div>
            </div>
          </div>
        )}

        {duplicate && duplicate.codes.length > 0 && (
          <div className="relative z-10 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                {duplicate.codes.length} laporan serupa ditemukan
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">{duplicate.reason}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {duplicate.codes.map((c) => (
                  <a
                    key={c}
                    href={`/tiket/${c}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 font-mono font-bold text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/20 transition-colors"
                  >
                    {c} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-2">
          <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 uppercase ml-1">
            Lampiran (opsional)
          </label>
          <AttachmentUpload
            attachments={formData.attachments}
            onChange={(list) => setFormData({ ...formData, attachments: list })}
            pendingFiles={pendingFiles}
            onPendingChange={setPendingFiles}
            onError={(msg) => showToast(msg, "error")}
          />
        </div>

        <button
          disabled={loading}
          type="submit"
          className="relative z-10 w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold tracking-wide rounded-2xl px-4 py-4 flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-slate-500/30 transition-all duration-300 shadow-lg disabled:opacity-70 disabled:hover:scale-100 motion-reduce:hover:scale-100"
        >
          {loading ? (
            <span className="w-6 h-6 border-2 border-slate-400/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" /> Kirim Tiket Bantuan
            </>
          )}
        </button>
      </form>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  required,
  placeholder,
  readOnly,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between ml-1">
        <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 uppercase">
          {label}
        </label>
        {readOnly && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
            <Lock className="w-2.5 h-2.5" /> Dikunci
          </span>
        )}
      </div>
      <input
        required={required}
        disabled={readOnly}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium ${
          readOnly
            ? "cursor-not-allowed opacity-70 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-white/5 select-none"
            : "focus:bg-white dark:focus:bg-slate-900"
        }`}
      />
    </div>
  )
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 uppercase ml-1">
        {label}
      </label>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger
          className="w-full flex items-center justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm text-slate-900 dark:text-white transition-all duration-200 font-medium text-left focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-blue-500/30 hover:bg-slate-50 dark:hover:bg-white/5 data-[state=open]:border-blue-500/50 data-[state=open]:ring-4 data-[state=open]:ring-blue-500/10 active:scale-[0.99]"
        >
          <Select.Value />
          <Select.Icon>
            <ChevronDown className="w-5 h-5 text-slate-400 transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={8}
            className="z-[100] w-[var(--radix-select-trigger-width)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <Select.Viewport className="p-1.5">
              {options.map((o) => (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex items-center w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-300 rounded-xl outline-none transition-all duration-200 data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-500/10 data-[highlighted]:text-blue-600 dark:data-[highlighted]:text-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white data-[state=checked]:font-bold cursor-pointer select-none"
                >
                  <Select.ItemText>{o.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute right-4 inline-flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}
