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
      className="rounded-2xl border border-red-200/70 bg-red-50/80 p-5 shadow-sm backdrop-blur dark:border-red-900/50 dark:bg-red-950/40"
    >
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
        <h2
          id="emergency-title"
          className="text-base font-semibold text-red-900 dark:text-red-100"
        >
          Kontak Darurat
        </h2>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-red-900/80 dark:text-red-100/80">
        Untuk kendala mendesak di luar jam layanan, hubungi langsung melalui
        telepon atau WhatsApp.
      </p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {contacts.map((c) => (
          <li
            key={c.label}
            className="flex flex-col gap-2 rounded-xl border border-red-200/60 bg-white/80 p-3 dark:border-red-900/40 dark:bg-red-950/30"
          >
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                {c.label}
              </p>
              <p className="text-xs text-red-800/70 dark:text-red-200/70">
                {c.role}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {c.phone}
              </a>
              {c.whatsapp && (
                <a
                  href={`https://wa.me/${c.whatsapp}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-600/40 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:bg-red-950/40 dark:text-red-100"
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
