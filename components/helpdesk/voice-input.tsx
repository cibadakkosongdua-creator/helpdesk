"use client"

import { Mic, MicOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"

/**
 * Web Speech API dictation (bahasa Indonesia default). Progressively enhanced:
 * jika browser tidak mendukung, tombol disembunyikan.
 */
export function VoiceInput({
  onTranscript,
  lang = "id-ID",
  compact = false,
}: {
  onTranscript: (text: string) => void
  lang?: string
  compact?: boolean
}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    setSupported(Boolean(SR))
  }, [])

  const start = () => {
    if (typeof window === "undefined") return
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    try {
      const rec = new SR()
      rec.lang = lang
      rec.interimResults = false
      rec.continuous = false
      rec.onresult = (ev: any) => {
        let transcript = ""
        for (let i = 0; i < ev.results.length; i++) {
          transcript += ev.results[i][0].transcript
        }
        if (transcript) onTranscript(transcript.trim())
      }
      rec.onend = () => setListening(false)
      rec.onerror = () => setListening(false)
      rec.start()
      recRef.current = rec
      setListening(true)
      if (navigator.vibrate) navigator.vibrate(10)
    } catch {
      setListening(false)
    }
  }

  const stop = () => {
    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`inline-flex items-center justify-center transition-all ${
        compact && !listening ? "p-2" : "gap-1.5 px-3 py-1.5"
      } rounded-lg text-xs font-bold ${
        listening
          ? "bg-red-500/90 text-white animate-pulse"
          : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
      }`}
      aria-label={listening ? "Hentikan rekaman suara" : "Mulai rekaman suara"}
    >
      {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      {(!compact || listening) && (listening ? "Berhenti" : "Rekam Suara")}
    </button>
  )
}
