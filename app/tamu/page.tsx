"use client"

import { GuestForm } from "@/components/helpdesk/guest-form"
import { Toast, type ToastState } from "@/components/helpdesk/toast"
import { useState } from "react"

export default function TamuPage() {
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "success" })

  const dismissToast = () =>
    setToast({ show: false, message: "", type: "success", action: undefined })

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
    action?: { label: string; onClick: () => void },
  ) => {
    setToast({ show: true, message, type, action })
    setTimeout(() => dismissToast(), action ? 7000 : 3500)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300 flex flex-col">
      {/* Ambient glow background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55%] h-[55%] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[140px]" />
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />

      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex flex-col items-center justify-center">
        <GuestForm showToast={showToast} />
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4 border-t border-slate-200/60 dark:border-white/5">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded-full" />
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">SDN 02 Cibadak</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-600">
            &copy; {new Date().getFullYear()} Smart Helpdesk v2.0 &middot; Buku Tamu Digital
          </p>
        </div>
      </footer>
    </div>
  )
}
