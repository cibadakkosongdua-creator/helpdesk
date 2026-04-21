"use client"

import { RefreshCw, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { aiDailySummary } from "@/lib/helpdesk/gemini-client"
import type { Feedback, Ticket } from "@/lib/helpdesk/firestore-service"

export function AISummaryCard({
  tickets,
  feedbacks,
}: {
  tickets: Ticket[]
  feedbacks: Feedback[]
}) {
  const [text, setText] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
      const todayTickets = tickets.filter((t) => t.createdAt >= dayStart)
      const todayFeedbacks = feedbacks.filter((f) => f.createdAt >= dayStart)
      const sample =
        todayTickets.length === 0 && todayFeedbacks.length === 0
          ? { tickets: tickets.slice(0, 15), feedbacks: feedbacks.slice(0, 10) }
          : { tickets: todayTickets, feedbacks: todayFeedbacks }

      const res = await aiDailySummary({
        tickets: sample.tickets.map((t) => ({
          service: t.service,
          priority: t.priority,
          status: t.status,
          details: t.details,
          createdAt: t.createdAt,
        })),
        feedbacks: sample.feedbacks.map((f) => ({
          service: f.service,
          rating: f.rating,
          feedback: f.feedback,
          createdAt: f.createdAt,
        })),
      })
      setText(res)
    } catch {
      setText("Ringkasan AI belum dapat dimuat. Coba lagi sebentar.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tickets.length > 0 || feedbacks.length > 0) {
      void run()
    }
    // run once on mount / first time data ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets.length > 0, feedbacks.length > 0])

  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white rounded-[2rem] p-6 md:p-7 shadow-xl overflow-hidden">
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-amber-300" /> Ringkasan Harian AI
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold tracking-tight mt-2">
            Situasi Helpdesk Hari Ini
          </h3>
          {loading ? (
            <div className="mt-4 space-y-2">
              <div className="h-3 w-3/4 bg-white/20 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-white/20 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-white/20 rounded animate-pulse" />
            </div>
          ) : (
            <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-white/90 whitespace-pre-wrap">
              {text || "Belum ada data yang cukup untuk diringkas."}
            </p>
          )}
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all disabled:opacity-60"
          aria-label="Perbarui ringkasan"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  )
}
