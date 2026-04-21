"use client"

import {
  analyzeTicket as mockAnalyze,
  chatReply as mockChat,
  draftLetter as mockLetter,
  findServiceByQuery as mockSearch,
  polishText as mockPolish,
} from "./ai-mock"

type Json = Record<string, unknown>

async function callApi<T = any>(task: string, payload: Json): Promise<T> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, payload }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`Gemini API error ${res.status}: ${txt.slice(0, 120)}`)
  }
  return (await res.json()) as T
}

/* ---------- Public helpers with graceful fallback ---------- */

export async function aiDraftLetter(params: {
  type: string
  context: string
  name?: string
  kelas?: string
}): Promise<string> {
  try {
    const data = await callApi<{ text: string }>("letter", params)
    return data.text
  } catch (err) {
    console.warn("[helpdesk] Gemini letter failed, using local draft:", (err as Error)?.message)
    return mockLetter(params.type, params.context, params.name || "Nama Lengkap", params.kelas || "Kelas")
  }
}

export async function aiPolishText(raw: string): Promise<string> {
  try {
    const data = await callApi<{ text: string }>("polish", { raw })
    return data.text
  } catch (err) {
    console.warn("[helpdesk] Gemini polish failed, using local polish:", (err as Error)?.message)
    return mockPolish(raw)
  }
}

export async function aiAnalyzeTicket(
  details: string,
): Promise<{ serviceId: string | null; tip: string }> {
  try {
    const data = await callApi<{ serviceId: string | null; tip: string }>("analyze", { details })
    return { serviceId: data.serviceId ?? null, tip: data.tip ?? "" }
  } catch (err) {
    console.warn("[helpdesk] Gemini analyze failed, using heuristic:", (err as Error)?.message)
    return mockAnalyze(details)
  }
}

export async function aiSearchService(
  query: string,
): Promise<{ serviceId: string | null; explanation: string }> {
  try {
    const data = await callApi<{ serviceId: string | null; explanation: string }>("search", { query })
    return { serviceId: data.serviceId ?? null, explanation: data.explanation ?? "" }
  } catch (err) {
    console.warn("[helpdesk] Gemini search failed, using heuristic:", (err as Error)?.message)
    return mockSearch(query)
  }
}

export async function aiChatReply(
  message: string,
  history: { role: "user" | "ai"; text: string }[],
  context?: {
    schoolName?: string
    schoolHours?: string
    services?: { name: string; description: string }[]
    faq?: { question: string; answer: string }[]
    emergencyContacts?: { label: string; phone: string }[]
  },
): Promise<string> {
  try {
    const data = await callApi<{ text: string }>("chat", { message, history, context })
    return data.text
  } catch (err) {
    console.warn("[helpdesk] Gemini chat failed, using heuristic:", (err as Error)?.message)
    return mockChat(message)
  }
}

export async function aiDailySummary(params: {
  tickets: { service: string; priority: string; status: string; details: string; createdAt: number }[]
  feedbacks: { service: string; rating: number; feedback: string; createdAt: number }[]
}): Promise<string> {
  try {
    const data = await callApi<{ text: string }>("summary", params)
    return data.text
  } catch (err) {
    console.warn("[helpdesk] Gemini summary failed:", (err as Error)?.message)
    const t = params.tickets.length
    const urgent = params.tickets.filter((x) => x.priority === "Urgent").length
    const avg = params.feedbacks.length
      ? (params.feedbacks.reduce((a, b) => a + b.rating, 0) / params.feedbacks.length).toFixed(1)
      : "-"
    return `Ringkasan cepat hari ini.\n• ${t} tiket tercatat, ${urgent} urgent.\n• Rata-rata rating IKM: ${avg}/5.\n• Segera tindak lanjuti tiket urgent dan Open terlama.`
  }
}

export async function aiSuggestReply(params: {
  ticket: { name: string; service: string; details: string; status: string }
  history?: { author: string; text: string }[]
}): Promise<string> {
  try {
    const data = await callApi<{ text: string }>("reply-suggest", params)
    return data.text
  } catch (err) {
    console.warn("[helpdesk] Gemini reply-suggest failed:", (err as Error)?.message)
    return `Terima kasih ${params.ticket.name} atas laporannya. Tim kami sedang menindaklanjuti kendala pada ${params.ticket.service}. Kami akan memberi kabar lagi segera setelah ada perkembangan.`
  }
}

export async function aiDuplicateCheck(params: {
  candidate: { service: string; details: string }
  existing: { code: string; service: string; details: string; createdAt: number }[]
}): Promise<{ duplicateCodes: string[]; reason: string }> {
  try {
    const data = await callApi<{ duplicateCodes: string[]; reason: string }>(
      "duplicate-check",
      params,
    )
    return {
      duplicateCodes: Array.isArray(data.duplicateCodes) ? data.duplicateCodes : [],
      reason: data.reason ?? "",
    }
  } catch (err) {
    console.warn("[helpdesk] Gemini duplicate-check failed:", (err as Error)?.message)
    // Heuristic: service match & word overlap
    const words = params.candidate.details.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    const dups = params.existing
      .filter((e) => e.service === params.candidate.service)
      .filter((e) => {
        const txt = e.details.toLowerCase()
        const hits = words.filter((w) => txt.includes(w)).length
        return hits >= Math.min(3, Math.ceil(words.length * 0.4))
      })
      .slice(0, 3)
      .map((e) => e.code)
    return {
      duplicateCodes: dups,
      reason: dups.length
        ? "Ada tiket dengan kata kunci yang mirip pada layanan yang sama."
        : "tidak ada",
    }
  }
}
