"use client"

import { useEffect, useState } from "react"
import { RefreshCw, WifiOff } from "lucide-react"

export default function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  const handleRetry = () => {
    setRetrying(true)
    setTimeout(() => window.location.reload(), 600)
  }

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-amber-500 text-white shadow-lg animate-in slide-in-from-top-2 fade-in duration-300"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <WifiOff className="h-4 w-4 shrink-0 animate-pulse" aria-hidden="true" />
          <span>Kamu sedang offline. Data terbaru mungkin belum ter-sinkron.</span>
        </div>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shrink-0 disabled:opacity-70 disabled:hover:scale-100"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
          Coba Lagi
        </button>
      </div>
    </div>
  )
}
