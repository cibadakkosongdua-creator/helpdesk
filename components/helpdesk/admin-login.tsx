"use client"

import { Lock, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { signInWithGoogle, type AuthSession } from "@/lib/helpdesk/auth-service"
import type { ShowToastFn, View } from "./types"

export function AdminLogin({
  setView,
  showToast,
  onLogin,
}: {
  setView: (v: View) => void
  showToast: ShowToastFn
  onLogin: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const session = await signInWithGoogle()
      if (session.role !== "admin") {
        showToast("Akun Anda tidak memiliki akses admin.", "error")
        return
      }
      showToast(`Selamat datang, ${session.name}.`, "success")
      onLogin()
      setView("/admin")
    } catch (err: any) {
      showToast(err?.message || "Gagal masuk. Coba lagi.", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 dark:from-blue-500 dark:to-indigo-600 flex items-center justify-center shadow-lg mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Admin Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
            Masuk untuk mengelola tiket bantuan dan data survei SDN 02 Cibadak.
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="relative z-10 w-full bg-white dark:bg-white text-slate-900 font-bold rounded-2xl px-4 py-4 flex items-center justify-center gap-3 border border-slate-200 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 shadow-sm"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        <div className="relative z-10 flex items-center justify-center gap-2 mt-6 text-xs text-slate-500 dark:text-slate-400">
          <Lock className="w-3 h-3" />
          <span>Otentikasi Firebase &middot; Google Workspace</span>
        </div>

        <button
          onClick={() => setView("/")}
          className="relative z-10 w-full mt-6 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          &larr; Kembali ke Beranda
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
