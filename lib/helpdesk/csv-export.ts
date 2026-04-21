"use client"

import type { Feedback, Ticket } from "./firestore-service"

function csvCell(v: unknown): string {
  const s = String(v ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')
  if (/[",;\n]/.test(s)) return `"${s}"`
  return s
}

function downloadFile(name: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob(["\ufeff" + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

function stamp() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`
}

export function exportTicketsCSV(tickets: Ticket[], serviceName: (id: string) => string) {
  const header = [
    "Kode",
    "Tanggal",
    "Nama",
    "Peran",
    "Layanan",
    "Departemen",
    "Prioritas",
    "Status",
    "Balasan",
    "Detail",
  ]
  const rows = tickets.map((t) => [
    t.code,
    new Date(t.createdAt).toLocaleString("id-ID"),
    t.name,
    t.role,
    serviceName(t.service),
    t.department,
    t.priority,
    t.status,
    t.replyCount,
    t.details,
  ])
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")
  downloadFile(`rekap-tiket-${stamp()}.csv`, csv)
}

export function exportFeedbacksCSV(
  feedbacks: Feedback[],
  serviceName: (id: string) => string,
) {
  const header = ["Tanggal", "Layanan", "Rating", "Ulasan"]
  const rows = feedbacks.map((f) => [
    new Date(f.createdAt).toLocaleString("id-ID"),
    serviceName(f.service),
    f.rating,
    f.feedback,
  ])
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")
  downloadFile(`rekap-ikm-${stamp()}.csv`, csv)
}

/**
 * "Cetak PDF" = trigger browser print dialog. Admin dapat memilih Save as PDF.
 * Dokumen di-style minimal via print CSS di globals.
 */
export function printReport() {
  if (typeof window === "undefined") return
  window.print()
}
