"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[helpdesk] Global error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Terjadi Kesalahan
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Sistem mengalami kendala saat memuat halaman ini. Pastikan koneksi internet Anda stabil atau coba beberapa saat lagi.
        </p>
        
        <div className="flex flex-col w-full gap-3">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-bold transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl py-3 text-sm font-bold transition-all"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  )
}
