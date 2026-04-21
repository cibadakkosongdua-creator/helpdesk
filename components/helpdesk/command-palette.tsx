"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Ticket, MessageSquare, LayoutDashboard, Home, Command } from "lucide-react"

export type CommandAction = {
  id: string
  label: string
  hint?: string
  icon: "home" | "ticket" | "survey" | "dashboard" | "track"
  keywords?: string[]
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

export default function CommandPalette({ onNavigate, onTrackTicket }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
    }
  }, [open])

  const actions: CommandAction[] = [
    {
      id: "home",
      label: "Beranda",
      hint: "Kembali ke halaman utama",
      icon: "home",
      keywords: ["home", "beranda", "utama"],
      run: () => onNavigate("home"),
    },
    {
      id: "ticket",
      label: "Buat Tiket Baru",
      hint: "Laporkan kendala atau pertanyaan",
      icon: "ticket",
      keywords: ["laporan", "masalah", "tiket", "baru"],
      run: () => onNavigate("ticket"),
    },
    {
      id: "survey",
      label: "Isi Survei Kepuasan (IKM)",
      hint: "Berikan penilaian layanan",
      icon: "survey",
      keywords: ["survei", "ikm", "rating", "feedback"],
      run: () => onNavigate("survey"),
    },
    {
      id: "admin",
      label: "Masuk Admin",
      hint: "Dashboard pengelola",
      icon: "dashboard",
      keywords: ["admin", "dashboard", "login"],
      run: () => onNavigate("admin"),
    },
  ]

  const trimmed = query.trim()
  const looksLikeCode = /^HD-\d{4,}/i.test(trimmed)
  const filtered = actions.filter((a) => {
    if (!trimmed) return true
    const blob = [a.label, a.hint ?? "", ...(a.keywords ?? [])].join(" ").toLowerCase()
    return blob.includes(trimmed.toLowerCase())
  })

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/30 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-neutral-200/60 px-4 py-3 dark:border-neutral-800/60">
          <Search className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu atau ketik kode tiket (mis. HD-2026...)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            aria-label="Cari perintah"
          />
          <kbd className="hidden items-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 sm:inline-flex dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
            <Command className="h-3 w-3" aria-hidden="true" /> K
          </kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
          {looksLikeCode && (
            <li>
              <button
                type="button"
                onClick={() => {
                  onTrackTicket(trimmed.toUpperCase())
                  setOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
              >
                <Search className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium">Lacak tiket {trimmed.toUpperCase()}</p>
                  <p className="text-xs text-neutral-500">Buka halaman status tiket</p>
                </div>
              </button>
            </li>
          )}

          {filtered.length === 0 && !looksLikeCode ? (
            <li className="px-3 py-6 text-center text-sm text-neutral-500">
              Tidak ada hasil
            </li>
          ) : (
            filtered.map((a) => {
              const Icon = ICONS[a.icon]
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      a.run()
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
                  >
                    <Icon className="h-4 w-4 text-neutral-600 dark:text-neutral-300" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="font-medium">{a.label}</p>
                      {a.hint && <p className="text-xs text-neutral-500">{a.hint}</p>}
                    </div>
                  </button>
                </li>
              )
            })
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-neutral-200/60 px-4 py-2 text-[11px] text-neutral-500 dark:border-neutral-800/60">
          <span>
            <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1 py-0.5 dark:border-neutral-700 dark:bg-neutral-800">
              Esc
            </kbd>{" "}
            tutup
          </span>
          <span>Helpdesk SDN 02 Cibadak</span>
        </div>
      </div>
    </div>
  )
}
