import {
  BookOpen,
  Users,
  Settings,
  FileText,
  CalendarCheck,
  GraduationCap,
  Laptop,
  ImageIcon,
  Building2,
  type LucideIcon,
} from "lucide-react"

export type Service = {
  id: string
  name: string
  url: string
  icon: LucideIcon
  description: string
}

export const SERVICES: Service[] = [
  {
    id: "perpus",
    name: "E-Perpus",
    url: "perpus.sdn02cibadak.sch.id",
    icon: BookOpen,
    description: "Perpustakaan digital dengan ribuan buku dan e-book pelajaran resmi Kemdikbud.",
  },
  {
    id: "warga",
    name: "Warga Sekolah",
    url: "warga.sdn02cibadak.sch.id",
    icon: Users,
    description: "Direktori digital seluruh warga sekolah: siswa, guru, dan staf.",
  },
  {
    id: "ops",
    name: "Sistem OPS",
    url: "ops.sdn02cibadak.sch.id",
    icon: Settings,
    description: "Operasional internal sekolah: jadwal, surat, dan administrasi.",
  },
  {
    id: "spmb",
    name: "SPMB",
    url: "spmb.sdn02cibadak.sch.id",
    icon: FileText,
    description: "Sistem Penerimaan Murid Baru online dengan verifikasi cepat.",
  },
  {
    id: "presensi",
    name: "Presensi Kehadiran",
    url: "presensi.sdn02cibadak.sch.id",
    icon: CalendarCheck,
    description: "Absensi digital real-time dengan notifikasi ke wali murid.",
  },
  {
    id: "siswa",
    name: "Portal Siswa",
    url: "siswa.sdn02cibadak.sch.id",
    icon: GraduationCap,
    description: "Dashboard akademik pribadi: rapor, nilai, dan tugas.",
  },
  {
    id: "cbt",
    name: "Ujian CBT",
    url: "cbt.sdn02cibadak.sch.id",
    icon: Laptop,
    description: "Computer Based Test untuk ulangan harian hingga ujian akhir.",
  },
  {
    id: "media",
    name: "Galeri Media",
    url: "media.sdn02cibadak.sch.id",
    icon: ImageIcon,
    description: "Dokumentasi foto, video, dan berita kegiatan sekolah.",
  },
  {
    id: "sarpras",
    name: "Manajemen Sarpras",
    url: "sarpras.sdn02cibadak.sch.id",
    icon: Building2,
    description: "Inventaris dan pengelolaan sarana prasarana sekolah.",
  },
]

export const FAQ_DATA = [
  {
    question: "Bagaimana cara melapor jika lupa password Portal Siswa?",
    answer:
      'Anda dapat menggunakan menu "Lapor Kendala" (Tiket) di aplikasi ini. Pilih layanan "Portal Siswa" dan tuliskan NISN serta nama lengkap Anda. Tim admin akan mereset sandi Anda.',
  },
  {
    question: "Apakah aplikasi layanan sekolah bisa diakses 24 jam?",
    answer:
      "Ya, seluruh ekosistem digital SDN 02 Cibadak berjalan di server cloud dan aktif 24/7. Namun, respon tiket bantuan akan diproses pada jam kerja operasional.",
  },
  {
    question: "Siapa saja yang boleh mengisi Survei IKM?",
    answer:
      "Survei Indeks Kepuasan Masyarakat (IKM) dapat diisi oleh seluruh warga sekolah, termasuk siswa, guru, staf, hingga orang tua/wali murid demi peningkatan kualitas layanan.",
  },
  {
    question: "Apakah E-Perpus menyediakan buku pelajaran digital?",
    answer:
      "Benar. E-Perpus tidak hanya memiliki buku cerita, tapi juga menyediakan e-book pelajaran resmi dari Kemdikbud yang bisa dibaca langsung melalui perangkat Anda.",
  },
  {
    question: "Bagaimana cara wali murid memantau kehadiran anak?",
    answer:
      "Wali murid akan menerima notifikasi otomatis dari sistem Presensi Kehadiran setiap kali anak melakukan absen masuk dan pulang sekolah.",
  },
  {
    question: "Apakah hasil CBT bisa langsung dilihat setelah ujian selesai?",
    answer:
      "Untuk soal pilihan ganda, hasil langsung tersedia setelah submit. Untuk soal essay, guru akan memeriksa dan rilis nilai maksimal 3 hari kerja.",
  },
]

export const LETTER_TYPES = [
  { id: "izin", name: "Surat Izin Tidak Masuk", tone: "permohonan izin" },
  { id: "sakit", name: "Surat Keterangan Sakit", tone: "pemberitahuan sakit" },
  { id: "dispensasi", name: "Permohonan Dispensasi", tone: "permohonan dispensasi kegiatan" },
  { id: "terima-kasih", name: "Surat Terima Kasih", tone: "ucapan terima kasih formal" },
  { id: "usulan", name: "Usulan / Masukan", tone: "usulan konstruktif" },
]

/* ---------- Fallback data for Settings service ---------- */

export const CONTACTS_FALLBACK: { label: string; role: string; phone: string; whatsapp?: string }[] = [
  // Fallback data — konfigurasi nomor asli via Admin > Pengaturan > Kontak Darurat
]

export const FAQ_FALLBACK = [...FAQ_DATA]

export const SERVICES_FALLBACK = SERVICES.map(({ id, name, url, description }) => ({ id, name, url, description }))

export const LETTER_TYPES_FALLBACK = [...LETTER_TYPES]
