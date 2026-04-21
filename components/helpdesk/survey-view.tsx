"use client"

import { ChevronDown, ClipboardCheck, LogIn, Sparkles, Star } from "lucide-react"
import { useState } from "react"
import { useSettingsServices } from "@/hooks/use-settings-services"
import { saveFeedback } from "@/lib/helpdesk/firestore-service"
import { aiPolishText } from "@/lib/helpdesk/gemini-client"
import { signInWithGoogle, type AuthSession } from "@/lib/helpdesk/auth-service"
import type { ShowToastFn } from "./types"

export function SurveyView({ showToast, user }: { showToast: ShowToastFn; user: AuthSession | null }) {
  const settingsServices = useSettingsServices()
  const [loginLoading, setLoginLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [formData, setFormData] = useState({ service: "perpus", feedback: "" })

  const handleUserLogin = async () => {
    setLoginLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      showToast(err?.message || "Gagal login.", "error")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleAIPolish = async () => {
    if (!formData.feedback || formData.feedback.length < 5) {
      showToast("Tuliskan ulasan Anda terlebih dahulu (min. 5 karakter).", "error")
      return
    }
    setAiLoading(true)
    try {
      const polished = await aiPolishText(formData.feedback)
      setFormData((prev) => ({ ...prev, feedback: polished }))
      showToast("Ulasan berhasil diperhalus oleh AI (Gemini).", "success")
    } catch (err: any) {
      showToast(err?.message || "AI tidak merespons.", "error")
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      showToast("Mohon berikan rating bintang terlebih dahulu.", "error")
      return
    }
    setLoading(true)
    try {
      await saveFeedback({ ...formData, rating, reporterEmail: user?.email, reporterUid: user?.uid })
      showToast("Terima kasih, evaluasi Anda tersimpan di Firestore.", "success")
      setFormData({ service: "perpus", feedback: "" })
      setRating(0)
    } catch (err: any) {
      showToast(err?.message || "Gagal mengirim survei.", "error")
    } finally {
      setLoading(false)
    }
  }

  const ratingLabel = ["Pilih rating", "Sangat Buruk", "Kurang", "Cukup", "Baik", "Sangat Baik"]

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="mb-8 md:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold tracking-wide uppercase mb-4">
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Survei &middot; IKM</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
          Survei Indeks Kepuasan
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-base md:text-lg">
          {user
            ? <>Login sebagai <span className="font-bold text-slate-700 dark:text-slate-200">{user.name}</span>. Bantu kami meningkatkan kualitas layanan melalui penilaian Anda.</>
            : "Login terlebih dahulu untuk mengisi survei IKM. Data Anda terverifikasi dan hasil survei lebih kredibel."
          }
        </p>
      </div>

      {/* Login gate */}
      {!user && (
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-8 md:p-12 shadow-xl relative overflow-hidden mb-8">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5">
              <LogIn className="w-7 h-7" />
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Login Diperlukan
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
              Untuk mengisi Survei IKM, Anda perlu login dengan akun Google. Ini memastikan data survei terverifikasi dan hasilnya kredibel.
            </p>
            <button
              onClick={handleUserLogin}
              disabled={loginLoading}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
            >
              {loginLoading ? (
                <span className="w-5 h-5 border-2 border-slate-400/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Login dengan Google
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4">
              Akun Google diperlukan untuk verifikasi identitas responden IKM.
            </p>
          </div>
        </div>
      )}

      {user && (
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-5 md:p-8 shadow-xl dark:shadow-2xl dark:shadow-black/40 space-y-6 relative overflow-hidden"
      >
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -ml-10 -mb-10" />

        <div className="space-y-2 relative z-10">
          <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 uppercase ml-1">
            Layanan yang Dievaluasi
          </label>
          <div className="relative">
            <select
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium cursor-pointer"
            >
              {settingsServices.map((s) => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 uppercase ml-1 block">
            Tingkat Kepuasan Anda
          </label>
          <div className="flex flex-col items-center gap-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 rounded-3xl py-6 md:py-8 shadow-inner">
            <div className="flex items-center gap-1.5 md:gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`Rating ${star}`}
                  className="p-1 rounded-full transition-transform active:scale-90"
                >
                  <Star
                    className={`w-10 h-10 md:w-12 md:h-12 transition-all duration-300 ${
                      (hoverRating || rating) >= star
                        ? "text-amber-400 fill-amber-400 scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                        : "text-slate-200 dark:text-slate-700"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {ratingLabel[hoverRating || rating]}
            </p>
          </div>
        </div>

        <div className="space-y-2 relative z-10">
          <div className="flex justify-between items-end ml-1 mb-2 gap-2">
            <label className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 uppercase">
              Ulasan &amp; Saran (Opsional)
            </label>
            <button
              type="button"
              onClick={handleAIPolish}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100/60 dark:bg-amber-500/10 hover:bg-amber-200/60 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition-all disabled:opacity-50"
            >
              {aiLoading ? (
                <span className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-700 dark:border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>Perhalus Bahasa</span>
            </button>
          </div>
          <textarea
            rows={3}
            placeholder="Apa yang bisa kami tingkatkan untuk Anda?"
            value={formData.feedback}
            onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
            className="w-full resize-none bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium"
          />
        </div>

        <button
          disabled={loading}
          type="submit"
          className="relative z-10 w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold tracking-wide rounded-2xl px-4 py-4 flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg disabled:opacity-70 disabled:hover:scale-100"
        >
          {loading ? (
            <span className="w-6 h-6 border-2 border-slate-400/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <>
              <ClipboardCheck className="w-5 h-5 mr-2" /> Kirim Evaluasi
            </>
          )}
        </button>
      </form>
      )}
    </div>
  )
}
