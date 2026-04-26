import { NextResponse } from "next/server"

// Gemini API key from environment variables only
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  ""

const MODEL = "gemini-2.5-flash"
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

type Task =
  | "letter"
  | "polish"
  | "analyze"
  | "search"
  | "chat"
  | "raw"
  | "summary"
  | "reply-suggest"
  | "duplicate-check"

type Body = {
  task: Task
  payload: Record<string, unknown>
}

const SERVICES_CONTEXT = `
Daftar 9 layanan digital SDN 02 Cibadak (gunakan id ini saat menjawab):
- perpus: E-Perpus (perpus.sdn02cibadak.sch.id) — perpustakaan digital
- warga: Warga Sekolah (warga.sdn02cibadak.sch.id) — direktori warga sekolah
- ops: Sistem OPS (ops.sdn02cibadak.sch.id) — web pribadi khusus operator sekolah untuk memantau data dan sistem
- spmb: SPMB (spmb.sdn02cibadak.sch.id) — penerimaan murid baru
- presensi: Presensi Kehadiran (presensi.sdn02cibadak.sch.id) — absensi & notifikasi wali
- siswa: Portal Siswa (siswa.sdn02cibadak.sch.id) — rapor, nilai, tugas
- cbt: Ujian CBT (cbt.sdn02cibadak.sch.id) — computer based test
- media: Galeri Media (media.sdn02cibadak.sch.id) — foto & video kegiatan
- sarpras: Manajemen Sarpras (sarpras.sdn02cibadak.sch.id) — inventaris fasilitas
`

