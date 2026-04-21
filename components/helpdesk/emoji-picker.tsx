"use client"

import { Smile } from "lucide-react"
import { useEffect, useRef, useState } from "react"

// Common emojis for quick access
const COMMON_EMOJIS = [
  "\uD83D\uDC4D", "\uD83D\uDC4E", "\u2764\uFE0F", "\uD83D\uDD25", "\u2B50", "\u2705",
  "\uD83D\uDE00", "\uD83D\uDE03", "\uD83D\uDE02", "\uD83D\uDE09", "\uD83D\uDE10", "\uD83D\uDE22",
  "\uD83D\uDE20", "\uD83E\uDD14", "\uD83D\uDC4B", "\uD83D\uDC4F", "\uD83D\uDE4F", "\uD83D\uDE46",
  "\u270C\uFE0F", "\u270A", "\uD83D\uDE4B", "\uD83D\uDCAA", "\uD83D\uDE80", "\uD83C\uDF89",
]

const EMOJI_LABELS: Record<string, string> = {
  "\uD83D\uDC4D": "thumbsup",
  "\uD83D\uDC4E": "thumbsdown",
  "\u2764\uFE0F": "heart",
  "\uD83D\uDD25": "fire",
  "\u2B50": "star",
  "\u2705": "check",
  "\uD83D\uDE00": "smile",
  "\uD83D\uDE03": "grin",
  "\uD83D\uDE02": "joy",
  "\uD83D\uDE09": "wink",
  "\uD83D\uDE10": "neutral",
  "\uD83D\uDE22": "cry",
  "\uD83D\uDE20": "angry",
  "\uD83E\uDD14": "thinking",
  "\uD83D\uDC4B": "wave",
  "\uD83D\uDC4F": "clap",
  "\uD83D\uDE4F": "pray",
  "\uD83D\uDE46": "ok",
  "\u270C\uFE0F": "peace",
  "\u270A": "fist",
  "\uD83D\uDE4B": "raised",
  "\uD83D\uDCAA": "muscle",
  "\uD83D\uDE80": "rocket",
  "\uD83C\uDF89": "party",
}

export function EmojiPicker({
  onSelect,
  className = "",
}: {
  onSelect: (emoji: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-300 transition-colors"
        title="Emoji"
      >
        <Smile className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-2 grid grid-cols-6 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelect(emoji)
                  setOpen(false)
                }}
                className="w-7 h-7 flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                title={EMOJI_LABELS[emoji] || ""}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
