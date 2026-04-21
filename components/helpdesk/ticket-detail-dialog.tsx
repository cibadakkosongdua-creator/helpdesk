"use client"

import {
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Trash2,
  User,
  X,
} from "lucide-react"
import { useEffect } from "react"
import { SERVICES } from "@/lib/helpdesk/data"
import {
  markTicketRead,
  updateTicketMeta,
  updateTicketStatus,
  type Department,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/helpdesk/firestore-service"
import { ReplyThread } from "./reply-thread"
import { ConfirmDialog } from "./confirm-dialog"
import type { ShowToastFn } from "./types"

const STATUSES: TicketStatus[] = ["Open", "In Progress", "Resolved"]
const PRIORITIES: TicketPriority[] = ["Rendah", "Sedang", "Tinggi", "Urgent"]
const DEPARTMENTS: Department[] = [
  "IT",
  "Akademik",
  "Kesiswaan",
  "Sarpras",
  "Tata Usaha",
  "Kepala Sekolah",
]

export function TicketDetailDialog({
  ticket,
  onClose,
  onDelete,
  adminName,
  showToast,
}: {
  ticket: Ticket
  onClose: () => void
  onDelete?: (id: string) => void
  adminName: string
  showToast: ShowToastFn
}) {
  useEffect(() => {
    void markTicketRead(ticket.id, "admin")
  }, [ticket.id])

  const service = SERVICES.find((s) => s.id === ticket.service)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/tiket/${ticket.code}`)
      showToast("Link pelacakan tersalin.", "success")
    } catch {
      showToast("Tidak dapat menyalin.", "error")
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full md:w-[720px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-4 p-5 md:p-6 border-b border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900 rounded-t-[2rem]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-lg md:text-xl font-extrabold tracking-widest text-slate-900 dark:text-white">
                    {ticket.code}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-[10px] font-bold transition-colors"
                    aria-label="Salin link pelacakan"
                  >
                    <Copy className="w-3 h-3" /> Salin Link
                  </button>
                  <a
                    href={`/tiket/${ticket.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Tampilan Publik
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <b className="text-slate-700 dark:text-slate-200">{ticket.name}</b> · {ticket.role}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {new Date(ticket.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1">
                {onDelete && (
                  <ConfirmDialog
                    title="Hapus Tiket?"
                    description={`Tiket ${ticket.code} akan dihapus secara permanen beserta seluruh balasan. Tindakan ini tidak dapat dibatalkan.`}
                    confirmLabel="Hapus Tiket"
                    onConfirm={() => onDelete(ticket.id)}
                  >
                    <button
                      className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                      aria-label="Hapus tiket"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </ConfirmDialog>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetaSelect
              label="Status"
              value={ticket.status}
              options={STATUSES}
              onChange={(v) => {
                void updateTicketStatus(ticket.id, v as TicketStatus, adminName)
                showToast(`Status diubah ke "${v}".`, "success")
              }}
            />
            <MetaSelect
              label="Prioritas"
              value={ticket.priority}
              options={PRIORITIES}
              onChange={(v) => {
                void updateTicketMeta(ticket.id, { priority: v as TicketPriority }, adminName)
                showToast(`Prioritas diubah ke "${v}".`, "success")
              }}
            />
            <MetaSelect
              label="Departemen"
              value={ticket.department}
              options={DEPARTMENTS}
              onChange={(v) => {
                void updateTicketMeta(ticket.id, { department: v as Department }, adminName)
                showToast(`Departemen dialihkan ke ${v}.`, "success")
              }}
            />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
              Layanan · {service?.name ?? ticket.service}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 rounded-2xl p-4">
              {ticket.details}
            </p>
          </div>

          {ticket.attachments?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
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

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
            <ReplyThread
              ticket={ticket}
              as="admin"
              authorName={adminName}
              onError={(m) => showToast(m, "error")}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
