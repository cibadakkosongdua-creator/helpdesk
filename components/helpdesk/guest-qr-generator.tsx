"use client"

import { Download, QrCode, Copy, Check, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import QRCodeStyling from "qr-code-styling"
import type { ShowToastFn } from "./types"

export function GuestQrGenerator({ showToast }: { showToast: ShowToastFn }) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const qrCodeInstance = useRef<QRCodeStyling | null>(null)
  
  // Get the base URL for QR code
  const baseUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/tamu`
    : "/tamu"

  useEffect(() => {
    if (!qrRef.current) return

    // Clear previous QR code if exists
    if (qrRef.current.innerHTML) {
      qrRef.current.innerHTML = ""
    }

    // Initialize QR code with logo
    const qrCode = new QRCodeStyling({
      width: 300,
      height: 300,
      type: "svg",
      data: baseUrl,
      image: "/logo.png",
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 10,
        imageSize: 0.3,
      },
      dotsOptions: {
        color: "#000000",
        type: "square",
      },
      backgroundOptions: {
        color: "#ffffff",
      },
      cornersSquareOptions: {
        type: "square",
      },
      cornersDotOptions: {
        type: "square",
      },
    })

    qrCode.append(qrRef.current)
    qrCodeInstance.current = qrCode

    return () => {
      if (qrRef.current) {
        qrRef.current.innerHTML = ""
      }
      qrCodeInstance.current = null
    }
  }, [baseUrl])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl)
      setCopied(true)
      showToast("URL berhasil disalin", "success")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast("Gagal menyalin URL", "error")
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      if (qrCodeInstance.current) {
        await qrCodeInstance.current.download({ name: "qr-code-tamu", extension: "png" })
        showToast("QR code berhasil diunduh", "success")
      }
    } catch {
      showToast("Gagal mengunduh QR code", "error")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-2xl">
          <QrCode className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">QR Code Buku Tamu</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Scan untuk akses form tamu
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div ref={qrRef} className="w-64 h-64 bg-white rounded-2xl shadow-inner p-4 flex items-center justify-center border border-slate-200 dark:border-white/10" />
            <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">Scan untuk buku tamu</span>
            </div>
          </div>
        </div>

        {/* Info & Actions Section */}
        <div className="flex flex-col gap-4">
          {/* URL Display */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
              URL Buku Tamu
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-300 font-mono truncate">
                {baseUrl}
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 transition-colors"
                title="Salin URL"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Mengunduh...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Unduh QR Code
              </>
            )}
          </button>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/20">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong className="font-bold">Cara pakai:</strong> Print QR code ini dan tempel di ruang tamu. Tamu bisa scan dengan kamera HP untuk mengisi buku tamu digital.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
