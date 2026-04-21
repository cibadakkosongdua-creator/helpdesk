"use client"

import { Bot, MessageCircle, Minus, Send, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { aiChatReply } from "@/lib/helpdesk/gemini-client"

type Message = { role: "ai" | "user"; text: string }

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Halo! Saya Asisten Pintar SDN 02 Cibadak (Gemini AI). Ada yang bisa saya bantu terkait layanan ekosistem digital sekolah hari ini?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isOpen, isLoading])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const userText = input.trim()
    const history = messages
    setMessages((prev) => [...prev, { role: "user", text: userText }])
    setInput("")
    setIsLoading(true)
    try {
      const reply = await aiChatReply(userText, history)
      setMessages((prev) => [...prev, { role: "ai", text: reply }])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Maaf, asisten sedang bermasalah. Coba lagi sebentar ya." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = ["Cara pinjam buku?", "Lupa password", "Cek nilai rapor"]

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
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 pt-2">
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

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
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
