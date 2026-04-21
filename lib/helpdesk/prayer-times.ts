"use client"

// Prayer times using Aladhan API for automatic calculation
// Location: Cibadak, Sukabumi, West Java
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

export type PrayerSchedule = {
  hour: number
  minute: number
  lockDuration: number
}

// Lock duration: 10 minutes for each prayer
const LOCK_DURATION_MINUTES = 10

// Cibadak, Sukabumi coordinates
const LATITUDE = -6.78
const LONGITUDE = 106.95

// Cache prayer times for today
let cachedPrayerTimes: PrayerTime[] | null = null
let cachedDate: string | null = null

// Fallback schedule if API fails
const FALLBACK_SCHEDULE: Record<PrayerName, PrayerSchedule> = {
  Subuh: { hour: 4, minute: 35, lockDuration: LOCK_DURATION_MINUTES },
  Dhuhur: { hour: 12, minute: 5, lockDuration: LOCK_DURATION_MINUTES },
  Ashar: { hour: 15, minute: 15, lockDuration: LOCK_DURATION_MINUTES },
  Maghrib: { hour: 18, minute: 5, lockDuration: LOCK_DURATION_MINUTES },
  Isya: { hour: 19, minute: 15, lockDuration: LOCK_DURATION_MINUTES },
}

// Store current schedule (from API or fallback)
let currentSchedule: Record<PrayerName, PrayerSchedule> = { ...FALLBACK_SCHEDULE }

/**
 * Fetch prayer times from Aladhan API
 */
async function fetchPrayerTimesFromAPI(): Promise<Record<PrayerName, PrayerSchedule> | null> {
  try {
    const today = new Date()
    const day = today.getDate()
    const month = today.getMonth() + 1
    const year = today.getFullYear()

    // Aladhan API - Free, no API key required
    const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${LATITUDE}&longitude=${LONGITUDE}&method=20`

    const response = await fetch(url, { next: { revalidate: 3600 } }) // Cache for 1 hour

    if (!response.ok) return null

    const data = await response.json()

    if (data.code !== 200 || !data.data?.timings) return null

    const timings = data.data.timings

    // Parse times from API (format: "HH:MM")
    const parseTime = (timeStr: string): { hour: number; minute: number } => {
      const [hour, minute] = timeStr.split(":").map(Number)
      return { hour, minute }
    }

    return {
      Subuh: { ...parseTime(timings.Fajr), lockDuration: LOCK_DURATION_MINUTES },
      Dhuhur: { ...parseTime(timings.Dhuhr), lockDuration: LOCK_DURATION_MINUTES },
      Ashar: { ...parseTime(timings.Asr), lockDuration: LOCK_DURATION_MINUTES },
      Maghrib: { ...parseTime(timings.Maghrib), lockDuration: LOCK_DURATION_MINUTES },
      Isya: { ...parseTime(timings.Isha), lockDuration: LOCK_DURATION_MINUTES },
    }
  } catch (error) {
    console.error("Failed to fetch prayer times:", error)
    return null
  }
}

/**
 * Get today's prayer times (with API fetch)
 */
export async function getTodayPrayerTimesAsync(): Promise<PrayerTime[]> {
  const today = new Date().toDateString()

  // Return cached if same day
  if (cachedPrayerTimes && cachedDate === today) {
    return cachedPrayerTimes
  }

  // Try to fetch from API
  const apiSchedule = await fetchPrayerTimesFromAPI()
  if (apiSchedule) {
    currentSchedule = apiSchedule
  }

  // Build times array
  const times: PrayerTime[] = []
  for (const [name, schedule] of Object.entries(currentSchedule)) {
    const timestamp = schedule.hour * 60 * 60 * 1000 + schedule.minute * 60 * 1000
    times.push({
      name: name as PrayerName,
      time: `${String(schedule.hour).padStart(2, "0")}:${String(schedule.minute).padStart(2, "0")}`,
      timestamp,
    })
  }

  const sorted = times.sort((a, b) => a.timestamp - b.timestamp)

  // Cache for today
  cachedPrayerTimes = sorted
  cachedDate = today

  return sorted
}

/**
 * Get today's prayer times (synchronous, uses cached or fallback)
 */
export function getTodayPrayerTimes(): PrayerTime[] {
  const today = new Date().toDateString()

  // Return cached if available
  if (cachedPrayerTimes && cachedDate === today) {
    return cachedPrayerTimes
  }

  // Use current schedule (may be from API or fallback)
  const times: PrayerTime[] = []
  for (const [name, schedule] of Object.entries(currentSchedule)) {
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
    const schedule = currentSchedule[prayer.name]
    const endTimestamp = prayer.timestamp + schedule.lockDuration * 60 * 1000

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

/**
 * Get current schedule (for countdown)
 */
export function getCurrentSchedule(): Record<PrayerName, PrayerSchedule> {
  return currentSchedule
}

// Export for backwards compatibility
export const PRAYER_SCHEDULE = FALLBACK_SCHEDULE
