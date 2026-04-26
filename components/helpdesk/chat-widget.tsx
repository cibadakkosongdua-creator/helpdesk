"use client"

import { Bot, ArrowUp, X, Sparkles, Minus, ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { aiChatReply } from "@/lib/helpdesk/gemini-client"
import { subscribeSettings, type AppSettings, DEFAULT_SETTINGS } from "@/lib/helpdesk/settings-service"
import { saveChatSession, updateChatSession, type ChatMessage, subscribeChatSessions, type ChatSession } from "@/lib/helpdesk/firestore-service"
import { subscribeAuth, type AuthSession } from "@/lib/helpdesk/auth-service"

type Message = { role: "ai" | "user"; text: string; isAction?: boolean }

export function ChatWidget() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [auth, setAuth] = useState<AuthSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Halo! Saya Asisten Pintar SDN 02 Cibadak. Ada yang bisa saya bantu hari ini? ✨",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showProactive, setShowProactive] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Track page scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0
      setScrollProgress(scrolled)
    }
    window.addEventListener("scroll", handleScroll)
    // Initialize on mount
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Proactive message after 5 seconds
  useEffect(() => {
    if (isOpen) return
    const timer = setTimeout(() => {
      const hasSeen = typeof window !== "undefined" && localStorage.getItem("helpdesk_proactive_seen")
      if (!hasSeen) setShowProactive(true)
    }, 5000)
    return () => clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    const unsub = subscribeAuth(setAuth)
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = subscribeSettings(setSettings)
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!auth?.uid) return
    const unsub = subscribeChatSessions(auth.uid, (_sessions: ChatSession[]) => {})
    return () => unsub()
  }, [auth?.uid])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen, isLoading])

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const userText = input.trim()
    const history = messages.filter((m) => !m.isAction)
    setMessages((prev) => [...prev, { role: "user", text: userText }])
    setInput("")
    setIsLoading(true)
    try {
      const context = {
        schoolName: "SDN 02 Cibadak",
        schoolHours: "Senin-Jumat, 07:00-15:00 WIB",
        services: settings.services.map((s) => ({ name: s.name, description: s.description })),
        faq: settings.faq,
        emergencyContacts: settings.emergencyContacts.map((c) => ({ label: c.label, phone: c.phone })),
      }
      const reply = await aiChatReply(userText, history, context)
      const newMessages: Message[] = [
        ...messages.filter((m) => !m.isAction),
        { role: "user" as const, text: userText },
        { role: "ai" as const, text: reply },
      ]
      setMessages(newMessages)

      if (auth?.uid) {
        const chatMsgs: ChatMessage[] = newMessages.map((m) => ({
          role: m.role,
          text: m.text,
          timestamp: Date.now(),
        }))
        if (currentSessionId) {
          await updateChatSession(currentSessionId, chatMsgs)
        } else {
          const id = await saveChatSession(auth.uid, chatMsgs)
          setCurrentSessionId(id)
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Maaf, asisten sedang bermasalah. Coba lagi sebentar ya." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend(e as unknown as React.FormEvent)
    }
  }

  const suggestions = ["Cara pinjam buku?", "Lupa password", "Jam sekolah?", "Lapor kendala"]

  // SVG ring metrics
  const R = 30
  const CIRC = 2 * Math.PI * R
  const dash = CIRC - (CIRC * scrollProgress) / 100

  return (
    <div className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-[100] flex flex-col items-end gap-4">

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] md:w-[400px] h-[520px] max-h-[80vh] bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-white/40 dark:border-white/8 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-6 duration-400 origin-bottom-right">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-white" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-blue-600 rounded-full" />
              </div>
              <div>
                <p className="text-sm font-black text-white tracking-tight leading-none">Asisten Pintar</p>
                <p className="text-[10px] font-semibold text-blue-100/80 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                  Online · Gemini AI
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
            {/* Suggestions — only when fresh */}
            {messages.length <= 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 pb-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="px-3 py-1.5 text-[11px] font-bold bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-slate-800 to-slate-900 dark:from-blue-600 dark:to-indigo-700 text-white rounded-[1.25rem] rounded-br-sm shadow-sm"
                      : "bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 text-slate-700 dark:text-slate-200 rounded-[1.25rem] rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex items-end gap-2 animate-in fade-in duration-300">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 px-4 py-3 rounded-[1.25rem] rounded-bl-sm flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-white/5">
            <form onSubmit={handleSend} className="flex items-end gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-2 focus-within:border-blue-400/60 dark:focus-within:border-blue-500/40 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pertanyaan... (Enter kirim)"
                className="flex-1 bg-transparent px-2 py-1 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none max-h-24 leading-relaxed"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center hover:scale-105 active:scale-90 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-sm shadow-blue-500/20"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </form>
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-2">Powered by Gemini AI · SDN 02 Cibadak</p>
          </div>
        </div>
      )}

      {/* Proactive bubble */}
      {!isOpen && showProactive && (
        <div className="mr-1 relative animate-in fade-in slide-in-from-right-6 duration-500">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Asisten Pintar</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Ada yang bisa dibantu? 👋</p>
            </div>
            <button
              onClick={() => {
                setShowProactive(false)
                if (typeof window !== "undefined") localStorage.setItem("helpdesk_proactive_seen", "true")
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Triangle pointer */}
          <div className="absolute -bottom-2 right-8 w-4 h-2 overflow-hidden">
            <div className="w-3 h-3 bg-white dark:bg-slate-900 border-b border-r border-slate-200 dark:border-white/10 rotate-45 translate-y-[-50%] translate-x-[2px] shadow-sm" />
          </div>
        </div>
      )}

      {/* FAB Button with scroll progress ring */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            setShowProactive(false)
            if (typeof window !== "undefined") localStorage.setItem("helpdesk_proactive_seen", "true")
          }}
          className="relative group"
          aria-label="Buka asisten AI"
        >
          {/* SVG scroll progress ring */}
          <svg
            className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] -rotate-90 pointer-events-none"
            viewBox="0 0 68 68"
          >
            <circle cx="34" cy="34" r="32" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500/10 dark:text-blue-400/10" />
            <circle
              cx="34"
              cy="34"
              r="32"
              fill="none"
              stroke="url(#fab-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 32}
              strokeDashoffset={2 * Math.PI * 32 - (2 * Math.PI * 32 * scrollProgress) / 100}
              style={{ transition: "stroke-dashoffset 0.15s linear" }}
              className="drop-shadow-[0_0_4px_rgba(99,102,241,0.6)]"
            />
            <defs>
              <linearGradient id="fab-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Main pill button */}
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 shadow-lg shadow-blue-500/30 flex items-center justify-center group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-blue-500/40 active:scale-95 transition-all duration-300">
            {/* Gloss */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <Bot className="w-7 h-7 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
            {/* Online dot */}
            <span className="absolute top-1 right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-blue-600 shadow-sm" />
          </div>
        </button>
      )}

      {/* Close FAB when open */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
