import { SERVICES } from "./data"

const KEYWORDS: Record<string, string[]> = {
  perpus: ["buku", "baca", "perpustakaan", "pinjam", "e-book", "ebook", "novel", "bacaan", "literasi"],
  warga: ["warga", "direktori", "daftar guru", "daftar siswa", "profil sekolah"],
  ops: ["ops", "operasional", "surat", "administrasi", "jadwal", "dinas"],
  spmb: ["daftar", "pendaftaran", "murid baru", "siswa baru", "spmb", "penerimaan", "masuk sekolah"],
  presensi: ["absen", "absensi", "kehadiran", "presensi", "tidak masuk", "izin"],
  siswa: ["portal siswa", "rapor", "nilai", "tugas", "pr", "password", "login siswa", "nisn"],
  cbt: ["ujian", "cbt", "tes", "ulangan", "soal", "pas", "uts", "uas"],
  media: ["foto", "video", "galeri", "dokumentasi", "berita", "kegiatan"],
  sarpras: ["sarpras", "inventaris", "ruangan", "fasilitas", "sarana", "prasarana", "alat"],
}

export function findServiceByQuery(query: string): { serviceId: string | null; explanation: string } {
  const q = query.toLowerCase()
  let bestId: string | null = null
  let bestScore = 0
  for (const [id, kws] of Object.entries(KEYWORDS)) {
    const score = kws.reduce((acc, k) => acc + (q.includes(k) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestId = id
    }
  }
  if (!bestId) {
    return {
      serviceId: null,
      explanation:
        "Saya belum menemukan layanan yang cocok untuk kebutuhan itu. Silakan buat tiket kendala agar tim kami membantu langsung.",
    }
  }
  const svc = SERVICES.find((s) => s.id === bestId)!
  return {
    serviceId: bestId,
    explanation: `Berdasarkan kebutuhan Anda, layanan ${svc.name} adalah pilihan paling tepat. ${svc.description}`,
  }
}

export function analyzeTicket(details: string): { tip: string; serviceId: string | null } {
  const { serviceId } = findServiceByQuery(details)
  const lower = details.toLowerCase()

  let tip = "Coba lakukan logout, bersihkan cache browser, lalu login kembali. Jika masih kendala, tim kami siap membantu via tiket ini."
  if (lower.includes("password") || lower.includes("sandi") || lower.includes("lupa")) {
    tip = "Pastikan kapital dan angka sudah benar. Jika tetap gagal, kirim tiket ini dan admin akan mereset sandi Anda dalam 1x24 jam."
  } else if (lower.includes("lambat") || lower.includes("loading") || lower.includes("lemot")) {
    tip = "Cek koneksi internet dan tutup tab lain yang berat. Akses sistem di jam off-peak (pagi/malam) biasanya lebih cepat."
  } else if (lower.includes("error") || lower.includes("gagal") || lower.includes("tidak bisa")) {
    tip = "Catat pesan error dan jam kejadian, lalu lampirkan screenshot pada tiket. Tim IT akan menindaklanjuti secepatnya."
  } else if (lower.includes("absen") || lower.includes("presensi")) {
    tip = "Pastikan GPS dan jaringan aktif saat absen. Jika masalah berulang, laporkan NIS dan kelas pada tiket ini."
  }

  return { tip, serviceId }
}

export function polishText(raw: string): string {
  // lightweight "polish": capitalize, normalize spacing, add polite wrapper
  const trimmed = raw.trim().replace(/\s+/g, " ")
  const firstCap = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  const withDot = /[.!?]$/.test(firstCap) ? firstCap : firstCap + "."
  return `Dengan hormat, ${withDot} Kami berharap saran ini dapat menjadi pertimbangan untuk peningkatan kualitas layanan SDN 02 Cibadak ke depannya. Terima kasih.`
}

export function draftLetter(type: string, context: string, name = "Nama Lengkap", kelas = "Kelas"): string {
  const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  const titles: Record<string, string> = {
    izin: "Surat Izin Tidak Masuk Sekolah",
    sakit: "Surat Keterangan Sakit",
    dispensasi: "Permohonan Dispensasi",
    "terima-kasih": "Surat Terima Kasih",
    usulan: "Usulan / Masukan",
  }
  const title = titles[type] ?? "Surat Resmi"
  const body =
    type === "izin"
      ? `Dengan hormat,\n\nMelalui surat ini, saya selaku wali/siswa memberitahukan bahwa saya tidak dapat mengikuti kegiatan belajar mengajar dengan alasan: ${context}. Oleh karena itu, mohon Bapak/Ibu Guru berkenan memberikan izin.`
      : type === "sakit"
        ? `Dengan hormat,\n\nSaya menyampaikan bahwa siswa yang bersangkutan sedang dalam kondisi sakit (${context}) sehingga tidak dapat mengikuti pembelajaran. Mohon kebijaksanaan Bapak/Ibu Guru untuk memberikan izin.`
        : type === "dispensasi"
          ? `Dengan hormat,\n\nSaya mengajukan permohonan dispensasi dengan alasan: ${context}. Besar harapan saya agar permohonan ini dapat dipertimbangkan.`
          : type === "terima-kasih"
            ? `Dengan hormat,\n\nIzinkan saya menyampaikan apresiasi dan terima kasih sebesar-besarnya atas: ${context}. Dedikasi Bapak/Ibu sangat berarti bagi kami.`
            : `Dengan hormat,\n\nMelalui surat ini, saya ingin menyampaikan usulan/masukan sebagai berikut: ${context}. Semoga masukan ini bermanfaat untuk kemajuan SDN 02 Cibadak.`
  return `${title}

Cibadak, ${today}

Kepada Yth.
Bapak/Ibu Guru Wali Kelas
di tempat

${body}

Demikian surat ini saya sampaikan. Atas perhatian dan kebijaksanaan Bapak/Ibu, saya ucapkan terima kasih.

Hormat saya,


${name}
${kelas}`
}

const CHAT_RESPONSES: Array<{ test: RegExp; reply: string }> = [
  {
    test: /(halo|hai|hi|selamat)/i,
    reply: "Halo! Senang berjumpa dengan Anda. Ada layanan SDN 02 Cibadak apa yang bisa saya bantu hari ini?",
  },
  {
    test: /(password|sandi|lupa|login)/i,
    reply:
      "Untuk masalah password atau login, silakan buat tiket di menu Lapor Kendala. Tim admin akan mereset sandi Anda dalam 1x24 jam.",
  },
  {
    test: /(buku|perpus|pinjam|baca)/i,
    reply:
      "Untuk peminjaman buku, buka layanan E-Perpus di perpus.sdn02cibadak.sch.id. Ribuan buku digital siap dibaca gratis.",
  },
  {
    test: /(absen|presensi|kehadiran)/i,
    reply:
      "Sistem Presensi Kehadiran tersedia 24/7. Pastikan GPS aktif saat absen. Wali murid juga akan mendapat notifikasi otomatis.",
  },
  {
    test: /(ujian|cbt|soal|tes)/i,
    reply:
      "Ujian CBT diakses melalui cbt.sdn02cibadak.sch.id. Pastikan koneksi stabil dan gunakan browser Chrome/Firefox terbaru.",
  },
  {
    test: /(daftar|murid baru|spmb)/i,
    reply:
      "Pendaftaran murid baru (SPMB) dilakukan online di spmb.sdn02cibadak.sch.id. Siapkan scan akta lahir dan KK terlebih dahulu.",
  },
  {
    test: /(nilai|rapor|tugas)/i,
    reply:
      "Nilai, rapor, dan tugas dapat dilihat di Portal Siswa (siswa.sdn02cibadak.sch.id). Login dengan NISN dan password Anda.",
  },
  {
    test: /(terima kasih|makasih|thanks)/i,
    reply: "Sama-sama! Senang bisa membantu. Jangan ragu untuk bertanya lagi kapan saja.",
  },
]

export function chatReply(userMessage: string): string {
  for (const r of CHAT_RESPONSES) {
    if (r.test.test(userMessage)) return r.reply
  }
  return "Terima kasih atas pertanyaannya. Untuk kendala teknis, silakan buat laporan di menu Lapor Kendala agar tim kami bisa menindaklanjuti dengan cepat."
}

export function simulateDelay(ms = 900) {
  return new Promise((r) => setTimeout(r, ms))
}
