"use client"

import { AlertTriangle, Phone, MessageCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { subscribeSettings, type EmergencyContact } from "@/lib/helpdesk/settings-service"
import { CONTACTS_FALLBACK } from "@/lib/helpdesk/data"

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>(CONTACTS_FALLBACK)

  useEffect(() => {
    const unsub = subscribeSettings((s) => {
      if (s.emergencyContacts.length > 0) setContacts(s.emergencyContacts)
    })
    return () => unsub()
  }, [])

  return (
    <section
      aria-labelledby="emergency-title"
      className="relative rounded-3xl border border-red-200/70 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 backdrop-blur-md p-6 shadow-sm overflow-hidden"
    >
      {/* Subtle ambient glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 mb-5">
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          {/* Animated pulse */}
          <span className="absolute -top-1 -right-1 w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        </div>
        <div>
          <h2
            id="emergency-title"
            className="text-base font-bold tracking-tight text-red-900 dark:text-red-100"
          >
            Kontak Darurat
          </h2>
          <p className="text-[11px] text-red-700/70 dark:text-red-300/60 font-medium">
            Untuk kendala mendesak di luar jam layanan
          </p>
        </div>
        <span className="ml-auto inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/20 border border-red-200/60 dark:border-red-500/30 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
          Darurat
        </span>
      </div>

      {/* Contact cards */}
      <ul className="relative z-10 grid gap-3 sm:grid-cols-3">
        {contacts.map((c) => (
          <li
            key={c.label}
            className="group flex flex-col gap-3 rounded-2xl border border-red-200/60 dark:border-red-900/40 bg-white/70 dark:bg-red-950/20 backdrop-blur-sm p-4 hover:border-red-300 dark:hover:border-red-700/60 hover:shadow-md transition-all duration-300"
          >
            <div>
              <p className="text-sm font-bold text-red-900 dark:text-red-100 leading-tight">
                {c.label}
              </p>
              <p className="text-xs text-red-700/70 dark:text-red-300/60 mt-0.5 font-medium">
                {c.role}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-red-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {c.phone}
              </a>
              {c.whatsapp && (
                <a
                  href={`https://wa.me/${c.whatsapp}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200/80 dark:border-red-700/50 bg-white/80 dark:bg-red-950/30 px-3 py-1.5 text-xs font-bold text-red-700 dark:text-red-300 shadow-sm transition-all hover:scale-105 active:scale-95 hover:border-red-300 dark:hover:border-red-600/60"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  WhatsApp
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
