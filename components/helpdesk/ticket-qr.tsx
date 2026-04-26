"use client"

import { useEffect, useRef, useState } from "react"
import { QrCode, X } from "lucide-react"
import { createPortal } from "react-dom"
import QRCodeStyling from "qr-code-styling"

export function TicketQr({ url }: { url: string }) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || !qrRef.current) return
    qrRef.current.innerHTML = ""

    const qrCode = new QRCodeStyling({
      width: 180,
      height: 180,
      type: "svg",
      data: url,
      image: "/logo.png",
      imageOptions: { crossOrigin: "anonymous", margin: 8, imageSize: 0.3 },
      dotsOptions: { color: "#2563eb", type: "rounded" },
      backgroundOptions: { color: "transparent" },
      cornersSquareOptions: { type: "extra-rounded", color: "#1e40af" },
    })
    qrCode.append(qrRef.current)
  }, [url, open])

  return (
    <>
      {/* Compact trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all hover:scale-105 active:scale-95"
        title="Tampilkan QR Code Pelacakan"
      >
        <QrCode className="w-3.5 h-3.5" />
        <span>QR Code</span>
      </button>

      {/* Compact popover modal via portal */}
      {open && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300 min-w-[240px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Magic QR ✨</p>
            <div ref={qrRef} className="w-[180px] h-[180px]" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center max-w-[180px]">
              Scan dengan kamera HP untuk langsung melacak tiket ini.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
