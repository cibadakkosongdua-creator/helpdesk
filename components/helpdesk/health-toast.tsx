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
    message: "Lihat objek jauh selama 20 detik. Aturan 20-20-20: setiap 20 menit, lihat 20 kaki jauhnya, selama 20 detik.",
    icon: Eye,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-500/20",
    interval: 20, // Muncul setiap 20 menit
  },
  {
    id: "stand",
    type: "stand",
    title: "Waktunya Berdiri",
    message: "Berdiri dan renggangkan badan. Hindari duduk terlalu lama untuk kesehatan.",
    icon: Footprints,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-500/20",
    interval: 30, // Muncul setiap 30 menit
  },
  {
    id: "water",
    type: "water",
    title: "Waktunya Minum Air",
    message: "Minum segelas air putih untuk menjaga hidrasi dan konsentrasi.",
    icon: Droplets,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-500/20",
    interval: 45, // Muncul setiap 45 menit
  },
]

type HealthToastProps = {
  enabled: boolean
}

const STORAGE_KEY = "helpdesk_health_reminders"

type ReminderState = {
  [key: string]: {
    lastShown: number
    dismissed: boolean
  }
}

export function HealthToast({ enabled }: HealthToastProps) {
  const [currentReminder, setCurrentReminder] = useState<HealthReminder | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [states, setStates] = useState<ReminderState>(() => {
    if (typeof window === "undefined") return {}
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  })

  const showReminder = useCallback((reminder: HealthReminder) => {
    setCurrentReminder(reminder)
    setIsVisible(true)

    // Update state
    setStates(prev => {
      const next = {
        ...prev,
        [reminder.id]: {
          lastShown: Date.now(),
          dismissed: false,
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const dismissReminder = (snooze: boolean = false) => {
    setIsVisible(false)

    if (snooze && currentReminder) {
      // Snooze: remind again in 5 minutes
      setStates(prev => {
        const next = {
          ...prev,
          [currentReminder.id]: {
            lastShown: Date.now() - (currentReminder.interval - 5) * 60 * 1000,
            dismissed: false,
          },
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    }
    // Normal dismiss: reset timer

    setTimeout(() => setCurrentReminder(null), 300)
  }

  useEffect(() => {
    if (!enabled) return

    const checkReminders = () => {
      const now = Date.now()

      for (const reminder of HEALTH_REMINDERS) {
        const state = states[reminder.id]
        const intervalMs = reminder.interval * 60 * 1000

        // Check if should show
        if (!state || now - state.lastShown >= intervalMs) {
          // Don't show if another reminder is visible
          if (!isVisible && !currentReminder) {
            showReminder(reminder)
            break
          }
        }
      }
    }

    // Check every minute
    const interval = setInterval(checkReminders, 60000)
    checkReminders() // Initial check

    return () => clearInterval(interval)
  }, [enabled, states, isVisible, currentReminder, showReminder])

  // Reset dismissed states on new session
  useEffect(() => {
    const sessionKey = "helpdesk_health_session"
    const currentSession = sessionStorage.getItem(sessionKey)

    if (!currentSession) {
      sessionStorage.setItem(sessionKey, "active")
      // Clear dismissed states but keep lastShown times
      setStates(prev => {
        const next: ReminderState = {}
        for (const [key, value] of Object.entries(prev)) {
          next[key] = { lastShown: value.lastShown, dismissed: false }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    }
  }, [])

  if (!enabled || !isVisible || !currentReminder) return null

  const Icon = currentReminder.icon

  return (
    <div className="fixed bottom-28 md:bottom-24 left-4 md:left-8 z-[150] max-w-sm animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${currentReminder.bgColor} flex items-center justify-center ${currentReminder.color} flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{currentReminder.title}</h4>
              <button
                onClick={() => dismissReminder(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {currentReminder.message}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Pengingat ini muncul setiap {currentReminder.interval} menit
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => dismissReminder(true)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            Ingatkan Lagi
          </button>
          <button
            onClick={() => dismissReminder(false)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${currentReminder.bgColor.replace("100", "500").replace("/20", "")}`}
          >
            OK
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
