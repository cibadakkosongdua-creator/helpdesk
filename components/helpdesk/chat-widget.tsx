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
        <div className="mb-4 w-[calc(100vw-2rem)] md:w-[400px] h-[500px] max-h-[75vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 origin-bottom-right">
          {/* Header - Gradient Glow */}
          <div className="relative px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden">
            {/* Animated Glow Background */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/4 w-32 h-32 bg-blue-400 rounded-full blur-3xl opacity-30 animate-pulse" />
              <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-indigo-400 rounded-full blur-2xl opacity-30 animate-pulse" style={{ animationDelay: "1s" }} />
            </div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-blue-600 rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Asisten AI</h3>
                  <div className="flex items-center gap-1 text-blue-100 text-xs">
                    <Zap className="w-3 h-3" />
                    <span>Gemini AI</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Tutup chat"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
            
            {/* School Badge */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-xs">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              SDN 02 Cibadak
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth bg-slate-50 dark:bg-slate-900">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-2 flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-md"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl rounded-bl-md border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-2">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-slate-500">berpikir...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Suggestions */}
            {messages.length <= 2 && !isLoading && (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-slate-500 font-medium">Pertanyaan populer:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="group flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-all"
                    >
                      {s}
                      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="px-4 pb-3 pt-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex gap-2">
              <button
                onClick={handleCreateTicket}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Buat Tiket
              </button>
              <button
                onClick={handleTrackTicket}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                Lacak
              </button>
              <button
                onClick={handleTalkToHuman}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600 transition-all"
              >
                <User className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ketik pertanyaan..."
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl pl-4 pr-12 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all disabled:opacity-50"
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
        <div className="mb-3 max-w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Ada yang bisa dibantu?
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Klik untuk chat dengan AI</p>
            </div>
            <button
              onClick={() => {
                setShowProactive(false)
                localStorage.setItem("helpdesk_proactive_seen", "true")
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB Button - Gradient Glow */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true)
            setShowProactive(false)
            localStorage.setItem("helpdesk_proactive_seen", "true")
          }}
          className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-300 animate-in zoom-in"
          aria-label="Buka asisten AI"
        >
          {/* Animated Glow Ring */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 -z-10 scale-110" />
          
          {/* Pulse Ring */}
          <div className="absolute inset-0 rounded-xl border-2 border-blue-400 opacity-0 group-hover:animate-ping" />
          
          {/* Sparkle */}
          <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-400 animate-pulse" />
          
          {/* Main Icon */}
          <MessageCircle className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
          
          {/* AI Badge */}
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] font-bold rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            AI
          </span>
        </button>
      )}
    </div>
  )
}
