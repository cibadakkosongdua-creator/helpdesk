import { Resend } from "resend"

// Lazy initialize Resend client to avoid build error when API key is missing
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set")
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export type EmailTemplate = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

// Email branding configuration
const EMAIL_CONFIG = {
  schoolName: "SDN 02 Cibadak",
  schoolAddress: "Jl. Kebon Pala 2 Cibadak, Sukabumi, Jawa Barat",
  schoolPhone: "(0266) 532253",
  schoolEmail: "info@sdn02cibadak.sch.id",
  schoolWebsite: "https://sdn02cibadak.sch.id",
  logoUrl: "https://helpdesk.sdn02cibadak.sch.id/logo.png",
  operatorName: "Anggi Rahadian",
  operatorRole: "Operator Sekolah / Admin Helpdesk",
  operatorPhone: "0877-7709-9842",
  primaryColor: "#1e40af", // Biru tua
  accentColor: "#3b82f6", // Biru
}

// Shared email header with logo
const emailHeader = `
  <div style="background-color: #ffffff; padding: 40px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
    <img src="${EMAIL_CONFIG.logoUrl}" alt="Logo SDN 02 Cibadak" style="width: 70px; height: 70px; margin-bottom: 20px;" />
    <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em; line-height: 1.2;">${EMAIL_CONFIG.schoolName}</h1>
    <p style="margin: 8px 0 0; font-size: 14px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">Smart Helpdesk System</p>
  </div>
`

// Shared email footer with operator info
const emailFooter = `
  <div style="background-color: #f8fafc; padding: 48px 24px; text-align: center; border-top: 1px solid #f1f5f9;">
    <div style="margin-bottom: 32px;">
      <p style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Dikelola Oleh</p>
      <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b;">${EMAIL_CONFIG.operatorName}</p>
      <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">${EMAIL_CONFIG.operatorRole}</p>
      <p style="margin: 8px 0 0; font-size: 14px; font-weight: 600; color: ${EMAIL_CONFIG.accentColor};">${EMAIL_CONFIG.operatorPhone}</p>
    </div>
    
    <div style="margin-bottom: 32px; padding: 24px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #1e293b;">${EMAIL_CONFIG.schoolName}</p>
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
        ${EMAIL_CONFIG.schoolAddress}<br>
        Telp: ${EMAIL_CONFIG.schoolPhone} &bull; Email: ${EMAIL_CONFIG.schoolEmail}
      </p>
      <div style="margin-top: 12px;">
        <a href="${EMAIL_CONFIG.schoolWebsite}" style="font-size: 13px; color: ${EMAIL_CONFIG.accentColor}; text-decoration: none; font-weight: 600;">${EMAIL_CONFIG.schoolWebsite.replace('https://', '')}</a>
      </div>
    </div>

    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
      Email ini dikirim secara otomatis oleh sistem. Mohon tidak membalas email ini.<br>
      &copy; ${new Date().getFullYear()} ${EMAIL_CONFIG.schoolName}. All rights reserved.
    </p>
  </div>
`

/**
 * Send email using Resend
 */
