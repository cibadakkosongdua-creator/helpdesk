"use client"

import { AlertCircle, CheckCircle2 } from "lucide-react"

export type ToastAction = {
  label: string
  onClick: () => void
}

export type ToastState = {
  show: boolean
  message: string
  type: "success" | "error"
  action?: ToastAction
}

export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss?: () => void }) {
  if (!toast.show) return null
  return (
    <div className="fixed top-6 md:top-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-300 px-4">
      <div className="flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
        {toast.type === "success" ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        )}
        <p className="font-medium text-sm tracking-wide pr-1 text-slate-800 dark:text-slate-100">
          {toast.message}
        </p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick()
              onDismiss?.()
            }}
            className="ml-1 rounded-full bg-slate-900 dark:bg-white px-3 py-1 text-xs font-bold text-white dark:text-slate-900 hover:scale-105 active:scale-95 transition-transform"
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  )
}
