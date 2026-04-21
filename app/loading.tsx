export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center gap-8">
        {/* Animated rings */}
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-ping" />
          <div className="absolute inset-2 border-4 border-blue-300 dark:border-blue-800 rounded-full animate-ping" style={{ animationDelay: "200ms" }} />
          <div className="absolute inset-4 border-4 border-blue-400 dark:border-blue-700 rounded-full animate-ping" style={{ animationDelay: "400ms" }} />
          {/* Logo center */}
          <div className="absolute inset-6 rounded-full flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full rounded-full object-cover" />
          </div>
        </div>
        {/* Loading text with animated dots */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">Memuat...</p>
        </div>
      </div>
    </div>
  )
}
