"use client"

import { Bot, MessageCircle, Minus, PlusCircle, Search, Send, Sparkles, User, X, Zap, ArrowRight } from "lucide-react"
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
      text: "Halo! Saya Asisten Pintar SDN 02 Cibadak (Gemini AI). Ada yang bisa saya bantu terkait layanan ekosistem digital sekolah hari ini?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [showProactive, setShowProactive] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Track page scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
      const scrolled = (winScroll / height) * 100
      setScrollProgress(scrolled)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Proactive message - show after 5 seconds if chat not opened
  useEffect(() => {
    if (isOpen) return
    const timer = setTimeout(() => {
      const hasSeenProactive = localStorage.getItem("helpdesk_proactive_seen")
      if (!hasSeenProactive) {
        setShowProactive(true)
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Subscribe to auth
  useEffect(() => {
    const unsub = subscribeAuth(setAuth)
    return () => unsub()
  }, [])

  // Subscribe to settings for knowledge base
  useEffect(() => {
    const unsub = subscribeSettings(setSettings)
    return () => unsub()
  }, [])

  // Subscribe to chat history if user is logged in
  useEffect(() => {
    if (!auth?.uid) return
    const unsub = subscribeChatSessions(auth.uid, setChatHistory)
    return () => unsub()
  }, [auth?.uid])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isOpen, isLoading])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const userText = input.trim()
    const history = messages.filter(m => !m.isAction)
    setMessages((prev) => [...prev, { role: "user", text: userText }])
    setInput("")
    setIsLoading(true)
    setShowActions(false)
    try {
      // Build context from settings
      const context = {
        schoolName: "SDN 02 Cibadak",
        schoolHours: "Senin-Jumat, 07:00-15:00 WIB",
        services: settings.services.map(s => ({ name: s.name, description: s.description })),
        faq: settings.faq,
        emergencyContacts: settings.emergencyContacts.map(c => ({ label: c.label, phone: c.phone })),
      }
      const reply = await aiChatReply(userText, history, context)
      const newMessages = [...messages.filter(m => !m.isAction), { role: "user" as const, text: userText }, { role: "ai" as const, text: reply }]
      setMessages(newMessages)

      // Save to chat history if user is logged in
      if (auth?.uid) {
        const chatMsgs: ChatMessage[] = newMessages.map(m => ({
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
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Maaf, asisten sedang bermasalah. Coba lagi sebentar ya." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Quick Actions
  const handleCreateTicket = () => {
    setMessages(prev => [...prev, 
      { role: "user", text: "Saya mau buat tiket laporan", isAction: true },
      { role: "ai", text: "Baik, saya akan mengarahkan Anda ke form pembuatan tiket. Silakan isi detail keluhan Anda di sana.", isAction: true }
    ])
    setIsOpen(false)
    router.push("/lapor")
  }

  const handleTrackTicket = () => {
    setMessages(prev => [...prev,
      { role: "user", text: "Saya mau cek status tiket", isAction: true },
      { role: "ai", text: "Untuk melacak tiket, Anda memerlukan kode tiket (contoh: ABC123). Silakan masukkan kode tiket Anda di halaman pelacakan.", isAction: true }
    ])
    setShowActions(true)
  }

  const handleTalkToHuman = () => {
    setMessages(prev => [...prev,
      { role: "user", text: "Saya mau bicara dengan admin", isAction: true },
      { role: "ai", text: "Baik, saya akan membuatkan tiket untuk Anda agar tim admin dapat menghubungi Anda. Silakan isi form laporan dengan detail masalah Anda.", isAction: true }
    ])
    setIsOpen(false)
    router.push("/lapor")
  }

  const suggestions = ["Cara pinjam buku?", "Lupa password", "Cek nilai rapor", "Jam sekolah?"]

  return (
    <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="mb-6 w-[calc(100vw-2rem)] md:w-[420px] h-[600px] max-h-[80vh] bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-500 origin-bottom-right">
          {/* Minimalist Glass Header */}
          <div className="px-6 py-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/20 dark:bg-white/5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Bot className="w-7 h-7 text-white animate-neural-glow" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Neural Assistant</h3>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" />
                  Live & Intelligent
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-all active:scale-90"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                {msg.role === "ai" && (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] rounded-tr-none font-medium"
                      : "bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 rounded-[1.5rem] rounded-tl-none border border-black/5 dark:border-white/10"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center mr-3 flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-500" />
                </div>
                <div className="bg-white dark:bg-white/5 px-5 py-4 rounded-[1.5rem] rounded-tl-none border border-black/5 dark:border-white/10">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="p-4 md:p-6 pt-0 bg-transparent">
            {/* Quick Actions Chips */}
            {messages.length <= 2 && !isLoading && (
              <div className="mb-4 flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide -mx-2 px-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="whitespace-nowrap px-4 py-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-full hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all duration-300 active:scale-95 flex-shrink-0"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Floating Pill Input */}
            <form onSubmit={handleSend} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-violet-600 rounded-[2rem] opacity-20 group-focus-within:opacity-40 blur-md transition-opacity" />
              <div className="relative flex items-center bg-slate-100 dark:bg-white/10 rounded-[2rem] p-1 md:p-1.5 border border-black/5 dark:border-white/5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:scale-105 active:scale-90 transition-all disabled:opacity-30"
                >
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proactive Popup - Minimal Glass Card */}
      {!isOpen && showProactive && (
        <div className="mb-6 mr-2 relative animate-in fade-in slide-in-from-right-10 duration-700">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white dark:border-white/10 px-6 py-4 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">Neural Assistant</p>
              <p className="text-xs text-slate-500 font-medium">I'm ready to help you.</p>
            </div>
            <button
              onClick={() => {
                setShowProactive(false)
                localStorage.setItem("helpdesk_proactive_seen", "true")
              }}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Neural Glass Orb FAB */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            setShowProactive(false)
            localStorage.setItem("helpdesk_proactive_seen", "true")
          }}
          className="relative w-20 h-20 group transition-all duration-500 hover:scale-110 active:scale-95"
        >
          {/* Animated Glow Layers */}
          <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 animate-pulse-soft" />
          <div className="absolute inset-2 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-full opacity-10 animate-spin-slow" />
          
          {/* Glass Orb */}
          <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_10px_30px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden">
            {/* Gloss Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/4 bg-gradient-to-b from-white/40 to-transparent rounded-full" />
            
            {/* Central Neural Icon */}
            <div className="relative z-10 w-12 h-12 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center shadow-inner">
              <Bot className="w-6 h-6 text-white dark:text-slate-900 group-hover:scale-110 transition-transform duration-500" />
            </div>

            {/* Scanning Light */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/20 to-transparent -translate-y-full group-hover:animate-[shimmer_2s_infinite]" />
          </div>

          {/* Outer Neural Progress Ring */}
          <svg className="absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-blue-500/10"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="url(#neural-gradient)"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ 
                strokeDasharray: "289", 
                strokeDashoffset: 289 - (289 * scrollProgress) / 100,
                transition: "stroke-dashoffset 0.1s linear"
              }}
              className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            />
            <defs>
              <linearGradient id="neural-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>

          {/* Additional Decorative Ring */}
          <div className="absolute inset-[-4px] border border-blue-500/10 rounded-full animate-spin-slow opacity-50" />
        </button>
      )}
    </div>
  )
}
