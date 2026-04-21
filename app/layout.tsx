import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
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
      <body className="font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 selection:bg-blue-500/30">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
