import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_DRIVE_UPLOAD_URL || ""
const DRIVE_FOLDER_ID = process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID || ""

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

function fileToBase64(buffer: Buffer): string {
  return buffer.toString("base64")
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file melebihi 10 MB" },
        { status: 400 },
      )
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Tipe file tidak diizinkan: ${file.type}` },
        { status: 400 },
      )
    }

    if (!APPS_SCRIPT_URL) {
      return NextResponse.json(
        { error: "Apps Script endpoint belum dikonfigurasi. Set NEXT_PUBLIC_DRIVE_UPLOAD_URL." },
        { status: 501 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = fileToBase64(buffer)

    // Proxy to Apps Script (server-side, no CORS issue)
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        mime: file.type || "application/octet-stream",
        data: base64,
        folderId: DRIVE_FOLDER_ID,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("[api/upload] Apps Script error:", text)
      return NextResponse.json({ error: `Upload gagal: HTTP ${res.status}` }, { status: 502 })
    }

    const data = await res.json() as { url?: string; name?: string; id?: string; error?: string }

    if (data.error) {
      console.error("[api/upload] Apps Script returned error:", data.error)
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    if (!data.url) {
      return NextResponse.json({ error: "Upload gagal: tidak ada URL dikembalikan" }, { status: 502 })
    }

    return NextResponse.json({
      id: data.id || "",
      name: data.name || file.name,
      mimeType: file.type,
      size: file.size,
      url: data.url,
    })
  } catch (err) {
    const msg = (err as Error)?.message || "Upload gagal"
    console.error("[api/upload] error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
