"use client"

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
  limit as fsLimit,
} from "firebase/firestore"
import { getFirebase } from "./firebase"
import { sendEmail, emailGuestConfirmation } from "./email-service"

/* ---------- Types ---------- */

export type Guest = {
  id: string
  name: string
  category: "Dinas" | "Orang Tua" | "Umum"
  email?: string
  purpose: string
  phone?: string
  checkInTime: number
  checkOutTime?: number
  status: "checked-in" | "checked-out"
  notes?: string
}

const GUESTS_COL = "guests"
const GUESTS_LS = "helpdesk_sdn02_guests_v1"

/* ---------- localStorage mirror ---------- */

function lsRead<T>(k: string): T[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(k) || "[]") as T[]
  } catch {
    return []
  }
}

function lsWrite<T>(k: string, arr: T[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(k, JSON.stringify(arr))
  } catch {
    /* quota may exceed — ignore */
  }
}

/* ---------- helpers ---------- */

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis()
  if (typeof v === "number") return v
  if (v && typeof v === "object" && "seconds" in (v as any)) {
    const s = (v as any).seconds as number
    return s * 1000
  }
  return Date.now()
}

function sanitize<T extends object>(obj: T): T {
  const res = { ...obj }
  Object.keys(res).forEach((key) => {
    if ((res as any)[key] === undefined || (res as any)[key] === null) {
      delete (res as any)[key]
    }
  })
  return res
}

function normalizeGuest(id: string, data: any): Guest {
  return {
    id,
    name: data.name ?? "",
    category: (data.category as "Dinas" | "Orang Tua" | "Umum") ?? "Umum",
    email: data.email ?? undefined,
    purpose: data.purpose ?? "",
    phone: data.phone ?? undefined,
    checkInTime: toMillis(data.checkInTime),
    checkOutTime: data.checkOutTime ? toMillis(data.checkOutTime) : undefined,
    status: (data.status as "checked-in" | "checked-out") ?? "checked-in",
    notes: data.notes ?? undefined,
  }
}

/* ---------- Guests ---------- */

export function subscribeGuests(cb: (guests: Guest[]) => void): () => void {
  const { db } = getFirebase()
  cb(lsRead<Guest>(GUESTS_LS).sort((a, b) => b.checkInTime - a.checkInTime))

  if (!db) return () => {}
  const q = query(collection(db, GUESTS_COL), orderBy("checkInTime", "desc"))
  try {
    return onSnapshot(
      q,
      (snap) => {
        const list: Guest[] = snap.docs.map((d) => normalizeGuest(d.id, d.data()))
        lsWrite(GUESTS_LS, list)
        cb(list)
      },
      (err) => {
        console.warn("[helpdesk] guests subscribe error:", err?.message)
        cb(lsRead<Guest>(GUESTS_LS).sort((a, b) => b.checkInTime - a.checkInTime))
      },
    )
  } catch (err) {
    console.warn("[helpdesk] guests subscribe threw:", (err as Error)?.message)
    return () => {}
  }
}

export function subscribeGuestsByDate(
  startDate: number,
  endDate: number,
  cb: (guests: Guest[]) => void,
): () => void {
  // Use the main subscription and filter client-side to avoid Firestore index issues
  return subscribeGuests((allGuests) => {
    const filtered = allGuests
      .filter((g) => g.checkInTime >= startDate && g.checkInTime <= endDate)
    cb(filtered)
  })
}

