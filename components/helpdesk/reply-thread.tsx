"use client"

import { ClipboardList, Eye, EyeOff, MessageCircle, Send, Sparkles, ShieldCheck, User, Check, CheckCheck, Lock } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { addReply, markRepliesRead, setTyping, subscribeReplies, type Reply, type Ticket } from "@/lib/helpdesk/firestore-service"
import { aiSuggestReply } from "@/lib/helpdesk/gemini-client"
import { subscribeSettings, type ReplyTemplate } from "@/lib/helpdesk/settings-service"
import { EmojiPicker } from "./emoji-picker"

export function ReplyThread({
  ticket,
  as,
  authorName,
  onError,
}: {
  ticket: Ticket
  as: "admin" | "reporter"
  authorName: string
  onError?: (msg: string) => void
}) {
  const isResolved = ticket.status === "Resolved"
  const [replies, setReplies] = useState<Reply[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [isInternal, setIsInternal] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [templates, setTemplates] = useState<ReplyTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tplRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = subscribeReplies(ticket.id, setReplies)
    return () => unsub()
  }, [ticket.id])

  // Load templates dari settings (hanya untuk admin)
  useEffect(() => {
    if (as !== "admin") return
    const unsub = subscribeSettings((s) => {
      setTemplates(s.replyTemplates ?? [])
    })
    return () => unsub()
  }, [as])

  // Tutup dropdown template saat klik di luar
  useEffect(() => {
    if (!showTemplates) return
    const handleClick = (e: MouseEvent) => {
      if (tplRef.current && !tplRef.current.contains(e.target as Node)) {
        setShowTemplates(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showTemplates])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [replies.length])

  // Mark messages as read when viewing
  useEffect(() => {
    if (replies.length === 0) return
    const hasUnread = replies.some((r) => r.author !== as && !r.readAt)
    if (hasUnread) {
      void markRepliesRead(ticket.id, as)
    }
  }, [replies, ticket.id, as])

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Handle typing indicator
  const handleTyping = () => {
    if (isResolved) return
    
    // Set typing status
    void setTyping(ticket.id, as, true)
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      void setTyping(ticket.id, as, false)
    }, 3000)
  }

  // Stop typing when sending message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    void setTyping(ticket.id, as, false)
    
    setSending(true)
    try {
      await addReply({
        ticketId: ticket.id,
        author: as,
        authorName: authorName || (as === "admin" ? "Admin" : "Pelapor"),
        text: text.trim(),
        isInternal: isInternal || undefined, // only set if true
      })
      setText("")
      setIsInternal(false)
      if (navigator.vibrate) navigator.vibrate(10)
    } catch (err: any) {
      onError?.(err?.message || "Gagal mengirim balasan.")
    } finally {
      setSending(false)
    }
  }

  const handleSuggest = async () => {
    setAiLoading(true)
    try {
      const draft = await aiSuggestReply({
        ticket: {
          name: ticket.name,
          service: ticket.service,
          details: ticket.details,
          status: ticket.status,
        },
        history: replies.map((r) => ({ author: r.author, text: r.text })),
      })
      setText(draft)
    } catch (err: any) {
      onError?.(err?.message || "AI tidak merespons.")
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
        <MessageCircle className="w-4 h-4" />
        <h3 className="text-sm font-bold uppercase tracking-wider">
          Percakapan
        </h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
          {replies.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 pr-1">
        {replies.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
            Belum ada percakapan. Balasan pertama akan tampil di sini.
          </div>
        )}
        {replies
          .filter((r) => as === "admin" || !r.isInternal) // Hide internal notes from reporter
          .map((r) => {
          const isMe = r.author === as
          const isAdmin = r.author === "admin"
          const isInternalNote = r.isInternal && as === "admin"
          return (
            <div
              key={r.id}
              className={`flex gap-2 items-start ${isMe ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isInternalNote
                    ? "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : isAdmin
                      ? "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                }`}
              >
                {isInternalNote ? <Lock className="w-4 h-4" /> : isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    isInternalNote
                      ? "bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-500/20 rounded-bl-sm"
                      : isMe
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : isAdmin
                          ? "bg-blue-50 dark:bg-blue-500/10 text-slate-800 dark:text-slate-100 border border-blue-100 dark:border-blue-500/20 rounded-bl-sm"
                          : "bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-white/10 rounded-bl-sm"
                  }`}
                >
                  {r.text}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                  {isInternalNote && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-bold mr-1">
                      INTERNAL
                    </span>
                  )}
                  <span>
                    {r.authorName || (isAdmin ? "Admin" : "Pelapor")} &middot;{" "}
                    {new Date(r.createdAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {/* Read receipt - only show for my messages (not internal) */}
                  {isMe && !isInternalNote && (
                    <span title={r.readAt ? "Sudah dibaca" : "Terkirim"}>
                      {r.readAt ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Typing indicator */}
      {(() => {
        const typingField = as === "admin" ? ticket.typingReporter : ticket.typingAdmin
        const isTyping = typingField && Date.now() - typingField < 5000 // 5 seconds timeout
        if (!isTyping) return null
        const who = as === "admin" ? "Pelapor" : "Admin"
        return (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span>{who} sedang mengetik...</span>
          </div>
        )
      })()}

      {isResolved ? (
        <div className="flex items-center justify-center gap-2 py-4 px-3 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Tiket sudah terselesaikan. Percakapan dikunci.
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-3"
        >
          <textarea
            rows={2}
            placeholder={
              as === "admin"
                ? "Tulis balasan untuk pelapor..."
                : "Tulis pertanyaan atau informasi tambahan..."
            }
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              handleTyping()
            }}
            className="w-full resize-none bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {/* Quick replies */}
          <div className="flex flex-wrap gap-1.5">
            {(as === "admin"
              ? ["Baik, ditangguhkan.", "Sudah diproses.", "Mohon ditunggu.", "Terima kasih."]
              : ["Terima kasih.", "Baik, Pak/Bu.", "Mohon bantuannya.", "Sudah selesai."]
            ).map((qr) => (
              <button
                key={qr}
                type="button"
                onClick={() => {
                  setText(qr)
                  handleTyping()
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        <div className="flex items-center justify-between gap-2">
          {as === "admin" ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSuggest}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50"
              >
                {aiLoading ? (
                  <span className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-700 dark:border-t-blue-300 rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>AI</span>
              </button>
              {/* Emoji picker */}
              <EmojiPicker
                onSelect={(emoji) => {
                  setText((prev) => prev + emoji)
                  handleTyping()
                }}
              />
              {/* Template picker */}
              {templates.length > 0 && (
                <div className="relative" ref={tplRef}>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <ClipboardList className="w-3 h-3" />
                    <span>Template</span>
                  </button>
                  {showTemplates && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="p-2 space-y-0.5">
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setText(t.content)
                              setShowTemplates(false)
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                          >
                            <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{t.content}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <EmojiPicker
                onSelect={(emoji) => {
                  setText((prev) => prev + emoji)
                  handleTyping()
                }}
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Balasan Anda akan dibaca oleh admin sekolah.
              </span>
            </div>
          )}
          {/* Internal note toggle for admin */}
          {as === "admin" && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsInternal(!isInternal)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  isInternal
                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                }`}
              >
                {isInternal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {isInternal ? "Catatan Internal" : "Balasan Publik"}
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 ${
              isInternal
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            }`}
          >
            {sending ? (
              <span className={`w-3.5 h-3.5 border-2 rounded-full animate-spin ${isInternal ? "border-amber-200 border-t-white" : "border-slate-300 border-t-white dark:border-t-slate-900"}`} />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {isInternal ? "Simpan Internal" : "Kirim"}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}
