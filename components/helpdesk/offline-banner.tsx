"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export default function OfflineBanner() {
  const [online, setOnline] = useState(true)

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

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-amber-500/95 text-white shadow-md backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
        <WifiOff className="h-4 w-4" aria-hidden="true" />
        <span className="text-pretty">
          Kamu sedang offline. Data terbaru mungkin belum ter-sinkron.
        </span>
      </div>
    </div>
  )
}
