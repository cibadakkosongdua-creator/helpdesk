"use client"

import { Bot, FileText, MessageCircle, Minus, PlusCircle, Search, Send, Sparkles, User, X } from "lucide-react"
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
  const scrollRef = useRef<HTMLDivElement>(null)

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
    <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[90] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-[calc(100vw-2rem)] md:w-[380px] h-[480px] max-h-[70vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-white/10 rounded-3xl shadow-2xl dark:shadow-[0_0_40px_rgba(59,130,246,0.15)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 origin-bottom-right">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200/60 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/50 flex justify-between items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-50 dark:border-slate-800 rounded-full" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Asisten AI Bantuan</h3>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Gemini AI &middot; SDN 02 Cibadak
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="relative z-10 p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 transition-colors"
              aria-label="Tutup chat"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200/60 dark:border-white/5"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start animate-in fade-in">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm border border-slate-200/60 dark:border-white/5 flex gap-2 items-center shadow-sm">
                  <span className="text-[12px] text-slate-500 font-medium">AI sedang memproses</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400/70 rounded-full animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 bg-slate-400/70 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-slate-400/70 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                </div>
              </div>
            )}
            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5 mt-4">
              <button
                onClick={handleCreateTicket}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Buat Tiket
              </button>
              <button
                onClick={handleTrackTicket}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Lacak Tiket
              </button>
              <button
                onClick={handleTalkToHuman}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-500/20 hover:bg-slate-100 dark:hover:bg-slate-500/20 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Bicara Admin
              </button>
            </div>

            {/* Suggestions */}
            {messages.length <= 2 && !isLoading && (
              <div className="flex flex-wrap gap-2 pt-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="p-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/60 dark:border-white/10"
          >
            <div className="relative flex items-center shadow-sm rounded-full">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya ke AI..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-full pl-5 pr-14 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:bg-slate-400"
                aria-label="Kirim"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Proactive Message Popup */}
      {!isOpen && showProactive && (
        <div className="mb-3 max-w-[280px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Halo! Ada yang bisa saya bantu? Klik untuk mulai chat dengan AI asisten.
              </p>
            </div>
            <button
              onClick={() => {
                setShowProactive(false)
                localStorage.setItem("helpdesk_proactive_seen", "true")
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            setShowProactive(false)
            localStorage.setItem("helpdesk_proactive_seen", "true")
          }}
          className="group relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full shadow-[0_8px_30px_rgba(59,130,246,0.4)] hover:scale-110 hover:-translate-y-1 active:scale-95 transition-all duration-300 animate-in zoom-in"
          aria-label="Buka asisten AI"
        >
          <span className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:animate-ping" />
          <Sparkles className="absolute top-3 right-3 w-3 h-3 text-yellow-300 animate-pulse" />
          <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-white group-hover:rotate-12 transition-transform duration-300" />
        </button>
      )}
    </div>
  )
}