export async function sendEmail({ to, subject, html, text }: EmailTemplate) {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: `Helpdesk ${EMAIL_CONFIG.schoolName} <noreply@helpdesk.sdn02cibadak.sch.id>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    })

    if (error) {
      console.error("Email error:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Email send error:", error)
    return { success: false, error }
  }
}

/**
 * Email template: New ticket notification for admin
 */
export function emailNewTicketAdmin(data: {
  ticketCode: string
  ticketId: string
  reporterName: string
  service: string
  priority: string
  department: string
  details: string
  appUrl: string
}): EmailTemplate {
  const { ticketCode, ticketId, reporterName, service, priority, department, details, appUrl } = data
  const ticketUrl = `${appUrl}/admin?ticket=${ticketId}`

  const priorityColors: Record<string, { bg: string; color: string }> = {
    Urgent: { bg: "#fef2f2", color: "#dc2626" },
    Tinggi: { bg: "#fffbeb", color: "#d97706" },
    Sedang: { bg: "#f0fdf4", color: "#16a34a" },
    Rendah: { bg: "#f8fafc", color: "#64748b" },
  }
  const { bg, color } = priorityColors[priority] || priorityColors.Rendah

  return {
    to: process.env.ADMIN_EMAIL || "admin@example.com",
    subject: `[${ticketCode}] Tiket Baru dari ${reporterName}`,
    html: `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        ${emailHeader}
        <div style="padding: 40px 32px; background-color: #ffffff;">
          <div style="margin-bottom: 32px; text-align: center;">
            <div style="display: inline-block; padding: 12px 24px; background-color: #f1f5f9; border-radius: 12px; margin-bottom: 16px;">
              <span style="font-family: monospace; font-size: 24px; font-weight: 800; color: ${EMAIL_CONFIG.primaryColor}; letter-spacing: 0.1em;">${ticketCode}</span>
            </div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a;">Tiket Bantuan Baru</h2>
          </div>

          <div style="background-color: #f8fafc; border-radius: 20px; padding: 24px; border: 1px solid #f1f5f9; margin-bottom: 32px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Pelapor</td>
                <td style="padding: 8px 0; font-size: 15px; color: #1e293b; font-weight: 700; text-align: right;">${reporterName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Layanan</td>
                <td style="padding: 8px 0; font-size: 15px; color: #1e293b; font-weight: 700; text-align: right;">${service}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Prioritas</td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="padding: 4px 12px; background-color: ${bg}; color: ${color}; border-radius: 999px; font-size: 12px; font-weight: 700;">${priority}</span>
                </td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 40px;">
            <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Detail Keluhan</p>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; color: #334155; line-height: 1.6; font-size: 15px;">
              ${details}
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${ticketUrl}" style="display: inline-block; padding: 18px 36px; background-color: ${EMAIL_CONFIG.primaryColor}; color: #ffffff; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(30, 64, 175, 0.2);">
              Tanggapi Tiket Sekarang
            </a>
          </div>
        </div>
        ${emailFooter}
      </div>
    `,
    text: `
Tiket Baru: ${ticketCode}

Pelapor: ${reporterName}
Layanan: ${service}
Prioritas: ${priority}
Departemen: ${department}

Detail:
${details}

Lihat tiket: ${ticketUrl}

---
${EMAIL_CONFIG.schoolName}
${EMAIL_CONFIG.schoolAddress}
Dikelola oleh: ${EMAIL_CONFIG.operatorName} (${EMAIL_CONFIG.operatorRole})
    `.trim(),
  }
}

/**
 * Email template: Reply notification for user
 */
export function emailReplyUser(data: {
  ticketCode: string
  ticketId: string
  reporterName: string
  replyText: string
  adminName: string
  appUrl: string
}): EmailTemplate {
  const { ticketCode, ticketId, reporterName, replyText, adminName, appUrl } = data
  const ticketUrl = `${appUrl}/track?code=${ticketCode}`

  return {
    to: "", // Will be set to reporterEmail
    subject: `[${ticketCode}] Ada Balasan dari Admin`,
    html: `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        ${emailHeader}
        <div style="padding: 40px 32px; background-color: #ffffff;">
          <div style="margin-bottom: 32px;">
            <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #64748b;">Halo Bapak/Ibu,</p>
            <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">${reporterName}</h2>
          </div>

          <div style="background-color: #f8fafc; border-radius: 20px; padding: 24px; border: 1px solid #f1f5f9; margin-bottom: 32px;">
            <p style="margin: 0 0 16px; color: #334155; line-height: 1.6; font-size: 15px;">
              Admin <strong style="color: ${EMAIL_CONFIG.primaryColor};">${adminName}</strong> baru saja membalas tiket bantuan Anda:
            </p>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${EMAIL_CONFIG.accentColor}; border-radius: 12px; padding: 20px; color: #1e293b; font-size: 15px; line-height: 1.7; font-style: italic;">
              "${replyText}"
            </div>
          </div>

          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 12px 20px; display: inline-block; margin-bottom: 32px;">
            <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 600;">
              Kode Tiket: <span style="color: ${EMAIL_CONFIG.primaryColor}; font-family: monospace; font-weight: 800;">${ticketCode}</span>
            </p>
          </div>

          <div style="text-align: center;">
            <a href="${ticketUrl}" style="display: inline-block; padding: 18px 36px; background-color: ${EMAIL_CONFIG.primaryColor}; color: #ffffff; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(30, 64, 175, 0.2);">
              Lihat Selengkapnya
            </a>
          </div>
        </div>
        ${emailFooter}
      </div>
    `,
    text: `
Balasan Baru untuk Tiket ${ticketCode}

Yth. ${reporterName},

Admin ${adminName} telah memberikan balasan untuk tiket Anda:

"${replyText}"

Lihat percakapan lengkap: ${ticketUrl}

---
${EMAIL_CONFIG.schoolName}
${EMAIL_CONFIG.schoolAddress}
Dikelola oleh: ${EMAIL_CONFIG.operatorName} (${EMAIL_CONFIG.operatorRole})
    `.trim(),
  }
}

/**
 * Email template: Guest check-in confirmation
 */
export function emailGuestConfirmation(data: {
  guestName: string
  category: string
  purpose: string
  checkInTime: string
  appUrl: string
}): EmailTemplate {
  const { guestName, category, purpose, checkInTime, appUrl } = data

  return {
    to: "", // Will be set to guest email
    subject: `Konfirmasi Kunjungan - ${EMAIL_CONFIG.schoolName}`,
    html: `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        ${emailHeader}
        <div style="padding: 40px 32px; background-color: #ffffff;">
          <div style="margin-bottom: 32px; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #64748b;">Halo,</p>
            <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">${guestName}</h2>
          </div>

          <div style="background-color: #f8fafc; border-radius: 20px; padding: 24px; border: 1px solid #f1f5f9; margin-bottom: 32px;">
            <p style="margin: 0 0 20px; color: #334155; line-height: 1.6; font-size: 15px; text-align: center;">
              Terima kasih telah berkunjung ke <strong>${EMAIL_CONFIG.schoolName}</strong>. Kehadiran Anda telah kami catat dalam sistem.
            </p>
            
            <div style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 16px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #f1f5f9;">Kategori</td>
                  <td style="padding: 16px; font-size: 15px; color: #1e293b; font-weight: 700; border-bottom: 1px solid #f1f5f9; text-align: right;">${category}</td>
                </tr>
                <tr>
                  <td style="padding: 16px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #f1f5f9;">Keperluan</td>
                  <td style="padding: 16px; font-size: 15px; color: #1e293b; font-weight: 700; border-bottom: 1px solid #f1f5f9; text-align: right;">${purpose}</td>
                </tr>
                <tr>
                  <td style="padding: 16px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Check-in</td>
                  <td style="padding: 16px; font-size: 15px; color: #1e293b; font-weight: 700; text-align: right;">${checkInTime}</td>
                </tr>
              </table>
            </div>
          </div>

          <div style="background-color: #eff6ff; border-radius: 20px; padding: 24px; border: 1px solid #dbeafe; margin-bottom: 32px; text-align: center;">
            <p style="margin: 0 0 12px; color: ${EMAIL_CONFIG.primaryColor}; font-weight: 800; font-size: 18px;">
              📝 Survei Kepuasan
            </p>
            <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
              Bantu kami meningkatkan kualitas layanan dengan memberikan feedback singkat melalui link di bawah ini.
            </p>
          </div>

          <div style="text-align: center;">
            <a href="${appUrl}/tamu" style="display: inline-block; padding: 18px 36px; background-color: ${EMAIL_CONFIG.primaryColor}; color: #ffffff; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(30, 64, 175, 0.2);">
              Isi Survei Sekarang
            </a>
          </div>
        </div>
        ${emailFooter}
      </div>
    `,
    text: `
Konfirmasi Kunjungan - ${EMAIL_CONFIG.schoolName}

Yth. ${guestName},

Terima kasih telah berkunjung ke ${EMAIL_CONFIG.schoolName}. Data kehadiran Anda telah tercatat.

Kategori: ${category}
Keperluan: ${purpose}
Check-in: ${checkInTime}

Bantu kami meningkatkan layanan dengan mengisi survei kepuasan: ${appUrl}/tamu

---
${EMAIL_CONFIG.schoolName}
${EMAIL_CONFIG.schoolAddress}
Dikelola oleh: ${EMAIL_CONFIG.operatorName} (${EMAIL_CONFIG.operatorRole})
    `.trim(),
  }
}

/**
 * Email template: Status changed notification
 */
export function emailStatusChanged(data: {
  ticketCode: string
  ticketId: string
  reporterName: string
  newStatus: string
  reporterEmail: string
  appUrl: string
}): EmailTemplate {
  const { ticketCode, reporterName, newStatus, reporterEmail, appUrl } = data
  const ticketUrl = `${appUrl}/track?code=${ticketCode}`

  const statusColors: Record<string, { bg: string; color: string; icon: string }> = {
    Open: { bg: "#fef2f2", color: "#dc2626", icon: "baru" },
    "In Progress": { bg: "#fffbeb", color: "#d97706", icon: "diproses" },
    Resolved: { bg: "#f0fdf4", color: "#16a34a", icon: "selesai" },
  }

  const { bg, color } = statusColors[newStatus] || { bg: "#f8fafc", color: "#64748b" }

  return {
    to: reporterEmail,
    subject: `[${ticketCode}] Status Tiket: ${newStatus}`,
    html: `
      <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        ${emailHeader}
        <div style="padding: 40px 32px; background-color: #ffffff; text-align: center;">
          <div style="margin-bottom: 32px;">
            <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #64748b;">Update Status Tiket</p>
            <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a;">${reporterName}</h2>
          </div>

          <div style="background-color: #f8fafc; border-radius: 20px; padding: 32px 24px; border: 1px solid #f1f5f9; margin-bottom: 32px;">
            <p style="margin: 0 0 24px; color: #334155; line-height: 1.6; font-size: 15px;">
              Status tiket bantuan Anda telah diperbarui menjadi:
            </p>
            <div style="display: inline-block; padding: 16px 40px; background-color: ${bg}; border-radius: 16px; border: 2px solid ${color};">
              <span style="font-size: 20px; font-weight: 800; color: ${color}; text-transform: uppercase; letter-spacing: 0.05em;">${newStatus}</span>
            </div>
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 600;">
                Kode Tiket: <span style="color: ${EMAIL_CONFIG.primaryColor}; font-family: monospace; font-weight: 800;">${ticketCode}</span>
              </p>
            </div>
          </div>

          ${newStatus === "Resolved" ? `
          <div style="background-color: #f0fdf4; border-radius: 20px; padding: 24px; border: 1px solid #dcfce7; margin-bottom: 32px;">
            <p style="margin: 0 0 8px; color: #166534; font-weight: 800; font-size: 18px;">
              Tiket Selesai
            </p>
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
              Terima kasih telah menggunakan layanan Helpdesk <strong>${EMAIL_CONFIG.schoolName}</strong>. Kami senang dapat membantu Anda.
            </p>
          </div>
          ` : ""}

          <div style="text-align: center;">
            <a href="${ticketUrl}" style="display: inline-block; padding: 18px 36px; background-color: ${EMAIL_CONFIG.primaryColor}; color: #ffffff; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(30, 64, 175, 0.2);">
              Lihat Detail Tiket
            </a>
          </div>
        </div>
        ${emailFooter}
      </div>
    `,
    text: `
Status Tiket Diperbarui: ${ticketCode}

Yth. ${reporterName},

Status tiket Anda telah diperbarui menjadi: ${newStatus}

${newStatus === "Resolved" ? "Tiket Anda telah diselesaikan. Terima kasih telah menggunakan layanan Helpdesk " + EMAIL_CONFIG.schoolName + "!" : ""}

Lihat tiket: ${ticketUrl}

---
${EMAIL_CONFIG.schoolName}
${EMAIL_CONFIG.schoolAddress}
Dikelola oleh: ${EMAIL_CONFIG.operatorName} (${EMAIL_CONFIG.operatorRole})
    `.trim(),
  }
}
