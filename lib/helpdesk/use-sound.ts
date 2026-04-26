"use client"

import { useCallback, useRef } from "react"

export function useSoundEffect() {
  const audioCtxRef = useRef<AudioContext | null>(null)

  const getCtx = () => {
    if (typeof window === "undefined") return null
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass()
      }
    }
    if (audioCtxRef.current?.state === "suspended") {
      void audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  const playPop = useCallback(() => {
    const ctx = getCtx()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.type = "sine"
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1)
    
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.1)
  }, [])

  const playChime = useCallback(() => {
    const ctx = getCtx()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1) // C#6
    
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  }, [])

  return { playPop, playChime }
}
