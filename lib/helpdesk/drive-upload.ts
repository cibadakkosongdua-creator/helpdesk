"use client"

import type { Attachment } from "./firestore-service"

/**
 * Folder target (Google Drive) tempat admin sekolah menampung bukti/lampiran.
 * User bisa langsung membuka folder ini untuk melihat file yang diupload.
 */
export const DRIVE_FOLDER_ID = process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID ?? ""
export const DRIVE_FOLDER_URL = DRIVE_FOLDER_ID
  ? `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`
  : ""

/**
 * Optional endpoint Google Apps Script (Web App) yang diset oleh admin.
 * Apps Script menerima file base64 + nama, menyimpan ke folder Drive di atas,
 * lalu mengembalikan { url, id, name }.
 *
 * Jika env ini tidak ada, user akan melihat UI fallback:
 *   - buka folder Drive secara manual, lalu tempel link "share" ke form.
 */
export function getDriveUploadEndpoint(): string {
  if (typeof process === "undefined") return ""
  return process.env.NEXT_PUBLIC_DRIVE_UPLOAD_URL ?? ""
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // strip "data:mime;base64," prefix
      const idx = result.indexOf(",")
      resolve(idx >= 0 ? result.slice(idx + 1) : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export type UploadResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; error: string; fallback?: true }

/**
 * Upload via Apps Script web app jika tersedia. Jika gagal / belum dikonfigurasi,
 * kembalikan { ok:false, fallback:true } agar UI bisa menampilkan mode manual.
 */
export async function uploadToDrive(file: File): Promise<UploadResult> {
  const endpoint = getDriveUploadEndpoint()
  if (!endpoint) return { ok: false, error: "endpoint-not-configured", fallback: true }

  try {
    const base64 = await fileToBase64(file)
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        mime: file.type,
        data: base64,
        folderId: DRIVE_FOLDER_ID,
      }),
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, fallback: true }
    }
    const data = (await res.json()) as { url?: string; name?: string }
    if (!data.url) {
      return { ok: false, error: "no-url", fallback: true }
    }
    return {
      ok: true,
      attachment: {
        name: data.name ?? file.name,
        url: data.url,
        size: file.size,
        mime: file.type,
      },
    }
  } catch (err) {
    return {
      ok: false,
      error: (err as Error)?.message ?? "unknown",
      fallback: true,
    }
  }
}

/**
 * Validate & normalize a Google Drive share link pasted by the user.
 * Accepts typical patterns and returns canonical preview URL.
 */
export function normalizeDriveLink(raw: string): string | null {
  const url = raw.trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) return null
  if (!/drive\.google\.com|docs\.google\.com/i.test(url)) {
    // allow any https link, but flag non-drive
    return url
  }
  // normalize /file/d/<id>/view → /file/d/<id>/preview for embeddable preview
  const m = url.match(/\/file\/d\/([^/]+)/)
  if (m) return `https://drive.google.com/file/d/${m[1]}/view`
  return url
}
