"use client"

import { Check, User, Phone, FileText, Loader2, Star, Sparkles, ClipboardCheck, Mail } from "lucide-react"
import { useState } from "react"
import { saveGuest } from "@/lib/helpdesk/guest-service"
import { saveFeedback } from "@/lib/helpdesk/firestore-service"
import type { ShowToastFn } from "./types"
import { VoiceInput } from "./voice-input"

export function GuestForm({ showToast, onSuccess }: { showToast: ShowToastFn; onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [showSurvey, setShowSurvey] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [guestName, setGuestName] = useState("")
  
  const [formData, setFormData] = useState({
    name: "",
    category: "Umum" as "Dinas" | "Orang Tua" | "Umum",
    email: "",
    purpose: "",
    phone: "",
  })

  // Survey state
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [surveyData, setSurveyData] = useState({ feedback: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.purpose.trim()) {
      showToast("Nama dan keperluan wajib diisi", "error")
      return
    }

    setLoading(true)
    try {
      // Convert name to title case
      const nameToTitleCase = formData.name.trim()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      await saveGuest({
        name: nameToTitleCase,
        category: formData.category,
        email: formData.email.trim() || "",
        purpose: formData.purpose.trim(),
        phone: formData.phone.trim() || "",
      })
      
      setGuestName(nameToTitleCase)
      setShowSurvey(true)
    } catch (err) {
      console.error("Guest form error:", err)
      showToast("Gagal menyimpan data tamu", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      showToast("Mohon berikan rating bintang terlebih dahulu", "error")
      return
    }
    setSurveyLoading(true)
    try {
      const feedbackPayload: any = {
        service: "Buku Tamu",
        feedback: surveyData.feedback || "",
        rating,
      }
      
      await saveFeedback(feedbackPayload)
      
      // Show completion state instead of resetting
      setTimeout(() => {
        setSurveyData({ feedback: "" })
        setRating(0)
        setShowSurvey(false)
        setCompleted(true)
        onSuccess?.()
      }, 2000)
    } catch (err) {
      console.error("Survey error:", err)
      showToast("Gagal mengirim survei", "error")
    } finally {
      setSurveyLoading(false)
    }
  }

  const handleStartOver = () => {
    setFormData({ name: "", category: "Umum", email: "", purpose: "", phone: "" })
    setSurveyData({ feedback: "" })
    setRating(0)
    setShowSurvey(false)
    setCompleted(false)
    setGuestName("")
  }

  const ratingLabel = ["Pilih rating", "Sangat Buruk", "Kurang", "Cukup", "Baik", "Sangat Baik"]

  if (showSurvey) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 md:p-12 max-w-md mx-auto animate-in zoom-in-95 duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Survei Kepuasan
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Terima kasih {guestName}! Bantu kami meningkatkan layanan dengan penilaian Anda.
          </p>
        </div>

        <form onSubmit={handleSurveySubmit} className="space-y-5">
          {/* Rating Stars */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
              Seberapa puas Anda dengan layanan kami?
            </label>
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 dark:text-slate-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {ratingLabel[rating]}
            </p>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Kritik & Saran (Opsional)
            </label>
            <textarea
              value={surveyData.feedback}
              onChange={(e) => setSurveyData({ feedback: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all min-h-[100px]"
              placeholder="Tuliskan pengalaman Anda..."
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={surveyLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {surveyLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Kirim Penilaian
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => {
            setSurveyData({ feedback: "" })
            setRating(0)
            setShowSurvey(false)
            setCompleted(true)
            onSuccess?.()
          }}
          className="w-full mt-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          Lewati survei
        </button>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 md:p-12 max-w-md mx-auto text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Terima Kasih!
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Data kehadiran Anda telah tercatat dan penilaian Anda telah kami terima. Kunjungan Anda sangat berarti bagi kami.
        </p>
        <button
          onClick={handleStartOver}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/25"
        >
          <User className="w-5 h-5" />
          Tamu Berikutnya
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 md:p-12 max-w-md mx-auto animate-in zoom-in-95 duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <img src="/logo.png" alt="Logo SDN 02 Cibadak" className="w-16 h-16 object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Buku Tamu Digital
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Silakan isi data kehadiran Anda
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Kategori */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Kategori *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as "Dinas" | "Orang Tua" | "Umum" })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={loading}
            required
          >
            <option value="Umum" className="dark:bg-slate-800 dark:text-slate-100">Umum</option>
            <option value="Orang Tua" className="dark:bg-slate-800 dark:text-slate-100">Orang Tua</option>
            <option value="Dinas" className="dark:bg-slate-800 dark:text-slate-100">Dinas</option>
          </select>
        </div>

        {/* Nama */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Nama Lengkap *
            </label>
            <VoiceInput onTranscript={(text) => setFormData({ ...formData, name: text })} />
          </div>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama lengkap"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            Email (Opsional)
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Masukkan email untuk konfirmasi"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>
        </div>

        {/* Keperluan */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Keperluan *
            </label>
            <VoiceInput onTranscript={(text) => setFormData({ ...formData, purpose: text })} />
          </div>
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <textarea
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Jelaskan keperluan kunjungan Anda"
              rows={3}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* No HP */}
        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            No. HP (Opsional)
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Contoh: 081234567890"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Simpan Data Tamu
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-slate-500 dark:text-slate-500 text-center mt-6">
        * Wajib diisi
      </p>
    </div>
  )
}
