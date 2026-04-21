import { NextRequest, NextResponse } from "next/server"
import { sendTelegramNotification } from "@/lib/helpdesk/telegram-service"

// API endpoint untuk kirim notifikasi Telegram
// Dipanggil dari client saat ada tiket/reply baru

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    // Validasi sederhana - bisa ditambahkan API key validation
    if (!type || !data) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    let success = false

    if (type === "new-ticket") {
      const text = `
<b> tiket Baru</b>
<b>Kode:</b> ${data.code}
<b>Nama:</b> ${data.name}
<b>Layanan:</b> ${data.service}
<b>Prioritas:</b> ${data.priority}
<b>Departemen:</b> ${data.department}

<a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin">Buka Dashboard</a>
      `.trim()
      success = await sendTelegramNotification({ text, parseMode: "HTML" })
    }

    if (type === "new-reply") {
      const from = data.from === "admin" ? "Admin" : "Pelapor"
      const text = `
<b> Balasan Baru</b>
<b>Kode:</b> ${data.code}
<b>Dari:</b> ${from} (${data.name})

"${data.message?.substring(0, 200) || ""}${(data.message?.length || 0) > 200 ? "..." : ""}"

<a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin">Buka Dashboard</a>
      `.trim()
      success = await sendTelegramNotification({ text, parseMode: "HTML" })
    }

    return NextResponse.json({ success })
  } catch (err) {
    console.error("[api/telegram] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
