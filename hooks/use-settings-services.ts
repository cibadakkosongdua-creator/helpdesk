"use client"

import { useEffect, useState } from "react"
import { subscribeSettings, type ServiceConfig } from "@/lib/helpdesk/settings-service"
import { SERVICES } from "@/lib/helpdesk/data"
import { AlertCircle, type LucideIcon } from "lucide-react"

export type ServiceOption = { value: string; label: string }

export type ServiceWithIcon = ServiceConfig & { icon: LucideIcon }

/**
 * Subscribes to Firestore settings and returns the dynamic services list
 * merged with static icons from data.ts.
 * Falls back to static SERVICES when settings haven't loaded yet.
 */
export function useSettingsServices() {
  const [services, setServices] = useState<ServiceWithIcon[]>(
    SERVICES.map(({ id, name, url, description, icon }) => ({ id, name, url, description, icon }))
  )

  useEffect(() => {
    const unsub = subscribeSettings((s) => {
      if (s.services.length > 0) {
        setServices(
          s.services.map((ds) => {
            const match = SERVICES.find((st) => st.id === ds.id)
            return { ...ds, icon: match?.icon ?? AlertCircle }
          })
        )
      }
    })
    return () => unsub()
  }, [])

  return services
}

/** Convenience: returns services as { value, label } options for selects/filters */
export function useServiceOptions(): ServiceOption[] {
  return useSettingsServices().map((s) => ({ value: s.id, label: s.name }))
}
