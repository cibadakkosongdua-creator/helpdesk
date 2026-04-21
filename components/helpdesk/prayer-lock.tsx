"use client"

import { Clock, Moon, Sun, Sunset, X } from "lucide-react"
import { useEffect, useState } from "react"
import { getPrayerState, getTodayPrayerTimes, type PrayerName, type PrayerState, formatTimeRemaining, shouldShowReminder } from "@/lib/helpdesk/prayer-times"

const PRAYER_ICONS: Record<PrayerName, typeof Sun> = {
  Subuh: Moon,
  Dhuhur: Sun,
  Ashar: Sun,
  Maghrib: Sunset,
  Isya: Moon,
}

const PRAYER_VERSES: Record<PrayerName, string> = {
  Subuh: '"Sesungguhnya sholat Subuh itu disaksikan malaikat" - QS 17:78',
  Dhuhur: '"Dirikanlah sholat untuk mengingat-Ku" - QS 20:14',
  Ashar: '"Peliharalah semua sholat, dan sholat wustha (Ashar)" - QS 2:238',
  Maghrib: '"Dan bertasbihlah di malam hari dan setelah sholat" - QS 50:40',
  Isya: '"Sesungguhnya orang yang mendirikan sholat malam, mereka yang baik" - QS 17:79',
}

type PrayerLockProps = {
  enabled: boolean
  onDismiss?: () => void
}

export function PrayerLock({ enabled, onDismiss }: PrayerLockProps) {
  const [state, setState] = useState<PrayerState>({ current: null, next: null, isLocked: false, remainingMinutes: 0 })
  const [showReminder, setShowReminder] = useState(false)
  const [reminderPrayer, setReminderPrayer] = useState<PrayerName | null>(null)
  const [reminderMinutes, setReminderMinutes] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const check = () => {
      const currentState = getPrayerState()
      setState(currentState)

      const reminder = shouldShowReminder()
      if (reminder.show && !dismissed) {
        setShowReminder(true)
        setReminderPrayer(reminder.prayer)
        setReminderMinutes(reminder.minutesUntil)
      }
    }

    check()
    const interval = setInterval(check, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [enabled, dismissed])

  // Reset dismissed when prayer changes
  useEffect(() => {
    if (state.current) {
      setDismissed(false)
      setShowReminder(false)
    }
  }, [state.current])

  if (!enabled) return null

  const prayerTimes = getTodayPrayerTimes()

  // Show reminder popup (5 minutes before prayer)
  if (showReminder && reminderPrayer && !state.isLocked) {
    const Icon = PRAYER_ICONS[reminderPrayer]
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-in fade-in p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Persiapan Sholat</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{reminderPrayer} dalam {reminderMinutes} menit</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowReminder(false)
                setDismissed(true)
              }}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Waktu sholat {reminderPrayer} akan tiba sebentar lagi. Persiapkan diri untuk sholat tepat waktu.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowReminder(false)
                setDismissed(true)
              }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Ingatkan Nanti
            </button>
            <button
              onClick={() => setShowReminder(false)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
            >
              Siap Sholat
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show lock screen during prayer time
  if (state.isLocked && state.current) {
    const Icon = PRAYER_ICONS[state.current]
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 animate-in fade-in p-4">
        <div className="max-w-md w-full text-center">
          {/* Prayer Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center animate-pulse">
            <Icon className="w-12 h-12 text-white" />
          </div>

          {/* Prayer Name */}
          <h1 className="text-4xl font-bold text-white mb-2">Waktu Sholat {state.current}</h1>
          <p className="text-xl text-white/70 mb-6">Saatnya mendekat kepada Allah SWT</p>

          {/* Verse */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 mb-6">
            <p className="text-white/90 italic text-sm leading-relaxed">
              {PRAYER_VERSES[state.current]}
            </p>
          </div>

          {/* Remaining Time */}
          <div className="flex items-center justify-center gap-2 text-white/60 mb-8">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Waktu tersisa: {formatTimeRemaining(state.remainingMinutes)}</span>
          </div>

          {/* Prayer Schedule */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-4">
            <p className="text-xs text-white/50 mb-3 uppercase tracking-wide">Jadwal Sholat Hari Ini</p>
            <div className="grid grid-cols-5 gap-2">
              {prayerTimes.map((prayer) => (
                <div
                  key={prayer.name}
                  className={`p-2 rounded-lg ${prayer.name === state.current ? "bg-white/20" : ""}`}
                >
                  <p className="text-[10px] text-white/50">{prayer.name}</p>
                  <p className="text-sm font-semibold text-white">{prayer.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skip Button (for non-Muslims or emergencies) */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="mt-6 text-xs text-white/40 hover:text-white/60 underline"
            >
              Lewati (untuk non-Muslim atau darurat)
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}

/**
 * Prayer status badge for navbar
 */
export function PrayerBadge() {
  const [state, setState] = useState<PrayerState>({ current: null, next: null, isLocked: false, remainingMinutes: 0 })

  useEffect(() => {
    const check = () => setState(getPrayerState())
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!state.next) return null

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
      <Clock className="w-3 h-3" />
      <span>{state.next.name} {state.next.time}</span>
    </div>
  )
}
