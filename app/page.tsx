"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ExternalLink, LogOut, X } from "lucide-react"
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
      <footer className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 md:pb-8 pt-8 border-t border-slate-200/60 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded-full" />
              <span className="font-bold text-sm text-slate-700 dark:text-slate-300">SDN 02 Cibadak</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-600">
              &copy; {new Date().getFullYear()} Smart Helpdesk v2.0 &middot; Firebase &amp; Gemini AI
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* WhatsApp hardcoded - utama */}
            <FooterLink href="https://wa.me/6285156365324" label="WhatsApp" />
            {/* Social links from settings */}
            {socialLinks.map((link) => (
              <FooterLink key={link.id} href={link.url} label={link.platform} />
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-400/80 dark:text-slate-600/80 mt-3 text-center">
          Tekan <kbd className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>
          {" "}+{" "}
          <kbd className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-0.5 font-mono text-[10px]">K</kbd>
          {" "}untuk buka pencarian perintah.
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
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all"
    >
      <ExternalLink className="w-3 h-3" />
      {label}
    </a>
  )
}
