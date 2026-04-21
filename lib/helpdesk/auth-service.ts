"use client"

import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { getFirebase, getGoogleProvider } from "./firebase"

/* ---------- Unified Auth ---------- */

export type AuthRole = "admin" | "user"

export type AuthSession = {
  uid: string
  email: string
  name: string
  photoURL?: string
  role: AuthRole
}

// Keep legacy aliases for backward compat with admin-dashboard etc.
export type AdminSession = { email: string; name: string; photoURL?: string; mock?: boolean }
export type UserSession = AuthSession

const LOCAL_KEY = "helpdesk_sdn02_auth_v3"
const ENV_ADMIN_EMAILS = (
  (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean)
)

// Dynamic admin emails from Firestore settings (updated in real-time)
let _firestoreAdminEmails: string[] = []
export function setFirestoreAdminEmails(emails: string[]) {
  _firestoreAdminEmails = emails.map((e: string) => e.trim().toLowerCase())
}
function getAllowedAdminEmails(): string[] {
  const merged = new Set([...ENV_ADMIN_EMAILS, ..._firestoreAdminEmails])
  return Array.from(merged)
}

function readLocal(): AuthSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}

function writeLocal(session: AuthSession | null) {
  if (typeof window === "undefined") return
  if (session) localStorage.setItem(LOCAL_KEY, JSON.stringify(session))
  else localStorage.removeItem(LOCAL_KEY)
}

function toAuthSession(u: User): AuthSession {
  const email = u.email ?? ""
  const isAdmin = getAllowedAdminEmails().includes(email.toLowerCase())
  return {
    uid: u.uid,
    email,
    name: u.displayName ?? email.split("@")[0] ?? "Pengguna",
    photoURL: u.photoURL ?? undefined,
    role: isAdmin ? "admin" : "user",
  }
}

/** Convert AuthSession to legacy AdminSession shape for admin-dashboard compat */
export function toAdminSession(s: AuthSession): AdminSession {
  return {
    email: s.email,
    name: s.name,
    photoURL: s.photoURL,
    mock: false,
  }
}

export function getCurrentAuth(): AuthSession | null {
  const { auth } = getFirebase()
  if (auth?.currentUser) return toAuthSession(auth.currentUser)
  return readLocal()
}

export function subscribeAuth(cb: (s: AuthSession | null) => void): () => void {
  const { auth } = getFirebase()
  if (!auth) {
    writeLocal(null)
    cb(null)
    return () => {}
  }
  const initial = auth.currentUser ? toAuthSession(auth.currentUser) : null
  cb(initial)
  return onAuthStateChanged(auth, (u) => {
    if (u) {
      const s = toAuthSession(u)
      writeLocal(s)
      cb(s)
    } else {
      writeLocal(null)
      cb(null)
    }
  })
}

export async function signInWithGoogle(): Promise<AuthSession> {
  const { auth } = getFirebase()
  if (!auth) {
    throw new Error("Firebase tidak terkonfigurasi. Hubungi administrator.")
  }
  try {
    const cred = await signInWithPopup(auth, getGoogleProvider())
    const session = toAuthSession(cred.user)
    writeLocal(session)
    return session
  } catch (err: any) {
    const code: string = err?.code ?? ""
    if (["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(code)) {
      throw new Error("Login dibatalkan.")
    }
    throw new Error("Gagal login. Pastikan domain sudah terdaftar di Firebase Console.")
  }
}

export async function signOut() {
  writeLocal(null)
  const { auth } = getFirebase()
  if (auth) {
    try {
      await fbSignOut(auth)
    } catch {
      /* ignore */
    }
  }
}