export async function saveGuest(
  g: Omit<Guest, "id" | "checkInTime" | "status">,
): Promise<Guest> {
  const { db } = getFirebase()
  const nowMs = Date.now()
  const basePayload = {
    ...g,
    checkInTime: nowMs,
    status: "checked-in" as const,
  }

  try {
    if (db) {
      const ref = await addDoc(collection(db, GUESTS_COL), sanitize(basePayload))
      const created: Guest = { ...basePayload, id: ref.id }
      const list = lsRead<Guest>(GUESTS_LS)
      list.unshift(created)
      lsWrite(GUESTS_LS, list)
      
      // Send confirmation email if email provided via API route
      if (g.email) {
        try {
          console.log("[helpdesk] Attempting to send guest confirmation email via API route to:", g.email)
          const appUrl = typeof window !== "undefined" ? window.location.origin : "https://helpdesk.sdn02cibadak.sch.id"
          const checkInTime = new Date(nowMs).toLocaleString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          
          const response = await fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "guest-confirmation",
              data: {
                guestEmail: g.email,
                guestName: g.name,
                category: g.category,
                purpose: g.purpose,
                checkInTime,
              },
            }),
          })
          
          const result = await response.json()
          console.log("[helpdesk] Guest confirmation email API result:", result)
          
          if (result.success) {
            console.log("[helpdesk] Guest confirmation email sent to:", g.email)
          } else {
            console.warn("[helpdesk] Guest confirmation email API failed:", result.error)
          }
        } catch (emailErr) {
          // Email sending is optional - don't fail the guest save if email fails
          console.warn("[helpdesk] Guest confirmation email API call failed (optional feature):", (emailErr as Error)?.message)
        }
      } else {
        console.log("[helpdesk] No email provided, skipping email confirmation")
      }
      
      return created
    }
  } catch (err) {
    console.warn("[helpdesk] saveGuest firestore fail:", (err as Error)?.message)
  }
  const created: Guest = {
    ...basePayload,
    id: `LOCAL-${nowMs.toString(36).toUpperCase()}`,
  }
  const list = lsRead<Guest>(GUESTS_LS)
  list.unshift(created)
  lsWrite(GUESTS_LS, list)
  return created
}

export async function checkOutGuest(
  id: string,
  notes?: string,
): Promise<void> {
  const { db } = getFirebase()
  const nowMs = Date.now()
  
  const list = lsRead<Guest>(GUESTS_LS).map((g) =>
    g.id === id ? { ...g, checkOutTime: nowMs, status: "checked-out" as const, notes } : g,
  )
  lsWrite(GUESTS_LS, list)

  try {
    if (db && !id.startsWith("LOCAL-")) {
      await updateDoc(doc(db, GUESTS_COL, id), {
        checkOutTime: nowMs,
        status: "checked-out",
        notes,
      })
    }
  } catch (err) {
    console.warn("[helpdesk] checkOutGuest fail:", (err as Error)?.message)
  }
}

export async function deleteGuest(id: string): Promise<void> {
  const { db } = getFirebase()
  
  // Delete from Firestore first to trigger realtime update
  try {
    if (db && !id.startsWith("LOCAL-")) {
      await deleteDoc(doc(db, GUESTS_COL, id))
    }
  } catch (err) {
    console.warn("[helpdesk] deleteGuest firestore fail:", (err as Error)?.message)
  }
  
  // Then update localStorage
  const list = lsRead<Guest>(GUESTS_LS)
  lsWrite(GUESTS_LS, list.filter((g) => g.id !== id))
}

export async function getGuestStats(
  startDate: number,
  endDate: number,
): Promise<{ total: number; checkedIn: number; checkedOut: number }> {
  const local = lsRead<Guest>(GUESTS_LS).filter(
    (g) => g.checkInTime >= startDate && g.checkInTime <= endDate,
  )
  const { db } = getFirebase()
  
  if (!db) {
    return {
      total: local.length,
      checkedIn: local.filter((g) => g.status === "checked-in").length,
      checkedOut: local.filter((g) => g.status === "checked-out").length,
    }
  }

  try {
    const q = query(
      collection(db, GUESTS_COL),
      where("checkInTime", ">=", startDate),
      where("checkInTime", "<=", endDate),
    )
    const snap = await getDocs(q)
    const guests = snap.docs.map((d) => normalizeGuest(d.id, d.data()))
    return {
      total: guests.length,
      checkedIn: guests.filter((g) => g.status === "checked-in").length,
      checkedOut: guests.filter((g) => g.status === "checked-out").length,
    }
  } catch {
    return {
      total: local.length,
      checkedIn: local.filter((g) => g.status === "checked-in").length,
      checkedOut: local.filter((g) => g.status === "checked-out").length,
    }
  }
}
