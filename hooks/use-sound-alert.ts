"use client"

import { useCallback, useRef } from "react"

// Simple beep sound using Web Audio API
export function useSoundAlert() {
  const audioContextRef = useRef<AudioContext | null>(null)

  const playSound = useCallback((type: "new-ticket" | "new-message" | "success" = "new-ticket") => {
    if (typeof window === "undefined") return

    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current

      // Create oscillator for beep
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Different sounds for different types
      switch (type) {
        case "new-ticket":
          // Rising tone - attention grabbing
          oscillator.frequency.setValueAtTime(440, ctx.currentTime) // A4
          oscillator.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1) // C#5
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2) // E5
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.3)
          break

        case "new-message":
          // Short double beep
          oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.1)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.1)
          
          // Second beep
          const osc2 = ctx.createOscillator()
          const gain2 = ctx.createGain()
          osc2.connect(gain2)
          gain2.connect(ctx.destination)
          osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15)
          gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15)
          gain2.gain.setValueAtTime(0.01, ctx.currentTime + 0.25)
          osc2.start(ctx.currentTime + 0.15)
          osc2.stop(ctx.currentTime + 0.25)
          break

        case "success":
          // Happy ascending tone
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1) // E5
          oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2) // G5
          gainNode.gain.setValueAtTime(0.25, ctx.currentTime)
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.35)
          oscillator.start(ctx.currentTime)
          oscillator.stop(ctx.currentTime + 0.35)
          break
      }
    } catch (err) {
      console.warn("[sound] Failed to play:", err)
    }
  }, [])

  return { playSound }
}
