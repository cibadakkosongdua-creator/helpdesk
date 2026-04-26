"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  ArrowRight, 
  Bot, 
  ExternalLink, 
  Heart, 
  LogOut, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Twitter, 
  Youtube, 
  Github,
  Globe
} from "lucide-react"
import { AdminDashboard } from "@/components/helpdesk/admin-dashboard"
import { AdminLogin } from "@/components/helpdesk/admin-login"
import { ChatWidget } from "@/components/helpdesk/chat-widget"
import CommandPalette from "@/components/helpdesk/command-palette"
import { HealthToast } from "@/components/helpdesk/health-toast"
import { HomeView } from "@/components/helpdesk/home-view"
import { Navbar } from "@/components/helpdesk/navbar"
import OfflineBanner from "@/components/helpdesk/offline-banner"
import { PrayerLock } from "@/components/helpdesk/prayer-lock"
import { SurveyView } from "@/components/helpdesk/survey-view"
import { TicketView } from "@/components/helpdesk/ticket-view"
import { Toast, type ToastState } from "@/components/helpdesk/toast"
import type { View } from "@/components/helpdesk/types"
import { signOut as fbSignOut, subscribeAuth, toAdminSession, setFirestoreAdminEmails, type AuthSession } from "@/lib/helpdesk/auth-service"
import { subscribeSettings, type SocialLink, type WellnessConfig, DEFAULT_SETTINGS } from "@/lib/helpdesk/settings-service"
import { subscribeTickets, type Ticket } from "@/lib/helpdesk/firestore-service"

