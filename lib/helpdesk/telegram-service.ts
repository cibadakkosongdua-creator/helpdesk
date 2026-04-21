/**
 * Telegram Bot Service - Notifikasi ke grup Telegram
 * 
 * SETUP:
 * 1. Chat @BotFather di Telegram, ketik /newbot, ikuti instruksi
 * 2. Simpan TOKEN yang diberikan
 * 3. Buat grup Telegram, add bot ke grup
 * 4. Kirim pesan ke grup, lalu buka:
 *    https://api.telegram.org/bot<TOKEN>/getUpdates
 * 5. Cari "chat":{"id": -100XXXXXXXXXX} - simpan angkanya (negatif)
 * 6. Tambahkan ke .env.local:
 *    TELEGRAM_BOT_TOKEN=your_bot_token
 *    TELEGRAM_CHAT_ID=your_chat_id
 */

export interface TelegramMessage {
  text: string
  parseMode?: "HTML" | "Markdown" | "MarkdownV2"
}

export async function sendTelegramNotification(message: TelegramMessage): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn("[telegram] Bot token or chat ID not configured")
    return false
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.text,
        parse_mode: message.parseMode || "HTML",
        disable_web_page_preview: true,
      }),
    })

    const data = await res.json()
    if (!data.ok) {
      console.warn("[telegram] Failed to send:", data.description)
      return false
    }

    return true
  } catch (err) {
    console.error("[telegram] Error:", err)
    return false
  }
}

// Helper functions for common notifications

export function notifyNewTicket(ticket: {
  code: string
  name: string
  service: string
  priority: string
  department: string
}): Promise<boolean> {
  const text = `
<b> tiket Baru</b>
<b>Kode:</b> ${ticket.code}
<b>Nama:</b> ${ticket.name}
<b>Layanan:</b> ${ticket.service}
<b>Prioritas:</b> ${ticket.priority}
<b>Departemen:</b> ${ticket.department}

<a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin">Buka Dashboard</a>
  `.trim()

  return sendTelegramNotification({ text, parseMode: "HTML" })
}

export function notifyNewReply(ticket: {
  code: string
  name: string
  from: "admin" | "reporter"
  message: string
}): Promise<boolean> {
  const from = ticket.from === "admin" ? "Admin" : "Pelapor"
  const text = `
<b> Balasan Baru</b>
<b>Kode:</b> ${ticket.code}
<b>Dari:</b> ${from} (${ticket.name})

"${ticket.message.substring(0, 200)}${ticket.message.length > 200 ? "..." : ""}"

<a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin">Buka Dashboard</a>
  `.trim()

  return sendTelegramNotification({ text, parseMode: "HTML" })
}
