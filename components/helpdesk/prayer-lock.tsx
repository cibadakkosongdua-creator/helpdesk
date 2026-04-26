"use client"

import { Clock, Lock, Moon, Sun, Sunset, X } from "lucide-react"
import { useEffect, useState } from "react"
import { getPrayerState, getTodayPrayerTimes, getTodayPrayerTimesAsync, getCurrentSchedule, type PrayerName, type PrayerState, formatTimeRemaining, shouldShowReminder, dismissReminder } from "@/lib/helpdesk/prayer-times"

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

const PRAYER_GRADIENTS: Record<PrayerName, string> = {
  Subuh: "from-slate-900 via-indigo-900 to-fuchsia-900", // Fajar
  Dhuhur: "from-sky-500 via-blue-600 to-indigo-800", // Siang cerah
  Ashar: "from-amber-600 via-orange-700 to-rose-800", // Sore
  Maghrib: "from-orange-700 via-red-900 to-slate-900", // Senja
  Isya: "from-slate-950 via-blue-950 to-slate-900", // Malam gelap
}

type PrayerLockProps = {
  enabled: boolean
  onDismiss?: () => void
}

export function PrayerLock({ enabled }: PrayerLockProps) {
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<PrayerState>({ current: null, next: null, isLocked: false })
  const [showReminder, setShowReminder] = useState(false)
  const [reminderPrayer, setReminderPrayer] = useState<PrayerName | null>(null)
  const [reminderMinutes, setReminderMinutes] = useState(0)
  const [countdown, setCountdown] = useState({ minutes: 0, seconds: 0 })

  useEffect(() => {
    setMounted(true)
    setState(getPrayerState())
  }, [])

  // Fetch prayer times from API on mount
  useEffect(() => {
    if (!enabled) return
    getTodayPrayerTimesAsync().catch(() => {})
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const check = () => {
      const currentState = getPrayerState()
      setState(currentState)

      const reminder = shouldShowReminder()
      if (reminder.show) {
        setShowReminder(true)
        setReminderPrayer(reminder.prayer)
        setReminderMinutes(reminder.minutesUntil)
      } else {
        setShowReminder(false)
      }
    }

    check()
    // Check every 1 second when locked, 15 seconds when not locked
    const interval = setInterval(check, state.isLocked ? 1000 : 15000)
    return () => clearInterval(interval)
  }, [enabled, state.isLocked])

  const handleDismiss = () => {
    if (reminderPrayer) {
      dismissReminder(reminderPrayer)
    }
    setShowReminder(false)
  }

  // Countdown timer
  useEffect(() => {
    if (!state.isLocked) return

    const updateCountdown = () => {
      const now = new Date()
      const currentMs = now.getHours() * 60 * 60 * 1000 + now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000
      const prayerTimes = getTodayPrayerTimes()
      const prayer = prayerTimes.find(p => p.name === state.current)
      if (prayer) {
        const schedule = getCurrentSchedule()[prayer.name]
        const endTimestamp = prayer.timestamp + schedule.lockDuration * 60 * 1000
        const remainingMs = Math.max(0, endTimestamp - currentMs)
        const mins = Math.floor(remainingMs / 60000)
        const secs = Math.floor((remainingMs % 60000) / 1000)
        setCountdown({ minutes: mins, seconds: secs })
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [state.isLocked, state.current])

  // Hide reminder when prayer starts
  useEffect(() => {
    if (state.isLocked) {
      setShowReminder(false)
    }
  }, [state.isLocked])

  if (!mounted || !enabled) return null

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
              onClick={handleDismiss}
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
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Tutup
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold hover:scale-[1.02] active:scale-95 transition-all shadow-sm shadow-amber-500/25"
            >
              Siap Sholat
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show lock screen during prayer time (mandatory, no skip)
  if (state.isLocked && state.current) {
    const Icon = PRAYER_ICONS[state.current]
    const gradientClass = PRAYER_GRADIENTS[state.current] || "from-emerald-900 via-teal-900 to-slate-900"
    
    return (
      <div className={`fixed inset-0 z-[300] flex items-center justify-center bg-gradient-to-br ${gradientClass} animate-in fade-in duration-700 p-4`}>
        <div className="max-w-md w-full text-center">
          {/* Lock Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-white/80" />
          </div>

          {/* Lock Message */}
          <p className="text-sm text-white/60 mb-2">Aplikasi dikunci sementara</p>

          {/* Prayer Icon */}
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center animate-pulse">
            <Icon className="w-12 h-12 text-white" />
          </div>

          {/* Prayer Name */}
          <h1 className="text-4xl font-bold text-white mb-2">Waktu Sholat {state.current}</h1>
          <p className="text-lg text-white/70 mb-4">Saatnya mendekat kepada Allah SWT</p>

          {/* Countdown Timer */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 mb-4">
            <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">Aplikasi akan dibuka dalam</p>
            <div className="flex items-center justify-center gap-2">
              <div className="text-center">
                <div className="text-5xl font-bold text-white tabular-nums">
                  {String(countdown.minutes).padStart(2, "0")}
                </div>
                <p className="text-xs text-white/50 mt-1">menit</p>
              </div>
              <div className="text-4xl font-bold text-white/50 animate-pulse">:</div>
              <div className="text-center">
                <div className="text-5xl font-bold text-white tabular-nums">
                  {String(countdown.seconds).padStart(2, "0")}
                </div>
                <p className="text-xs text-white/50 mt-1">detik</p>
              </div>
            </div>
          </div>

          {/* Verse */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 mb-4">
            <p className="text-white/80 italic text-sm leading-relaxed">
              {PRAYER_VERSES[state.current]}
            </p>
          </div>

          {/* Prayer Schedule */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-4">
            <p className="text-xs text-white/50 mb-3 uppercase tracking-wide">Jadwal 5 Waktu Sholat Hari Ini</p>
            <div className="grid grid-cols-5 gap-2">
              {prayerTimes.map((prayer) => (
                <div
                  key={prayer.name}
                  className={`p-2 rounded-lg transition-all ${prayer.name === state.current ? "bg-white/20 ring-2 ring-white/30" : ""}`}
                >
                  <p className="text-[10px] text-white/50">{prayer.name}</p>
                  <p className="text-sm font-semibold text-white">{prayer.time}</p>
                </div>
              ))}
            </div>
          </div>
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
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<PrayerState>({ current: null, next: null, isLocked: false })

  useEffect(() => {
    setMounted(true)
    const check = () => setState(getPrayerState())
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted || !state.next) return null

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
      <Clock className="w-3 h-3" />
      <span>{state.next.name} {state.next.time}</span>
    </div>
  )
}
