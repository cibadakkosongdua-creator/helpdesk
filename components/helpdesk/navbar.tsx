"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import {
  ChevronDown,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Sun,
  Ticket,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react"
import { signInWithGoogle, type AuthSession } from "@/lib/helpdesk/auth-service"
import type { View } from "./types"

export function Navbar({
  currentView,
  setView,
  auth,
  onLogout,
  onOpenCommand,
  unreadCount = 0,
}: {
  currentView: View
  setView: (v: View) => void
  auth: AuthSession | null
  onLogout: () => void
  onOpenCommand?: () => void
  unreadCount?: number
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)
  const mobileDropdownRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isDark = mounted ? theme === "dark" : true
  const isAdmin = auth?.role === "admin"
  const isMac = mounted && typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent)

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [dropdownOpen])

  useEffect(() => {
    if (!mobileDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target as Node)) {
        setMobileDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [mobileDropdownOpen])

  const handleLogin = async () => {
    setLoginLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      /* errors shown in views */
    } finally {
      setLoginLoading(false)
    }
  }

  return (
    <>
      {/* Desktop floating pill navbar */}
      <nav className={`hidden md:flex fixed top-6 left-1/2 -translate-x-1/2 z-50 px-2 py-2 rounded-full items-center gap-1 transition-all duration-500 ${
        scrolled 
          ? "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 shadow-lg dark:shadow-2xl dark:shadow-blue-900/10" 
          : "bg-transparent border-transparent shadow-none"
      }`}>
        {/* Logo */}
        <button
          onClick={() => setView("/")}
          className="flex items-center gap-3 px-4 mr-2 cursor-pointer group"
        >
          <img src="/logo.png" alt="Logo" className={`w-9 h-9 rounded-full object-cover transition-all duration-500 ${scrolled ? "shadow-inner" : "shadow-none"}`} />
          <span className={`font-bold tracking-tight transition-colors duration-500 ${scrolled ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-white"}`}>Helpdesk</span>
        </button>

        {/* Divider */}
        <div className={`w-px h-6 mx-0.5 transition-all duration-500 ${scrolled ? "bg-slate-200 dark:bg-slate-800" : "bg-transparent"}`} />

        {/* Nav links */}
        <DesktopNavButton view="/" current={currentView} set={setView} icon={Home} label="Dashboard" scrolled={scrolled} />
        <DesktopNavButton view="/lapor" current={currentView} set={setView} icon={Ticket} label="Lapor" scrolled={scrolled} />
        <DesktopNavButton view="/survei" current={currentView} set={setView} icon={ClipboardCheck} label="Survei" scrolled={scrolled} />
        {isAdmin && (
          <div className="relative">
            <DesktopNavButton
              view="/admin"
              current={currentView}
              set={setView}
              icon={LayoutDashboard}
              label="Admin"
              scrolled={scrolled}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full shadow-lg shadow-red-500/40 animate-in zoom-in duration-300">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className={`w-px h-6 mx-0.5 transition-all duration-500 ${scrolled ? "bg-slate-200 dark:bg-slate-800" : "bg-transparent"}`} />

        {/* Actions */}
        {onOpenCommand && (
          <button
            onClick={onOpenCommand}
            className={`hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-500 ${
              scrolled 
                ? "hover:bg-slate-100/60 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400" 
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
            aria-label="Cari cepat"
            title="Cari cepat (Ctrl+K)"
          >
            <Search className="w-5 h-5" />
            <kbd className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border transition-all duration-500 ${
              scrolled
                ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                : "border-slate-300 dark:border-white/20 bg-white/10 dark:bg-white/5 text-slate-600 dark:text-slate-300"
            }`}>
              {isMac ? "⌘" : "Ctrl+"}K
            </kbd>
          </button>
        )}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={`p-2 rounded-full transition-all duration-500 ${
            scrolled 
              ? "hover:bg-slate-100/60 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400" 
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
          aria-label="Ubah tema"
        >
          {mounted && isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Auth */}
        {auth ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-full transition-all duration-500 ${
                scrolled ? "hover:bg-slate-100/60 dark:hover:bg-white/5" : "hover:bg-white/10 dark:hover:bg-white/5"
              }`}
            >
              <NavbarAvatar auth={auth} size="md" />
              <ChevronDown className={`w-5 h-5 transition-all duration-500 ${scrolled ? "text-slate-400" : "text-slate-500 dark:text-slate-400"} ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xl py-1.5 z-[60] animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                <div className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <NavbarAvatar auth={auth} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{auth.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{auth.email}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <span className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-200/60 dark:border-blue-500/20">
                      <LayoutDashboard className="w-2.5 h-2.5" /> Admin
                    </span>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800">
                  {isAdmin && (
                    <button
                      onClick={() => { setView("/admin"); setDropdownOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin Panel
                    </button>
                  )}
                  <button
                    onClick={() => { onLogout(); setDropdownOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-slate-100/60 dark:hover:bg-white/5 transition-colors"
          >
            {loginLoading ? (
              <span className="w-5 h-5 rounded-full border-2 border-blue-400/30 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Login</span>
          </button>
        )}
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-4 left-3 right-3 z-50">
        <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-3xl px-4 py-2 shadow-2xl flex items-center justify-around">
          <MobileNavButton view="/" current={currentView} set={setView} icon={Home} label="Home" />
          <MobileNavButton view="/lapor" current={currentView} set={setView} icon={Ticket} label="Lapor" />
          <MobileNavButton view="/survei" current={currentView} set={setView} icon={ClipboardCheck} label="Survei" />
          {isAdmin && (
            <div className="relative">
              <MobileNavButton
                view="/admin"
                current={currentView}
                set={setView}
                icon={LayoutDashboard}
                label="Admin"
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center px-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full shadow-lg shadow-red-500/40 animate-in zoom-in duration-300">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="shrink-0 p-2.5 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Ubah tema"
          >
            {mounted && isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {auth ? (
            <div className="relative" ref={mobileDropdownRef}>
              <button
                onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                className="shrink-0 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ring-2 ring-slate-200/60 dark:ring-white/10"
              >
                <NavbarAvatar auth={auth} size="md" />
              </button>

              {mobileDropdownOpen && (
                <div className="absolute right-0 bottom-full mb-4 w-56 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xl py-1.5 z-[60] animate-in fade-in zoom-in-95 duration-150 overflow-hidden origin-bottom-right">
                  <div className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <NavbarAvatar auth={auth} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{auth.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{auth.email}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <span className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-200/60 dark:border-blue-500/20">
                        <LayoutDashboard className="w-2.5 h-2.5" /> Admin
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800">
                    {isAdmin && (
                      <button
                        onClick={() => { setView("/admin"); setMobileDropdownOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Panel
                      </button>
                    )}
                    <button
                      onClick={() => { onLogout(); setMobileDropdownOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="shrink-0 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              aria-label="Login"
            >
              {loginLoading ? (
                <span className="w-9 h-9 border-2 border-blue-400/30 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  )
}

function DesktopNavButton({
  view,
  current,
  set,
  icon: Icon,
  label,
  scrolled,
}: {
  view: View
  current: View
  set: (v: View) => void
  icon: LucideIcon
  label: string
  scrolled: boolean
}) {
  const active = current === view
  return (
    <button
      onClick={() => set(view)}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 overflow-hidden ${
        active
          ? scrolled ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-white"
          : scrolled 
            ? "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" 
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      {active && (
        <span className={`absolute inset-0 rounded-full transition-all duration-500 ${
          scrolled ? "bg-slate-100 dark:bg-white/10" : "bg-white/10 dark:bg-white/5"
        }`} />
      )}
      <Icon className="w-5 h-5 relative z-10" />
      <span className="relative z-10">{label}</span>
    </button>
  )
}

function MobileNavButton({
  view,
  current,
  set,
  icon: Icon,
  label,
}: {
  view: View
  current: View
  set: (v: View) => void
  icon: LucideIcon
  label: string
}) {
  const active = current === view
  return (
    <button
      onClick={() => set(view)}
      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl transition-all duration-300 ${
        active
          ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
          : "text-slate-500 dark:text-slate-400"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {active && (
        <span className="text-[12px] font-bold tracking-wide animate-in fade-in slide-in-from-left-2 whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  )
}

function NavbarAvatar({
  auth,
  size = "sm",
}: {
  auth: AuthSession | null
  size?: "sm" | "md" | "lg"
}) {
  const cls = size === "sm" ? "w-8 h-8 text-xs" : size === "md" ? "w-9 h-9 text-sm" : "w-10 h-10 text-sm"
  if (auth?.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={auth.photoURL}
        alt={auth.name}
        className={`${cls} rounded-full object-cover border border-slate-200 dark:border-white/10`}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <div className={`${cls} rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold`}>
      {(auth?.name ?? "U").charAt(0).toUpperCase()}
    </div>
  )
}
