"use client"

import { useEffect, useRef, useCallback } from "react"

export type NotificationOptions = {
  title: string
  body: string
  icon?: string
  tag?: string
  onClick?: () => void
}

export function useBrowserNotification() {
  const permissionRef = useRef<NotificationPermission>("default")

  // Check permission on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    permissionRef.current = Notification.permission
  }, [])

  // Request permission
  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false
    }
    try {
      const result = await Notification.requestPermission()
      permissionRef.current = result
      return result === "granted"
    } catch {
      return false
    }
  }, [])

  // Show notification
  const showNotification = useCallback((options: NotificationOptions) => {
    if (typeof window === "undefined" || !("Notification" in window)) return null
    if (permissionRef.current !== "granted") return null

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || "/icon-192.png",
        tag: options.tag,
      })

      if (options.onClick) {
        notification.onclick = () => {
          options.onClick?.()
          notification.close()
          window.focus()
        }
      }

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000)

      return notification
    } catch {
      return null
    }
  }, [])

  // Check if supported
  const isSupported = typeof window !== "undefined" && "Notification" in window
  const isGranted = permissionRef.current === "granted"

  return {
    isSupported,
    isGranted,
    requestPermission,
    showNotification,
  }
}
