import { NextRequest, NextResponse } from "next/server"
import {
  sendEmail,
  emailNewTicketAdmin,
  emailReplyUser,
  emailStatusChanged,
} from "@/lib/helpdesk/email-service"
import type { TicketStatus } from "@/lib/helpdesk/firestore-service"

/**
 * Email API Route
 *
 * POST /api/email
 * Body: { type: "new-ticket" | "reply" | "status-change", data: {...} }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body

    console.log("[Email API] Received request:", { type, hasData: !!data })

    if (!type || !data) {
      return NextResponse.json({ error: "Missing type or data" }, { status: 400 })
    }

    // Check if API key exists
    if (!process.env.RESEND_API_KEY) {
      console.error("[Email API] Missing RESEND_API_KEY")
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    let email
    switch (type) {
      case "new-ticket":
        email = emailNewTicketAdmin({
          ...data,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        })
        console.log("[Email API] Sending new-ticket email to:", email.to)
        break

      case "reply":
        if (!data.reporterEmail) {
          return NextResponse.json({ error: "Missing reporterEmail" }, { status: 400 })
        }
        email = emailReplyUser({
          ...data,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        })
        email.to = data.reporterEmail
        break

      case "status-change":
        if (!data.reporterEmail) {
          return NextResponse.json({ error: "Missing reporterEmail" }, { status: 400 })
        }
        email = emailStatusChanged({
          ...data,
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        })
        break

      default:
        return NextResponse.json({ error: "Invalid email type" }, { status: 400 })
    }

    const result = await sendEmail(email)

    console.log("[Email API] Result:", result)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    console.error("[Email API] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
