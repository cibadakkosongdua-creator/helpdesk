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
  <div style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.accentColor}); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <img src="${EMAIL_CONFIG.logoUrl}" alt="Logo SDN 02 Cibadak" style="width: 80px; height: 80px; margin-bottom: 16px; border-radius: 50%; background: white; padding: 8px;" />
    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${EMAIL_CONFIG.schoolName}</h1>
    <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">Sistem Helpdesk Digital</p>
  </div>
`

// Shared email footer with operator info
const emailFooter = `
  <div style="background: #1e293b; padding: 32px 24px; border-radius: 0 0 12px 12px; color: white;">
    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7);">Dikelola oleh:</p>
      <p style="margin: 0; font-size: 16px; font-weight: 700; color: white;">${EMAIL_CONFIG.operatorName}</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">${EMAIL_CONFIG.operatorRole}</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.7);">${EMAIL_CONFIG.operatorPhone}</p>
    </div>
    <div style="text-align: center;">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7);">${EMAIL_CONFIG.schoolName}</p>
      <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.6;">
        ${EMAIL_CONFIG.schoolAddress}<br>
        Telp: ${EMAIL_CONFIG.schoolPhone} | Email: ${EMAIL_CONFIG.schoolEmail}<br>
        <a href="${EMAIL_CONFIG.schoolWebsite}" style="color: ${EMAIL_CONFIG.accentColor}; text-decoration: none;">${EMAIL_CONFIG.schoolWebsite.replace('https://', '')}</a>
      </p>
    </div>
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
      <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.5);">
        Email ini dikirim secara otomatis oleh sistem Helpdesk ${EMAIL_CONFIG.schoolName}.<br>
        Mohon tidak membalas email ini secara langsung.
      </p>
    </div>
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
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ${emailHeader}
        <div style="padding: 32px 24px; background: #f8fafc;">
          <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <div style="background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.accentColor}); color: white; padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 18px;">
                ${ticketCode}
              </div>
              <div style="background: ${bg}; color: ${color}; padding: 6px 16px; border-radius: 999px; font-weight: 600; font-size: 12px;">
                ${priority}
              </div>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; color: #64748b; width: 120px; font-weight: 500;">Pelapor</td>
                <td style="padding: 12px 0; font-weight: 600; color: #1e293b; font-size: 16px;">${reporterName}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #64748b; font-weight: 500;">Layanan</td>
                <td style="padding: 12px 0; font-weight: 600; color: #1e293b;">${service}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #64748b; font-weight: 500;">Departemen</td>
                <td style="padding: 12px 0; font-weight: 600; color: #1e293b;">${department}</td>
              </tr>
            </table>
          </div>
          <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 12px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Detail Keluhan</p>
            <p style="margin: 0; color: #334155; line-height: 1.7; white-space: pre-wrap;">${details}</p>
          </div>
          <div style="text-align: center; margin-top: 32px;">
            <a href="${ticketUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.accentColor}); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);">
              Lihat & Tangani Tiket
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
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ${emailHeader}
        <div style="padding: 32px 24px; background: #f8fafc;">
          <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Yth. Bapak/Ibu</p>
            <p style="margin: 0 0 20px; color: #1e293b; font-size: 18px; font-weight: 600;">${reporterName}</p>
            <p style="margin: 0 0 16px; color: #334155; line-height: 1.6;">
              Admin <strong style="color: ${EMAIL_CONFIG.accentColor};">${adminName}</strong> telah memberikan balasan untuk tiket Anda:
            </p>
            <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(30, 64, 175, 0.05)); border-radius: 12px; padding: 20px; border-left: 4px solid ${EMAIL_CONFIG.accentColor};">
              <p style="margin: 0; color: #334155; line-height: 1.7; white-space: pre-wrap;">${replyText}</p>
            </div>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                Kode Tiket: <strong style="color: ${EMAIL_CONFIG.primaryColor};">${ticketCode}</strong>
              </p>
            </div>
          </div>
          <div style="text-align: center; margin-top: 32px;">
            <a href="${ticketUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.accentColor}); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);">
              Lihat Percakapan Lengkap
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
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ${emailHeader}
        <div style="padding: 32px 24px; background: #f8fafc; text-align: center;">
          <div style="background: white; border-radius: 12px; padding: 32px 24px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Yth. Bapak/Ibu</p>
            <p style="margin: 0 0 24px; color: #1e293b; font-size: 18px; font-weight: 600;">${reporterName}</p>
            <p style="margin: 0 0 24px; color: #334155; line-height: 1.6;">
              Status tiket Anda telah diperbarui menjadi:
            </p>
            <div style="display: inline-block; padding: 16px 40px; background: ${bg}; border-radius: 999px; border: 2px solid ${color};">
              <span style="font-size: 20px; font-weight: 700; color: ${color};">${newStatus}</span>
            </div>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                Kode Tiket: <strong style="color: ${EMAIL_CONFIG.primaryColor};">${ticketCode}</strong>
              </p>
            </div>
          </div>
          ${newStatus === "Resolved" ? `
          <div style="background: linear-gradient(135deg, rgba(22, 163, 74, 0.1), rgba(22, 163, 74, 0.05)); border-radius: 12px; padding: 24px; border: 1px solid rgba(22, 163, 74, 0.2); margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #166534; font-weight: 700; font-size: 18px;">
              Tiket Anda telah diselesaikan
            </p>
            <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
              Terima kasih telah menggunakan layanan Helpdesk ${EMAIL_CONFIG.schoolName}.<br>
              Semoga keluhan Anda dapat ditangani dengan baik.
            </p>
          </div>
          ` : ""}
          <div style="text-align: center; margin-top: 32px;">
            <a href="${ticketUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${EMAIL_CONFIG.primaryColor}, ${EMAIL_CONFIG.accentColor}); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);">
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
