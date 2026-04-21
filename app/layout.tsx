import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Suspense } from 'react'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'Smart Helpdesk SDN 02 Cibadak',
    template: '%s · Smart Helpdesk SDN 02 Cibadak',
  },
  description:
    'Pusat layanan digital terpadu SDN 02 Cibadak — tiket bantuan (lengkap dengan lampiran & pelacakan kode), survei kepuasan (IKM), analitik Gemini AI, dan kontak darurat sekolah.',
  keywords: [
    'helpdesk',
    'SDN 02 Cibadak',
    'tiket sekolah',
    'IKM',
    'survei kepuasan',
    'pengaduan',
    'portal sekolah',
  ],
  openGraph: {
    title: 'Smart Helpdesk SDN 02 Cibadak',
    description:
      'Layanan tiket, survei, analitik, dan kontak darurat SDN 02 Cibadak dalam satu portal.',
    locale: 'id_ID',
    type: 'website',
  },
  applicationName: 'Smart Helpdesk SDN 02 Cibadak',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/sdn02cbd.ico',
        type: 'image/x-icon',
      },
    ],
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning className="bg-slate-50 dark:bg-slate-950">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          #preloader {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
          }
          html.dark #preloader {
            background: #020617;
          }
          .preloader-hidden #preloader {
            display: none;
          }
        ` }} />
      </head>
      <body className="font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 selection:bg-blue-500/30">
        {/* CSS Preloader - shows instantly before React hydrates */}
        <div id="preloader">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <div style={{ position: 'relative', width: '7rem', height: '7rem' }}>
              <div style={{ position: 'absolute', inset: '0', border: '4px solid #bfdbfe', borderRadius: '50%', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              <div style={{ position: 'absolute', inset: '0.5rem', border: '4px solid #93c5fd', borderRadius: '50%', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite', animationDelay: '200ms' }} />
              <div style={{ position: 'absolute', inset: '1rem', border: '4px solid #60a5fa', borderRadius: '50%', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite', animationDelay: '400ms' }} />
              <div style={{ position: 'absolute', inset: '1.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '0.625rem', height: '0.625rem', backgroundColor: '#2563eb', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: '0ms' }} />
                <div style={{ width: '0.625rem', height: '0.625rem', backgroundColor: '#2563eb', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: '150ms' }} />
                <div style={{ width: '0.625rem', height: '0.625rem', backgroundColor: '#2563eb', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: '300ms' }} />
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', animation: 'pulse 2s infinite' }}>Memuat...</p>
            </div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          // Hide preloader after page loads
          window.addEventListener('load', function() {
            setTimeout(function() {
              document.body.classList.add('preloader-hidden');
            }, 500);
          });
        ` }} />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <SpeedInsights />
      </body>
    </html>
  )
}
