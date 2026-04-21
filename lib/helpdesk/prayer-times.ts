"use client"

// Prayer times calculation for Cibadak, Sukabumi, West Java
// Coordinates: -6.78° S, 106.95° E
// Timezone: WIB (UTC+7)

export type PrayerName = "Subuh" | "Dhuhur" | "Ashar" | "Maghrib" | "Isya"

export type PrayerTime = {
  name: PrayerName
  time: string // HH:MM format
  timestamp: number // milliseconds since midnight
}

export type PrayerState = {
  current: PrayerName | null
  next: PrayerTime | null
  isLocked: boolean
  remainingMinutes: number
}

// Approximate prayer times for Cibadak (can be adjusted)
// These are standard times, actual may vary slightly
const PRAYER_SCHEDULE: Record<PrayerName, { hour: number; minute: number; duration: number }> = {
  Subuh: { hour: 4, minute: 35, duration: 30 },    // 04:35 - 05:05
  Dhuhur: { hour: 12, minute: 5, duration: 30 },   // 12:05 - 12:35
  Ashar: { hour: 15, minute: 15, duration: 30 },   // 15:15 - 15:45
  Maghrib: { hour: 18, minute: 5, duration: 30 },  // 18:05 - 18:35
  Isya: { hour: 19, minute: 15, duration: 30 },    // 19:15 - 19:45
}

/**
 * Get today's prayer times
 */
export function getTodayPrayerTimes(): PrayerTime[] {
  const now = new Date()
  const times: PrayerTime[] = []

  for (const [name, schedule] of Object.entries(PRAYER_SCHEDULE)) {
    const timestamp = schedule.hour * 60 * 60 * 1000 + schedule.minute * 60 * 1000
    times.push({
      name: name as PrayerName,
      time: `${String(schedule.hour).padStart(2, "0")}:${String(schedule.minute).padStart(2, "0")}`,
      timestamp,
    })
  }

  return times.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Get current prayer state
 */
export function getPrayerState(): PrayerState {
  const now = new Date()
  const currentMs = now.getHours() * 60 * 60 * 1000 + now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000
  const prayerTimes = getTodayPrayerTimes()

  // Check if currently in prayer time
  for (const prayer of prayerTimes) {
    const schedule = PRAYER_SCHEDULE[prayer.name]
    const endTimestamp = prayer.timestamp + schedule.duration * 60 * 1000

    if (currentMs >= prayer.timestamp && currentMs < endTimestamp) {
      const remainingMs = endTimestamp - currentMs
      return {
        current: prayer.name,
        next: prayerTimes.find(p => p.timestamp > prayer.timestamp) || prayerTimes[0],
        isLocked: true,
        remainingMinutes: Math.ceil(remainingMs / 60000),
      }
    }
  }

  // Not in prayer time - find next prayer
  const nextPrayer = prayerTimes.find(p => p.timestamp > currentMs) || prayerTimes[0]
  const minutesUntil = nextPrayer.timestamp > currentMs
    ? Math.ceil((nextPrayer.timestamp - currentMs) / 60000)
    : Math.ceil((24 * 60 * 60 * 1000 - currentMs + nextPrayer.timestamp) / 60000)

  return {
    current: null,
    next: nextPrayer,
    isLocked: false,
    remainingMinutes: minutesUntil,
  }
}

/**
 * Check if should show reminder (5 minutes before prayer)
 */
export function shouldShowReminder(): { show: boolean; prayer: PrayerName | null; minutesUntil: number } {
  const now = new Date()
  const currentMs = now.getHours() * 60 * 60 * 1000 + now.getMinutes() * 60 * 1000
  const prayerTimes = getTodayPrayerTimes()

  for (const prayer of prayerTimes) {
    const reminderTime = prayer.timestamp - 5 * 60 * 1000 // 5 minutes before
    const endTime = prayer.timestamp + 2 * 60 * 1000 // 2 minutes window for reminder

    if (currentMs >= reminderTime && currentMs < endTime) {
      const minutesUntil = Math.ceil((prayer.timestamp - currentMs) / 60000)
      return {
        show: true,
        prayer: prayer.name,
        minutesUntil: Math.max(0, minutesUntil),
      }
    }
  }

  return { show: false, prayer: null, minutesUntil: 0 }
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(minutes: number): string {
  if (minutes < 1) return "segera"
  if (minutes < 60) return `${minutes} menit`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`
}
