"use client"

import { Check, User, Phone, FileText, Loader2, Star, Sparkles, ClipboardCheck, Mail, Briefcase, Users, UserCheck, MailOpen, ClipboardList, Smartphone } from "lucide-react"
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

  // Get color theme based on category
  const getThemeColor = () => {
    switch (formData.category) {
      case 'Orang Tua': 
        return { 
          name: 'green',
          bg: 'bg-green-600', 
          ring: 'ring-green-500/30', 
          border: 'border-green-500/50', 
          text: 'text-green-600 dark:text-green-400', 
          icon: 'text-green-500',
          aura: 'via-green-500/20',
          focusBorder: 'focus-within:border-green-500/50',
          focusIcon: 'group-focus-within:text-green-500',
          labelFocus: 'peer-focus:text-green-500'
        };
      case 'Dinas': 
        return { 
          name: 'purple',
          bg: 'bg-purple-600', 
          ring: 'ring-purple-500/30', 
          border: 'border-purple-500/50', 
          text: 'text-purple-600 dark:text-purple-400', 
          icon: 'text-purple-500',
          aura: 'via-purple-500/20',
          focusBorder: 'focus-within:border-purple-500/50',
          focusIcon: 'group-focus-within:text-purple-500',
          labelFocus: 'peer-focus:text-purple-500'
        };
      default: 
        return { 
          name: 'blue',
          bg: 'bg-blue-600', 
          ring: 'ring-blue-500/30', 
          border: 'border-blue-500/50', 
          text: 'text-blue-600 dark:text-blue-400', 
          icon: 'text-blue-500',
          aura: 'via-blue-500/20',
          focusBorder: 'focus-within:border-blue-500/50',
          focusIcon: 'group-focus-within:text-blue-500',
          labelFocus: 'peer-focus:text-blue-500'
        };
    }
  }

  const theme = getThemeColor();

  // Survey state
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [surveyLoading, setSurveyLoading] = useState(false)
  const [surveyData, setSurveyData] = useState({ feedback: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.purpose.trim()) {
      showToast("Nama, email, dan keperluan wajib diisi", "error")
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Kategori */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              Pilih Kategori <span className={theme.text}>*</span>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'Umum', label: 'Umum', icon: User, color: 'blue', themeColor: 'text-blue-500' },
              { id: 'Orang Tua', label: 'Wali', icon: Users, color: 'green', themeColor: 'text-green-500' },
              { id: 'Dinas', label: 'Dinas', icon: Briefcase, color: 'purple', themeColor: 'text-purple-500' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat.id as any })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 gap-2 relative overflow-hidden group ${
                  formData.category === cat.id
                    ? `bg-${cat.color}-50 dark:bg-${cat.color}-500/10 border-${cat.color}-500 text-${cat.color}-600 dark:text-${cat.color}-400 shadow-md scale-105`
                    : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-500 hover:border-slate-200 dark:hover:border-white/10 hover:scale-[1.02]'
                }`}
              >
                <cat.icon className={`w-6 h-6 transition-transform duration-300 ${formData.category === cat.id ? 'scale-110 animate-bounce-short' : 'group-hover:scale-110'}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nama */}
        <div className="relative group">
          {/* Glow Aura */}
          <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-transparent ${theme.aura} to-transparent opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500`} />
          
          <div className={`relative transition-all duration-300 rounded-2xl border bg-white dark:bg-slate-950/40 ${
            formData.name ? theme.border : 'border-slate-200 dark:border-white/10'
          } group-focus-within:ring-4 ${theme.ring} ${theme.focusBorder} overflow-hidden`}>
            {/* Icon Wrapper */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5">
              <User className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                formData.name ? 'opacity-0 scale-50' : 'opacity-100 scale-100 text-slate-400'
              } group-focus-within:opacity-0 group-focus-within:scale-50`} />
              <UserCheck className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                formData.name ? `opacity-100 scale-100 ${theme.icon}` : 'opacity-0 scale-50'
              } group-focus-within:opacity-100 group-focus-within:scale-110 ${theme.focusIcon}`} />
            </div>
            
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder=" "
              className="block w-full pl-12 pr-12 pt-6 pb-2 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none transition-all peer"
              disabled={loading}
              required
            />
            
            <label 
              htmlFor="name"
              className={`absolute left-12 top-4 text-slate-400 text-sm transition-all duration-300 pointer-events-none
                ${theme.labelFocus} peer-focus:text-xs peer-focus:-translate-y-2.5 peer-focus:font-bold
                ${formData.name ? `text-xs -translate-y-2.5 ${theme.text} font-bold` : ''}
              `}
            >
              Nama Lengkap *
            </label>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 transition-opacity">
              <VoiceInput compact onTranscript={(text) => setFormData({ ...formData, name: text })} />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="relative group">
          <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-transparent ${theme.aura} to-transparent opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500`} />
          
          <div className={`relative transition-all duration-300 rounded-2xl border bg-white dark:bg-slate-950/40 ${
            formData.email ? theme.border : 'border-slate-200 dark:border-white/10'
          } group-focus-within:ring-4 ${theme.ring} ${theme.focusBorder} overflow-hidden`}>
            {/* Icon Wrapper */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5">
              <Mail className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                formData.email ? 'opacity-0 scale-50' : 'opacity-100 scale-100 text-slate-400'
              } group-focus-within:opacity-0 group-focus-within:scale-50`} />
              <MailOpen className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                formData.email ? `opacity-100 scale-100 ${theme.icon}` : 'opacity-0 scale-50'
              } group-focus-within:opacity-100 group-focus-within:scale-110 ${theme.focusIcon}`} />
            </div>
            
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder=" "
              className="block w-full pl-12 pr-4 pt-6 pb-2 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none transition-all peer"
              disabled={loading}
              required
            />
            
            <label 
              htmlFor="email"
              className={`absolute left-12 top-4 text-slate-400 text-sm transition-all duration-300 pointer-events-none
                ${theme.labelFocus} peer-focus:text-xs peer-focus:-translate-y-2.5 peer-focus:font-bold
                ${formData.email ? `text-xs -translate-y-2.5 ${theme.text} font-bold` : ''}
              `}
            >
              Email *
            </label>
          </div>
        </div>

        {/* Keperluan */}
        <div className="relative group">
          <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-transparent ${theme.aura} to-transparent opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500`} />
          
          <div className={`relative transition-all duration-300 rounded-2xl border bg-white dark:bg-slate-950/40 ${
            formData.purpose ? theme.border : 'border-slate-200 dark:border-white/10'
          } group-focus-within:ring-4 ${theme.ring} ${theme.focusBorder} overflow-hidden`}>
            {/* Icon Wrapper */}
            <div className="absolute left-4 top-6 -translate-y-1/2 w-5 h-5">
              <FileText className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                formData.purpose ? 'opacity-0 scale-50' : 'opacity-100 scale-100 text-slate-400'
              } group-focus-within:opacity-0 group-focus-within:scale-50`} />
              <ClipboardList className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                formData.purpose ? `opacity-100 scale-100 ${theme.icon}` : 'opacity-0 scale-50'
              } group-focus-within:opacity-100 group-focus-within:scale-110 ${theme.focusIcon}`} />
            </div>
            
            <textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder=" "
              rows={3}
              className="block w-full pl-12 pr-12 pt-8 pb-2 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none transition-all resize-none peer"
              disabled={loading}
              required
            />
            
            <label 
              htmlFor="purpose"
              className={`absolute left-12 top-5 text-slate-400 text-sm transition-all duration-300 pointer-events-none
                ${theme.labelFocus} peer-focus:text-xs peer-focus:-translate-y-3.5 peer-focus:font-bold
                ${formData.purpose ? `text-xs -translate-y-3.5 ${theme.text} font-bold` : ''}
              `}
            >
              Keperluan *
            </label>

            <div className="absolute right-2 top-6 -translate-y-1/2 transition-opacity">
              <VoiceInput compact onTranscript={(text) => setFormData({ ...formData, purpose: text })} />
            </div>
          </div>
        </div>

        {/* No HP */}
        <div className="relative group">
          <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-transparent ${theme.aura} to-transparent opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500`} />
          
          <div className={`relative transition-all duration-300 rounded-2xl border bg-white dark:bg-slate-950/40 ${
            formData.phone ? theme.border : 'border-slate-200 dark:border-white/10'
          } group-focus-within:ring-4 ${theme.ring} ${theme.focusBorder} overflow-hidden`}>
            {/* Icon Wrapper */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5">
              <Phone className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                formData.phone ? 'opacity-0 scale-50' : 'opacity-100 scale-100 text-slate-400'
              } group-focus-within:opacity-0 group-focus-within:scale-50`} />
              <Smartphone className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
                formData.phone ? `opacity-100 scale-100 ${theme.icon}` : 'opacity-0 scale-50'
              } group-focus-within:opacity-100 group-focus-within:scale-110 ${theme.focusIcon}`} />
            </div>
            
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder=" "
              className="block w-full pl-12 pr-4 pt-6 pb-2 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none transition-all peer"
              disabled={loading}
            />
            
            <label 
              htmlFor="phone"
              className={`absolute left-12 top-4 text-slate-400 text-sm transition-all duration-300 pointer-events-none
                ${theme.labelFocus} peer-focus:text-xs peer-focus:-translate-y-2.5 peer-focus:font-bold
                ${formData.phone ? `text-xs -translate-y-2.5 ${theme.text} font-bold` : ''}
              `}
            >
              No. WhatsApp (Opsional)
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-2xl text-white font-bold text-lg transition-all duration-300 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden shadow-lg ${
            theme.bg
          } ${theme.ring.replace('ring-', 'shadow-')}`}
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
