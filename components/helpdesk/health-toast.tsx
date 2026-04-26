"use client"

import { Droplets, Eye, Footprints, X } from "lucide-react"
import { useEffect, useState, useCallback } from "react"

export type HealthReminderType = "eye" | "stand" | "water" | "posture"

export type HealthReminder = {
  id: string
  type: HealthReminderType
  title: string
  message: string
  icon: typeof Eye
  color: string
  bgColor: string
  interval: number // minutes
}

export const HEALTH_REMINDERS: HealthReminder[] = [
  {
    id: "eye",
    type: "eye",
    title: "Istirahatkan Mata",
    message: "Anda sudah 20 menit di depan layar. Lihat objek jauh selama 20 detik untuk istirahat mata.",
    icon: Eye,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-500/20",
    interval: 20, // Muncul setelah 20 menit di web
  },
  {
    id: "stand",
    type: "stand",
    title: "Waktunya Berdiri",
    message: "Anda sudah 45 menit duduk. Berdiri dan renggangkan badan untuk kesehatan.",
    icon: Footprints,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
    interval: 45, // Muncul setelah 45 menit di web
  },
  {
    id: "water",
    type: "water",
    title: "Waktunya Minum Air",
    message: "Anda sudah 60 menit di depan layar. Minum air putih untuk menjaga hidrasi.",
    icon: Droplets,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-500/20",
    interval: 60, // Muncul setelah 60 menit di web
  },
]

// Button colors for each reminder type
const BUTTON_COLORS: Record<HealthReminderType, string> = {
  eye: "bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600",
  stand: "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600",
  water: "bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-500 dark:hover:bg-cyan-600",
  posture: "bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600",
}

type HealthToastProps = {
  enabled: boolean
}

export function HealthToast({ enabled }: HealthToastProps) {
  const [currentReminder, setCurrentReminder] = useState<HealthReminder | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [sessionStart] = useState(Date.now()) // Track when user started session
  const [shownReminders, setShownReminders] = useState<Set<string>>(new Set())

  const showReminder = useCallback((reminder: HealthReminder) => {
    setCurrentReminder(reminder)
    setIsVisible(true)
    setShownReminders(prev => new Set(prev).add(reminder.id))
  }, [])

  const dismissReminder = () => {
    setIsVisible(false)
    setTimeout(() => setCurrentReminder(null), 300)
  }

  useEffect(() => {
    if (!enabled) return

    const checkSessionTime = () => {
      const now = Date.now()
      const sessionMinutes = (now - sessionStart) / 60000

      // Check each reminder based on session time
      for (const reminder of HEALTH_REMINDERS) {
        // Only show if not already shown and session time reached
        if (
          !shownReminders.has(reminder.id) &&
          sessionMinutes >= reminder.interval &&
          !isVisible &&
          !currentReminder
        ) {
          showReminder(reminder)
          break // Show one at a time
        }
      }
    }

    // Check every minute
    const interval = setInterval(checkSessionTime, 60000)
    checkSessionTime() // Initial check

    return () => clearInterval(interval)
  }, [enabled, sessionStart, shownReminders, isVisible, currentReminder, showReminder])

  // No need for session reset - each page load is fresh session

  const [snoozed, setSnoozed] = useState(false)

  const snoozeReminder = () => {
    setSnoozed(true)
    setIsVisible(false)
    setTimeout(() => setCurrentReminder(null), 300)
    // Re-show after 10 minutes
    setTimeout(() => {
      setSnoozed(false)
      if (currentReminder) showReminder(currentReminder)
    }, 10 * 60 * 1000)
  }

  if (!enabled || !isVisible || !currentReminder) return null

  const Icon = currentReminder.icon

  return (
    <div className="fixed bottom-36 md:bottom-24 left-4 md:left-8 z-[150] max-w-sm animate-in slide-in-from-left-4 fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/30 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${currentReminder.bgColor} flex items-center justify-center ${currentReminder.color} shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{currentReminder.title}</h4>
                <button
                  onClick={dismissReminder}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {currentReminder.message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={snoozeReminder}
            disabled={snoozed}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            Snooze 10 Menit
          </button>
          <button
            onClick={dismissReminder}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-[1.02] active:scale-95 ${BUTTON_COLORS[currentReminder.type]}`}
          >
            OK, Mengerti
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Health reminder settings component
 */
export function HealthReminderSettings({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
          <Droplets className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Pengingat Kesehatan</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Istirahat mata, minum air, berdiri</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
      </label>
    </div>
  )
}