export default function Page() {
  const router = useRouter()
  const pathname = usePathname()
  const currentView: View = pathname === "/lapor" ? "/lapor" : pathname === "/survei" ? "/survei" : pathname === "/admin" ? "/admin" : "/"
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "success" })
  const [auth, setAuth] = useState<AuthSession | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [wellness, setWellness] = useState<WellnessConfig>(DEFAULT_SETTINGS.wellness ?? { prayerLockEnabled: true, healthToastEnabled: true })
  const isAdmin = auth?.role === "admin"

  useEffect(() => {
    const unsub = subscribeAuth((s) => setAuth(s))
    return () => unsub()
  }, [])

  // Sync Firestore admin emails to auth-service and get social links + wellness
  useEffect(() => {
    const unsub = subscribeSettings((s) => {
      if (s.adminEmails.length > 0) setFirestoreAdminEmails(s.adminEmails)
      setSocialLinks(s.socialLinks)
      if (s.wellness) setWellness(s.wellness)
    })
    return () => unsub()
  }, [])

  // Badge: subscribe to tickets for admin to count unread
  useEffect(() => {
    if (!isAdmin) { setUnreadCount(0); return }
    const unsub = subscribeTickets((list) => {
      const count = list.filter((t) => t.unreadForAdmin > 0).length
      setUnreadCount(count)
    })
    return () => unsub()
  }, [isAdmin])

  const dismissToast = () =>
    setToast({ show: false, message: "", type: "success", action: undefined })

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
    action?: { label: string; onClick: () => void },
  ) => {
    setToast({ show: true, message, type, action })
    setTimeout(() => dismissToast(), action ? 7000 : 3500)
  }

  const handleSetView = (v: View) => {
    router.push(v)
  }

  const handleTrackTicket = (code: string) => {
    const clean = code.trim().toUpperCase()
    if (!clean) return
    router.push(`/tiket/${encodeURIComponent(clean)}`)
  }

  const handleLogout = async () => {
    setShowLogoutConfirm(false)
    await fbSignOut()
    setAuth(null)
    router.push("/")
    showToast("Anda telah logout.", "success")
  }

  const handleLogin = () => {
    // Auth state is managed by subscribeAuth listener
  }

  const paletteNav = (v: "home" | "ticket" | "survey" | "admin") => {
    const map: Record<typeof v, View> = {
      home: "/",
      ticket: "/lapor",
      survey: "/survei",
      admin: "/admin",
    }
    handleSetView(map[v])
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      {/* Ambient glow background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55%] h-[55%] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[140px]" />
      </div>

      <OfflineBanner />
      <Toast toast={toast} onDismiss={dismissToast} />
      <Navbar
        currentView={currentView}
        setView={handleSetView}
        auth={auth}
        onLogout={() => setShowLogoutConfirm(true)}
        onOpenCommand={() =>
          typeof window !== "undefined" &&
          window.dispatchEvent(new CustomEvent("helpdesk:open-command"))
        }
        unreadCount={unreadCount}
      />
      <CommandPalette onNavigate={paletteNav} onTrackTicket={handleTrackTicket} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-32 pb-32 md:pb-16 min-h-screen flex flex-col">
        {currentView === "/" && (
          <HomeView setView={handleSetView} showToast={showToast} onTrackTicket={handleTrackTicket} user={auth} />
        )}
        {currentView === "/lapor" && (
          <TicketView showToast={showToast} onTrackTicket={handleTrackTicket} user={auth} />
        )}
        {currentView === "/survei" && <SurveyView showToast={showToast} user={auth} />}
        {currentView === "/admin" && (
          isAdmin ? (
            <AdminDashboard showToast={showToast} admin={toAdminSession(auth)} />
          ) : (
            <AdminLogin setView={handleSetView} showToast={showToast} onLogin={handleLogin} />
          )
        )}
      </main>

      <ChatWidget />

      {/* Wellness Features */}
      <PrayerLock enabled={wellness.prayerLockEnabled} />
      <HealthToast enabled={wellness.healthToastEnabled} />

      {/* Footer Links */}
      <footer className="relative z-10 max-w-6xl mx-auto px-6 sm:px-6 lg:px-8 pb-32 md:pb-12 pt-10 border-t border-slate-200/60 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-4 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2.5 mb-2">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 md:w-6 md:h-6 rounded-full shadow-sm" />
              <span className="font-black text-base md:text-sm tracking-tight text-slate-800 dark:text-slate-200">SDN 02 Cibadak</span>
            </div>
            <p className="text-[11px] md:text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              &copy; {new Date().getFullYear()} Smart Helpdesk v2.0 &middot; Firebase &amp; Gemini AI
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-3">
            {/* WhatsApp hardcoded - utama */}
            <FooterLink href="https://wa.me/6285156365324" label="WhatsApp" />
            {/* Social links from settings */}
            {socialLinks.map((link) => (
              <FooterLink key={link.id} href={link.url} label={link.platform} />
            ))}
          </div>
        </div>
        
        {/* Shortcut hint - only on desktop */}
        <p className="hidden md:block text-[10px] font-medium text-slate-400/60 dark:text-slate-500/60 mt-8 text-center uppercase tracking-widest">
          Tekan <kbd className="mx-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 shadow-sm">Ctrl</kbd>
          +
          <kbd className="mx-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 shadow-sm">K</kbd>
          untuk pencarian perintah
        </p>
      </footer>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 max-w-sm w-full animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Konfirmasi Logout</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Yakin ingin keluar dari akun?</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Anda akan keluar dari sesi saat ini. Untuk mengakses fitur tiket dan admin, Anda perlu login kembali.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-lg shadow-red-500/25"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FooterLink({ href, label }: { href: string; label: string }) {
  const getBrandConfig = () => {
    const l = label.toLowerCase()
    if (l.includes("whatsapp")) return { 
      icon: <MessageCircle className="w-4 h-4" />, 
      color: "hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 hover:border-green-200" 
    }
    if (l.includes("instagram")) return { 
      icon: <Instagram className="w-4 h-4" />, 
      color: "hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:border-pink-200" 
    }
    if (l.includes("facebook")) return { 
      icon: <Facebook className="w-4 h-4" />, 
      color: "hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-600/10 hover:border-blue-200" 
    }
    if (l.includes("twitter") || l.includes("x")) return { 
      icon: <Twitter className="w-4 h-4" />, 
      color: "hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:border-sky-200" 
    }
    if (l.includes("youtube")) return { 
      icon: <Youtube className="w-4 h-4" />, 
      color: "hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200" 
    }
    if (l.includes("tiktok")) return { 
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.06 3.43-.01 6.85-.04 10.27-.01 1.35-.35 2.77-1.13 3.88-.95 1.45-2.58 2.37-4.32 2.65-1.87.35-3.9-.06-5.41-1.22-1.61-1.21-2.48-3.28-2.22-5.27.21-1.72 1.17-3.34 2.63-4.23 1.25-.79 2.78-1.12 4.24-.96v4.02c-.63-.12-1.3-.08-1.9.15-.81.3-1.46.96-1.74 1.76-.36.9-.2 1.99.4 2.75.56.74 1.48 1.15 2.41 1.05.95-.06 1.83-.67 2.24-1.52.33-.65.4-1.39.38-2.11V0z" />
        </svg>
      ), 
      color: "hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300" 
    }
    if (l.includes("github")) return { 
      icon: <Github className="w-4 h-4" />, 
      color: "hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300" 
    }
    return { 
      icon: <Globe className="w-4 h-4" />, 
      color: "hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200" 
    }
  }

  const brand = getBrandConfig()

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:h-auto p-0 md:px-3 md:py-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-400 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${brand.color}`}
      title={label}
    >
      {brand.icon}
      <span className="hidden md:inline">{label}</span>
    </a>
  )
}
