"use client"

import { ExternalLink, FileText, Link2, Paperclip, Plus, Trash2, UploadCloud, X, ZoomIn } from "lucide-react"
import { useRef, useState } from "react"
import { DRIVE_FOLDER_URL, normalizeDriveLink } from "@/lib/helpdesk/drive-upload"
import type { Attachment } from "@/lib/helpdesk/firestore-service"

export type PendingFile = {
  file: File
  preview: string | null
}

export function AttachmentUpload({
  attachments,
  onChange,
  pendingFiles,
  onPendingChange,
  onError,
}: {
  attachments: Attachment[]
  onChange: (list: Attachment[]) => void
  pendingFiles: PendingFile[]
  onPendingChange: (list: PendingFile[]) => void
  onError?: (msg: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [linkInput, setLinkInput] = useState("")
  const [linkName, setLinkName] = useState("")
  const [lightbox, setLightbox] = useState<{ src: string; name: string } | null>(null)

  const handleSelectFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      onError?.("File melebihi 10 MB. Silakan kompres atau gunakan link Drive.")
      return
    }
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    onPendingChange([...pendingFiles, { file, preview }])
  }

  const removePending = (i: number) => {
    const next = pendingFiles.slice()
    const removed = next.splice(i, 1)[0]
    if (removed?.preview) URL.revokeObjectURL(removed.preview)
    onPendingChange(next)
  }

  const removeAttachment = (i: number) => {
    const next = attachments.slice()
    next.splice(i, 1)
    onChange(next)
  }

  const handleAddLink = () => {
    const link = normalizeDriveLink(linkInput)
    if (!link) {
      onError?.("Link tidak valid. Gunakan URL lengkap (https://...)")
      return
    }
    onChange([
      ...attachments,
      {
        name: linkName.trim() || "Lampiran Drive",
        url: link,
      },
    ])
    setLinkInput("")
    setLinkName("")
  }

  const allItems = [
    ...attachments.map((a, i) => ({ type: "attachment" as const, data: a, index: i })),
    ...pendingFiles.map((p, i) => ({ type: "pending" as const, data: p, index: i })),
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 uppercase ml-1 inline-flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5" />
          Bukti / Lampiran (Opsional)
        </label>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
          Foto, dokumen, surat dokter · Max 10MB
        </span>
      </div>

      {allItems.length > 0 && (
        <ul className="space-y-3">
          {allItems.map((item) =>
            item.type === "pending" ? (
              <li
                key={`p-${item.index}`}
                className="bg-blue-50/60 dark:bg-blue-500/5 border border-blue-200/60 dark:border-blue-500/20 rounded-2xl overflow-hidden"
              >
                {item.data.preview ? (
                  <div className="relative group cursor-zoom-in" onClick={() => setLightbox({ src: item.data.preview!, name: item.data.file.name })}>
                    <div className="w-full aspect-video max-h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img src={item.data.preview} alt={item.data.file.name} className="w-full h-full object-contain" />
                    </div>
                    {/* Zoom overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(item.index)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                      aria-label="Hapus"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 px-3 py-2">
                  {!item.data.preview && (
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {item.data.file.type === "application/pdf" ? (
                        <FileText className="w-5 h-5 text-red-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">{item.data.file.name}</p>
                    <p className="text-[10px] text-blue-500 dark:text-blue-400 font-semibold">Belum diunggah · {(item.data.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  {!item.data.preview && (
                    <button
                      type="button"
                      onClick={() => removePending(item.index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      aria-label="Hapus"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ) : (
              <li
                key={`a-${item.index}`}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2"
              >
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <a
                  href={item.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-slate-700 dark:text-slate-200 hover:underline truncate"
                >
                  {item.data.name}
                </a>
                <a
                  href={item.data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-white/5 transition-colors"
                  aria-label="Buka lampiran"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => removeAttachment(item.index)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  aria-label="Hapus lampiran"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleSelectFile(f)
            if (inputRef.current) inputRef.current.value = ""
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-dashed border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <UploadCloud className="w-4 h-4" />
          Pilih File
        </button>
        <a
          href={DRIVE_FOLDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          Folder Drive Sekolah
        </a>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-950/40 p-3">
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            Sudah upload ke Drive? Tempel link <b>bagikan</b> file di bawah.
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Nama file (opsional)"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            className="sm:w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
          />
          <input
            type="url"
            placeholder="https://drive.google.com/file/d/..."
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
          />
          <button
            type="button"
            onClick={handleAddLink}
            disabled={!linkInput.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.name} className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
            <p className="text-white/70 text-xs text-center mt-3 font-medium">{lightbox.name}</p>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
