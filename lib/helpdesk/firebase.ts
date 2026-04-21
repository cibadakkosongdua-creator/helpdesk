"use client"

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import { getFirestore, initializeFirestore, persistentLocalCache, type Firestore } from "firebase/firestore"

// Config loaded from environment variables (.env.local)
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
}

type FirebaseInstances = { app: FirebaseApp; auth: Auth; db: Firestore }

const WIN_KEY = "__helpdesk_firebase" as const

/**
 * Lazily initialize Firebase on the client. Returns null on the server.
 * Instances are stored on `window` to survive Next.js HMR.
 */
export function getFirebase(): { app: FirebaseApp | null; auth: Auth | null; db: Firestore | null } {
  if (typeof window === "undefined") return { app: null, auth: null, db: null }

  const cached = (window as any)[WIN_KEY] as FirebaseInstances | undefined
  if (cached) return cached

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  const auth = getAuth(app)
  let db: Firestore
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache(),
    })
  } catch {
    db = getFirestore(app)
  }

  const instances = { app, auth, db }
  ;(window as any)[WIN_KEY] = instances
  return instances
}

let _googleProvider: GoogleAuthProvider | null = null

/** Lazy-init GoogleAuthProvider to avoid server-side crashes */
export function getGoogleProvider(): GoogleAuthProvider {
  if (!_googleProvider) {
    _googleProvider = new GoogleAuthProvider()
    _googleProvider.setCustomParameters({ prompt: "select_account" })
  }
  return _googleProvider
}
