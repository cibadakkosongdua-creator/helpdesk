"use client"

import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore"
import { getFirebase } from "./firebase"
import { CONTACTS_FALLBACK, FAQ_FALLBACK, SOCIAL_LINKS_FALLBACK, SERVICES_FALLBACK } from "./data"

/* ---------- Types ---------- */

export type ServiceStatus = "online" | "offline" | "maintenance"

export type EmergencyContact = {
  label: string
  role: string
  phone: string
  whatsapp?: string
}

export type FaqItem = {
  question: string
  answer: string
}

export type ServiceConfig = {
  id: string
  name: string
  url: string
  description: string
}

export type SocialLink = {
  id: string
  platform: string // e.g. 'Instagram', 'YouTube', 'Facebook'
  url: string
  icon?: string // lucide icon name
}

export type PublicStats = {
  totalTickets: number
  totalSurveys: number
  avgRating: number
  updatedAt?: number
}

export type AnnouncementConfig = {
  active: boolean
  text: string
  type: "info" | "warning" | "success"
  link?: string
  linkLabel?: string
}

export type MaintenanceSchedule = {
  id: string
  serviceId: string
  label: string
  from: number  // Unix ms
  to: number    // Unix ms
}

export type ReplyTemplate = {
  id: string
  title: string
  content: string
}

export type WellnessConfig = {
  prayerLockEnabled: boolean
  healthToastEnabled: boolean
}

export type AppSettings = {
  emergencyContacts: EmergencyContact[]
  serviceStatus: Record<string, ServiceStatus>
  faq: FaqItem[]
  adminEmails: string[]
  services: ServiceConfig[]
  socialLinks: SocialLink[]
  wellness?: WellnessConfig
  publicStats?: PublicStats
  announcement?: AnnouncementConfig
  maintenanceSchedules?: MaintenanceSchedule[]
  replyTemplates?: ReplyTemplate[]
}

/* ---------- Defaults ---------- */

export const DEFAULT_SETTINGS: AppSettings = {
  emergencyContacts: CONTACTS_FALLBACK,
  serviceStatus: Object.fromEntries(SERVICES_FALLBACK.map((s) => [s.id, "online" as ServiceStatus])),
  faq: FAQ_FALLBACK,
  adminEmails: [],
  services: SERVICES_FALLBACK.map(({ id, name, url, description }) => ({ id, name, url, description })),
  socialLinks: SOCIAL_LINKS_FALLBACK,
  wellness: {
    prayerLockEnabled: true,
    healthToastEnabled: true,
  },
}

/* ---------- Firestore ---------- */

const SETTINGS_DOC = "app"

function settingsRef() {
  const { db } = getFirebase()
  if (!db) return null
  return doc(db, "settings", SETTINGS_DOC)
}

/** Subscribe to all settings — real-time */
export function subscribeSettings(onUpdate: (s: AppSettings) => void): () => void {
  const ref = settingsRef()
  if (!ref) {
    onUpdate(DEFAULT_SETTINGS)
    return () => {}
  }
  const unsub = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const raw = snap.data()
      onUpdate({
        emergencyContacts: raw.emergencyContacts ?? DEFAULT_SETTINGS.emergencyContacts,
        serviceStatus: raw.serviceStatus ?? DEFAULT_SETTINGS.serviceStatus,
        faq: raw.faq ?? DEFAULT_SETTINGS.faq,
        adminEmails: raw.adminEmails ?? DEFAULT_SETTINGS.adminEmails,
        services: raw.services ?? DEFAULT_SETTINGS.services,
        socialLinks: raw.socialLinks ?? DEFAULT_SETTINGS.socialLinks,
        publicStats: raw.publicStats ?? undefined,
        announcement: raw.announcement ?? undefined,
        maintenanceSchedules: raw.maintenanceSchedules ?? [],
        replyTemplates: raw.replyTemplates ?? [],
      })
    } else {
      onUpdate(DEFAULT_SETTINGS)
    }
  }, () => {
    onUpdate(DEFAULT_SETTINGS)
  })
  return unsub
}

/** Get settings once (no subscription) */
export async function getSettings(): Promise<AppSettings> {
  const ref = settingsRef()
  if (!ref) return DEFAULT_SETTINGS
  try {
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const raw = snap.data()
      return {
        emergencyContacts: raw.emergencyContacts ?? DEFAULT_SETTINGS.emergencyContacts,
        serviceStatus: raw.serviceStatus ?? DEFAULT_SETTINGS.serviceStatus,
        faq: raw.faq ?? DEFAULT_SETTINGS.faq,
        adminEmails: raw.adminEmails ?? DEFAULT_SETTINGS.adminEmails,
        services: raw.services ?? DEFAULT_SETTINGS.services,
        socialLinks: raw.socialLinks ?? DEFAULT_SETTINGS.socialLinks,
        announcement: raw.announcement ?? undefined,
        maintenanceSchedules: raw.maintenanceSchedules ?? [],
        replyTemplates: raw.replyTemplates ?? [],
      }
    }
  } catch (err) {
    console.warn("[helpdesk] getSettings error:", (err as Error)?.message)
  }
  return DEFAULT_SETTINGS
}

/** Save entire settings document */
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const ref = settingsRef()
  if (!ref) throw new Error("Firebase belum terkonfigurasi.")
  await setDoc(ref, settings, { merge: true })
}

/* ---------- Convenience: save single section ---------- */

export const saveEmergencyContacts = (contacts: EmergencyContact[]) =>
  saveSettings({ emergencyContacts: contacts })

export const saveServiceStatus = (status: Record<string, ServiceStatus>) =>
  saveSettings({ serviceStatus: status })

export const saveFaq = (faq: FaqItem[]) =>
  saveSettings({ faq })

export const saveAdminEmails = (emails: string[]) =>
  saveSettings({ adminEmails: emails })

export const saveServices = async (services: ServiceConfig[]) => {
  // Auto-add "online" status for new services that don't have a status entry yet
  const ref = settingsRef()
  if (ref) {
    try {
      const snap = await getDoc(ref)
      const existing: Record<string, ServiceStatus> = snap.exists()
        ? (snap.data().serviceStatus ?? {})
        : {}
      const updated = { ...existing }
      for (const s of services) {
        if (s.id && !(s.id in updated)) {
          updated[s.id] = "online"
        }
      }
      await saveSettings({ services, serviceStatus: updated })
      return
    } catch {
      /* fall through to simple save */
    }
  }
  await saveSettings({ services })
}

export const saveSocialLinks = (socialLinks: SocialLink[]) =>
  saveSettings({ socialLinks })

export const saveAnnouncement = (announcement: AnnouncementConfig) =>
  saveSettings({ announcement })

export const saveMaintenanceSchedules = (maintenanceSchedules: MaintenanceSchedule[]) =>
  saveSettings({ maintenanceSchedules })

export const saveReplyTemplates = (replyTemplates: ReplyTemplate[]) =>
  saveSettings({ replyTemplates })
