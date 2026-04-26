"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Ticket, MessageSquare, LayoutDashboard, Home, Clock, ChevronRight, RefreshCcw } from "lucide-react"

export type CommandAction = {
  id: string
  label: string
  hint?: string
  icon: "home" | "ticket" | "survey" | "dashboard" | "track"
  keywords?: string[]
  shortcut?: string
  run: () => void
}

type Props = {
  onNavigate: (view: "home" | "ticket" | "survey" | "admin") => void
  onTrackTicket: (code: string) => void
}

const ICONS = {
  home: Home,
  ticket: Ticket,
  survey: MessageSquare,
  dashboard: LayoutDashboard,
  track: Search,
}

const RECENT_KEY = "helpdesk_cmd_recent"
const MAX_RECENT = 3

export default function CommandPalette({ onNavigate, onTrackTicket }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [recentIds, setRecentIds] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]")
      setRecentIds(Array.isArray(stored) ? stored : [])
    } catch {}
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }
    const onTrigger = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener("helpdesk:open-command", onTrigger)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("helpdesk:open-command", onTrigger)
    }
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setQuery("")
  }, [open])

  const saveRecent = (id: string) => {
    try {
      const prev = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]
      const next = [id, ...prev.filter((r) => r !== id)].slice(0, MAX_RECENT)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {}
  }

  const actions: CommandAction[] = [
    { id: "home",   label: "Beranda",               hint: "Kembali ke halaman utama",          icon: "home",      keywords: ["home","beranda","utama"],               shortcut: "Ctrl 1", run: () => onNavigate("home") },
    { id: "ticket", label: "Buat Tiket Baru",        hint: "Laporkan kendala atau pertanyaan",  icon: "ticket",    keywords: ["laporan","masalah","tiket","baru"],     shortcut: "Ctrl 2", run: () => onNavigate("ticket") },
    { id: "survey", label: "Isi Survei Kepuasan",    hint: "Berikan penilaian layanan (IKM)",   icon: "survey",    keywords: ["survei","ikm","rating","feedback"],     shortcut: "Ctrl 3", run: () => onNavigate("survey") },
    { id: "admin",  label: "Masuk Admin",            hint: "Dashboard pengelola sekolah",       icon: "dashboard", keywords: ["admin","dashboard","login"],            shortcut: "Ctrl 4", run: () => onNavigate("admin") },
  ]

  const trimmed = query.trim()
  const looksLikeCode = /^HD-\d{4,}/i.test(trimmed)
  const filtered = actions.filter((a) => {
    if (!trimmed) return true
    const blob = [a.label, a.hint ?? "", ...(a.keywords ?? [])].join(" ").toLowerCase()
    return blob.includes(trimmed.toLowerCase())
  })

  const recentActions = recentIds.map((id) => actions.find((a) => a.id === id)).filter(Boolean) as CommandAction[]
  const showRecent = !trimmed && recentActions.length > 0

  const runAction = (action: CommandAction) => {
    saveRecent(action.id)
    action.run()
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 shadow-2xl shadow-slate-900/20 dark:shadow-black/40 backdrop-blur-xl animate-in zoom-in-95 slide-in-from-top-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-800/60 px-4 py-3.5">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu atau ketik kode tiket (mis. HD-2026...)"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            aria-label="Cari perintah"
          />
          <kbd className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            Esc
          </kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
          {/* Track ticket */}
          {looksLikeCode && (
            <>
              <li className="px-2 py-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Lacak Tiket</p>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => { onTrackTicket(trimmed.toUpperCase()); setOpen(false) }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none active:scale-[0.99] group"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Lacak tiket {trimmed.toUpperCase()}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Buka halaman status tiket</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                </button>
              </li>
            </>
          )}

          {/* Recent searches */}
          {showRecent && (
            <>
              <li className="px-2 py-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Terakhir Diakses</p>
              </li>
              {recentActions.map((a) => {
                const Icon = ICONS[a.icon]
                return (
                  <li key={`recent-${a.id}`}>
                    <button
                      type="button"
                      onClick={() => runAction(a)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none active:scale-[0.99] group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 flex items-center justify-center shrink-0 transition-colors">
                        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-700 dark:text-slate-300 flex-1">{a.label}</p>
                      <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                    </button>
                  </li>
                )
              })}
              <li className="my-1.5 mx-2 h-px bg-slate-200/60 dark:bg-slate-800/60" />
            </>
          )}

          {/* Navigation section */}
          {!looksLikeCode && (
            <li className="px-2 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Navigasi</p>
            </li>
          )}

          {filtered.length === 0 && !looksLikeCode ? (
            <li className="px-3 py-8 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tidak ada hasil untuk &ldquo;{trimmed}&rdquo;</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Coba kata kunci lain atau ketik kode tiket (HD-...)</p>
            </li>
          ) : (
            filtered.map((a) => {
              const Icon = ICONS[a.icon]
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => runAction(a)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none active:scale-[0.99] group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 flex items-center justify-center shrink-0 transition-colors">
                      <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{a.label}</p>
                      {a.hint && <p className="text-xs text-slate-500 dark:text-slate-400">{a.hint}</p>}
                    </div>
                    {a.shortcut && (
                      <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 rounded-md px-1.5 py-0.5 shrink-0">
                        {a.shortcut}
                      </kbd>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                  </button>
                </li>
              )
            })
          )}
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/60 px-4 py-2.5 text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-3">
            {[["↑↓", "navigasi"], ["↵", "pilih"], ["Esc", "tutup"]].map(([key, label]) => (
              <span key={key} className="flex items-center gap-1">
                <kbd className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px]">{key}</kbd>
                {label}
              </span>
            ))}
          </div>
          <span className="font-medium">SDN 02 Cibadak</span>
        </div>
      </div>
    </div>
  )
}