function buildPrompt(task: Task, payload: Record<string, unknown>): string {
  switch (task) {
    case "letter": {
      const { type, context, name, kelas } = payload as {
        type: string
        context: string
        name?: string
        kelas?: string
      }
      const titles: Record<string, string> = {
        izin: "Surat Izin Tidak Masuk Sekolah",
        sakit: "Surat Keterangan Sakit",
        dispensasi: "Permohonan Dispensasi",
        "terima-kasih": "Surat Terima Kasih",
        usulan: "Usulan / Masukan",
      }
      return `Anda adalah AI asisten resmi SDN 02 Cibadak yang membantu menyusun surat formal dalam Bahasa Indonesia yang baik dan benar.

Buatlah satu dokumen "${titles[type] ?? "Surat Resmi"}" yang ditujukan kepada Bapak/Ibu Guru Wali Kelas SDN 02 Cibadak.

Pengirim: ${name || "Nama Lengkap"} (${kelas || "Kelas"})
Konteks / alasan: ${context}

Aturan output:
- Keluarkan HANYA isi surat (tanpa markdown, tanpa tanda **, tanpa komentar tambahan).
- Format: judul surat, tempat & tanggal (Cibadak, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}), alamat tujuan, salam pembuka, isi 1-2 paragraf santun, penutup, tanda tangan nama & kelas.
- Gunakan bahasa formal Indonesia, hormat, dan ringkas.`
    }
    case "polish": {
      const { raw } = payload as { raw: string }
      return `Anda editor bahasa Indonesia formal. Perhalus kalimat berikut agar lebih santun, jelas, dan profesional untuk survei kepuasan sekolah SDN 02 Cibadak. Jangan menambah informasi baru. Keluarkan HANYA hasil tulisan yang sudah diperhalus, tanpa komentar.

Teks asli:
"""${raw}"""`
    }
    case "analyze": {
      const { details } = payload as { details: string }
      return `Anda AI Helpdesk SDN 02 Cibadak. Analisis keluhan berikut lalu:
1) Pilih satu serviceId paling relevan dari daftar.
2) Berikan saran solusi awal (2-3 kalimat, bahasa Indonesia, empatik dan praktis).

${SERVICES_CONTEXT}

Keluhan: "${details}"

Jawab HANYA dalam format JSON valid satu baris:
{"serviceId":"<id>","tip":"<saran>"}`
    }
    case "search": {
      const { query } = payload as { query: string }
      return `Anda AI pencarian layanan SDN 02 Cibadak. Pilih satu serviceId paling relevan untuk kebutuhan pengguna. Jika tidak ada yang cocok, kembalikan serviceId null.

${SERVICES_CONTEXT}

Kebutuhan pengguna: "${query}"

Jawab HANYA dalam format JSON valid satu baris:
{"serviceId":"<id atau null>","explanation":"<1-2 kalimat bahasa Indonesia>"}`
    }
    case "chat": {
      const { message, history } = payload as {
        message: string
        history?: { role: "user" | "ai"; text: string }[]
      }
      const h = (history ?? [])
        .slice(-6)
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
        .join("\n")
      return `Anda "Asisten AI Bantuan" ramah & ringkas untuk portal SDN 02 Cibadak. Jawab dalam Bahasa Indonesia, maksimal 3 kalimat, fokus pada layanan sekolah (lihat daftar di bawah). Jika di luar ruang lingkup, arahkan ke menu Lapor Kendala.

${SERVICES_CONTEXT}

Riwayat:
${h}

User: ${message}
AI:`
    }
    case "summary": {
      const { tickets, feedbacks } = payload as {
        tickets: { service: string; priority: string; status: string; details: string; createdAt: number }[]
        feedbacks: { service: string; rating: number; feedback: string; createdAt: number }[]
      }
      const ticketLines = (tickets ?? [])
        .slice(0, 40)
        .map(
          (t) =>
            `- ${new Date(t.createdAt).toLocaleString("id-ID")} [${t.priority}/${t.status}] ${t.service}: ${t.details.slice(0, 120)}`,
        )
        .join("\n")
      const feedbackLines = (feedbacks ?? [])
        .slice(0, 20)
        .map(
          (f) =>
            `- ${new Date(f.createdAt).toLocaleString("id-ID")} ${f.service} rating ${f.rating}: ${(f.feedback || "").slice(0, 120)}`,
        )
        .join("\n")
      return `Anda asisten kepala sekolah SDN 02 Cibadak. Tulis ringkasan singkat, profesional, bahasa Indonesia, 3-5 bullet, yang menggambarkan kondisi helpdesk hari ini berdasarkan data berikut. Soroti tren (mis. banyak laporan Wi-Fi di kelas tertentu), jumlah urgent, dan saran tindak lanjut konkret. Jangan menambah data yang tidak ada.

TIKET:
${ticketLines || "(tidak ada)"}

SURVEI IKM:
${feedbackLines || "(tidak ada)"}

Keluarkan HANYA teks ringkasan (tanpa markdown). Awali dengan satu kalimat judul, lalu bullet pakai tanda "•".`
    }
    case "reply-suggest": {
      const { ticket, history } = payload as {
        ticket: { name: string; service: string; details: string; status: string }
        history?: { author: string; text: string }[]
      }
      const hist = (history ?? [])
        .slice(-6)
        .map((h) => `${h.author === "admin" ? "Admin" : "Pelapor"}: ${h.text}`)
        .join("\n")
      return `Anda admin helpdesk SDN 02 Cibadak. Tulis draf balasan sopan, empatik, bahasa Indonesia formal, maksimal 3 kalimat, yang menjawab keluhan pelapor. Jangan janjikan hal di luar kewenangan. Jika butuh info lebih, minta dengan sopan.

Pelapor: ${ticket.name}
Layanan: ${ticket.service}
Status: ${ticket.status}
Keluhan awal: ${ticket.details}

Riwayat balasan:
${hist || "(belum ada)"}

Keluarkan HANYA teks balasan, tanpa markdown, tanpa tanda kutip.`
    }
    case "duplicate-check": {
      const { candidate, existing } = payload as {
        candidate: { service: string; details: string }
        existing: { code: string; service: string; details: string; createdAt: number }[]
      }
      const list = (existing ?? [])
        .slice(0, 20)
        .map(
          (e) =>
            `- ${e.code} [${new Date(e.createdAt).toLocaleDateString("id-ID")}] ${e.service}: ${e.details.slice(0, 160)}`,
        )
        .join("\n")
      return `Anda AI Helpdesk SDN 02 Cibadak. Cek apakah keluhan kandidat merupakan duplikat / serupa dengan salah satu tiket di daftar. Duplikat = keluhan inti yang sama (mis. "wifi kelas 5 mati" dan "internet kelas 5 lemot").

Kandidat (layanan: ${candidate.service}): "${candidate.details}"

Tiket 7 hari terakhir:
${list || "(tidak ada)"}

Jawab HANYA JSON satu baris:
{"duplicateCodes":["<code>",...],"reason":"<1 kalimat alasan>"}
Jika tidak ada duplikat, kembalikan array kosong dan alasan "tidak ada".`
    }
    case "raw":
    default: {
      const { prompt } = payload as { prompt: string }
      return prompt
    }
  }
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
    }),
    cache: "no-store",
  })
  if (!res.ok) {
    const errTxt = await res.text()
    throw new Error(`Gemini ${res.status}: ${errTxt.slice(0, 200)}`)
  }
  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error("Gemini empty response")
  return text.trim()
}

function extractJson(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    if (!body?.task) {
      return NextResponse.json({ error: "Missing task" }, { status: 400 })
    }
    const prompt = buildPrompt(body.task, body.payload ?? {})
    const text = await callGemini(prompt)

    if (body.task === "analyze" || body.task === "search" || body.task === "duplicate-check") {
      const json = extractJson(text)
      if (!json) {
        return NextResponse.json({ error: "Invalid JSON from model", raw: text }, { status: 502 })
      }
      return NextResponse.json(json)
    }
    return NextResponse.json({ text })
  } catch (err: any) {
    const msg = err?.message ?? ""
    const status = msg.startsWith("Gemini 429") ? 429 : 500
    return NextResponse.json(
      { error: msg || "Unknown error" },
      { status },
    )
  }
}
