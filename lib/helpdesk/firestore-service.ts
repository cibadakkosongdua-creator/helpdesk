"use client"

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  Timestamp,
  limit as fsLimit,
} from "firebase/firestore"
import { getFirebase } from "./firebase"

/* ---------- Types ---------- */

export type TicketStatus = "Open" | "In Progress" | "Resolved"
export type TicketPriority = "Rendah" | "Sedang" | "Tinggi" | "Urgent"
export type Department =
  | "IT"
  | "Akademik"
  | "Kesiswaan"
  | "Sarpras"
  | "Tata Usaha"
  | "Kepala Sekolah"

export type Attachment = {
  name: string
  url: string
  size?: number
  mime?: string
}

export type Ticket = {
  id: string
  code: string // short public tracking code e.g. TKT-8F2A
  name: string
  role: string
  service: string
  details: string
  status: TicketStatus
  priority: TicketPriority
  department: Department
  attachments: Attachment[]
  reporterEmail?: string
  reporterUid?: string
  replyCount: number
  unreadForAdmin: number
  unreadForReporter: number
  lastActivity: number
  createdAt: number
  rating?: number
  ratingComment?: string
  ratedAt?: number
  // Typing indicator
  typingAdmin?: number // timestamp when admin started typing
  typingReporter?: number // timestamp when reporter started typing
}

export type Feedback = {
  id: string
  service: string
  rating: number
  feedback: string
  ticketId?: string      // Jika rating dari tiket
  ticketCode?: string    // Kode tiket untuk referensi
  reporterEmail?: string
  reporterUid?: string
  createdAt: number
}

export type Reply = {
  id: string
  ticketId: string
  author: "admin" | "reporter"
  authorName: string
  text: string
  createdAt: number
  readAt?: number // timestamp when read by the other party
}

export type AuditLog = {
  id: string
  actor: string
  action: string
  target: string
  meta?: string
  createdAt: number
}

const TICKETS_COL = "tickets"
const FEEDBACKS_COL = "feedbacks"
const REPLIES_COL = "ticket_replies"
const AUDIT_COL = "audit_logs"

const TICKETS_LS = "helpdesk_sdn02_tickets_v3"
const FEEDBACKS_LS = "helpdesk_sdn02_feedbacks_v2"
const REPLIES_LS = "helpdesk_sdn02_replies_v1"
const AUDIT_LS = "helpdesk_sdn02_audit_v1"

/* ---------- localStorage mirror ---------- */

function lsRead<T>(k: string): T[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(k) || "[]") as T[]
  } catch {
    return []
  }
}

function lsWrite<T>(k: string, arr: T[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(k, JSON.stringify(arr))
  } catch {
    /* quota may exceed for big attachments — ignore */
  }
}

/* ---------- helpers ---------- */

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis()
  if (typeof v === "number") return v
  if (v && typeof v === "object" && "seconds" in (v as any)) {
    const s = (v as any).seconds as number
    return s * 1000
  }
  return Date.now()
}

function sanitize<T extends object>(obj: T): T {
  const res = { ...obj }
  Object.keys(res).forEach((key) => {
    if ((res as any)[key] === undefined || (res as any)[key] === null) {
      delete (res as any)[key]
    }
  })
  return res
}

export function generateTicketCode(): string {
  // 4 hex chars from timestamp + random — easy to read, low collision at school scale
  const chars = "0123456789ABCDEF"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `TKT-${code}`
}

function normalizeTicket(id: string, data: any): Ticket {
  return {
    id,
    code: data.code ?? `TKT-${String(id).slice(0, 4).toUpperCase()}`,
    name: data.name ?? "",
    role: data.role ?? "",
    service: data.service ?? "",
    details: data.details ?? "",
    status: (data.status as TicketStatus) ?? "Open",
    priority: (data.priority as TicketPriority) ?? "Sedang",
    department: (data.department as Department) ?? "IT",
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    reporterEmail: data.reporterEmail ?? undefined,
    reporterUid: data.reporterUid ?? undefined,
    replyCount: Number(data.replyCount ?? 0),
    unreadForAdmin: Number(data.unreadForAdmin ?? 0),
    unreadForReporter: Number(data.unreadForReporter ?? 0),
    lastActivity: toMillis(data.lastActivity ?? data.createdAt),
    createdAt: toMillis(data.createdAt),
    rating: data.rating ?? undefined,
    ratingComment: data.ratingComment ?? undefined,
    ratedAt: data.ratedAt ? toMillis(data.ratedAt) : undefined,
    typingAdmin: data.typingAdmin ? toMillis(data.typingAdmin) : undefined,
    typingReporter: data.typingReporter ? toMillis(data.typingReporter) : undefined,
  }
}

/* ---------- Tickets ---------- */

export function subscribeTickets(cb: (tickets: Ticket[]) => void): () => void {
  const { db } = getFirebase()
  cb(lsRead<Ticket>(TICKETS_LS).sort((a, b) => b.createdAt - a.createdAt))

  if (!db) return () => {}
  const q = query(collection(db, TICKETS_COL), orderBy("createdAt", "desc"))
  try {
    return onSnapshot(
      q,
      (snap) => {
        const list: Ticket[] = snap.docs.map((d) => normalizeTicket(d.id, d.data()))
        lsWrite(TICKETS_LS, list)
        cb(list)
      },
      (err) => {
        console.warn("[helpdesk] tickets subscribe error:", err?.message)
        cb(lsRead<Ticket>(TICKETS_LS).sort((a, b) => b.createdAt - a.createdAt))
      },
    )
  } catch (err) {
    console.warn("[helpdesk] tickets subscribe threw:", (err as Error)?.message)
    return () => {}
  }
}

export function subscribeTicketByCode(
  code: string,
  cb: (ticket: Ticket | null) => void,
): () => void {
  const { db } = getFirebase()
  // local fallback first
  const local = lsRead<Ticket>(TICKETS_LS).find((t) => t.code === code) || null
  cb(local)

  if (!db) return () => {}
  const q = query(collection(db, TICKETS_COL), where("code", "==", code), fsLimit(1))
  try {
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          cb(local)
          return
        }
        const d = snap.docs[0]
        const t = normalizeTicket(d.id, d.data())
        // Update localStorage to keep it in sync with Firestore
        const list = lsRead<Ticket>(TICKETS_LS)
        const idx = list.findIndex((x) => x.id === t.id)
        if (idx >= 0) {
          list[idx] = t
        } else {
          list.unshift(t)
        }
        lsWrite(TICKETS_LS, list)
        // Always callback with latest data
        cb(t)
      },
      (err) => {
        console.warn("[helpdesk] subscribeTicketByCode error:", err?.message)
        cb(local)
      },
    )
  } catch (err) {
    console.warn("[helpdesk] subscribeTicketByCode threw:", (err as Error)?.message)
    return () => {}
  }
}

export async function saveTicket(
  t: Omit<
    Ticket,
    | "id"
    | "code"
    | "status"
    | "createdAt"
    | "replyCount"
    | "unreadForAdmin"
    | "unreadForReporter"
    | "lastActivity"
  >,
): Promise<Ticket> {
  const { db } = getFirebase()
  const nowMs = Date.now()
  const code = generateTicketCode()
  const basePayload = {
    ...t,
    code,
    status: "Open" as TicketStatus,
    replyCount: 0,
    unreadForAdmin: 0,
    unreadForReporter: 0,
    lastActivity: nowMs,
    reporterEmail: t.reporterEmail || undefined,
    reporterUid: t.reporterUid || undefined,
  }

  try {
    if (db) {
      const ref = await addDoc(collection(db, TICKETS_COL), sanitize({
        ...basePayload,
        createdAt: nowMs,
      }))
      const created: Ticket = { ...basePayload, id: ref.id, createdAt: nowMs }
      const list = lsRead<Ticket>(TICKETS_LS)
      list.unshift(created)
      lsWrite(TICKETS_LS, list)
      void logAudit({ actor: t.name || "Pelapor", action: "create_ticket", target: code })
      return created
    }
  } catch (err) {
    console.warn("[helpdesk] saveTicket firestore fail:", (err as Error)?.message)
  }
  const created: Ticket = {
    ...basePayload,
    id: `LOCAL-${nowMs.toString(36).toUpperCase()}`,
    createdAt: nowMs,
  }
  const list = lsRead<Ticket>(TICKETS_LS)
  list.unshift(created)
  lsWrite(TICKETS_LS, list)
  return created
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  actor = "admin",
) {
  const { db } = getFirebase()
  const list = lsRead<Ticket>(TICKETS_LS).map((t) =>
    t.id === id ? { ...t, status, lastActivity: Date.now() } : t,
  )
  lsWrite(TICKETS_LS, list)
  try {
    if (db && !id.startsWith("LOCAL-")) {
      await updateDoc(doc(db, TICKETS_COL, id), { status, lastActivity: Date.now() })
    }
  } catch (err) {
    console.warn("[helpdesk] updateTicketStatus fail:", (err as Error)?.message)
  }
  const target = list.find((x) => x.id === id)?.code ?? id
  void logAudit({ actor, action: `status:${status}`, target })
  return list
}

export async function updateTicketMeta(
  id: string,
  patch: Partial<Pick<Ticket, "priority" | "department">>,
  actor = "admin",
) {
  const { db } = getFirebase()
  const list = lsRead<Ticket>(TICKETS_LS).map((t) =>
    t.id === id ? { ...t, ...patch, lastActivity: Date.now() } : t,
  )
  lsWrite(TICKETS_LS, list)
  try {
    if (db && !id.startsWith("LOCAL-")) {
      await updateDoc(doc(db, TICKETS_COL, id), { ...patch, lastActivity: Date.now() })
    }
  } catch (err) {
    console.warn("[helpdesk] updateTicketMeta fail:", (err as Error)?.message)
  }
  const target = list.find((x) => x.id === id)?.code ?? id
  void logAudit({
    actor,
    action: `meta:${Object.keys(patch).join(",")}`,
    target,
    meta: JSON.stringify(patch),
  })
}

export async function deleteTicket(
  id: string,
  actor = "admin",
) {
  const { db } = getFirebase()
  const list = lsRead<Ticket>(TICKETS_LS)
  const target = list.find((x) => x.id === id)
  const code = target?.code ?? id
  lsWrite(TICKETS_LS, list.filter((t) => t.id !== id))
  try {
    if (db && !id.startsWith("LOCAL-")) {
      await deleteDoc(doc(db, TICKETS_COL, id))
    }
  } catch (err) {
    console.warn("[helpdesk] deleteTicket fail:", (err as Error)?.message)
  }
  void logAudit({ actor, action: "delete_ticket", target: code })
}

export async function markTicketRead(
  id: string,
  who: "admin" | "reporter",
) {
  const { db } = getFirebase()
  const patch =
    who === "admin" ? { unreadForAdmin: 0 } : { unreadForReporter: 0 }
  const list = lsRead<Ticket>(TICKETS_LS).map((t) =>
    t.id === id ? { ...t, ...patch } : t,
  )
  lsWrite(TICKETS_LS, list)
  try {
    if (db && !id.startsWith("LOCAL-")) {
      await updateDoc(doc(db, TICKETS_COL, id), patch)
    }
  } catch {
    /* ignore */
  }
}

/* ---------- Rate a resolved ticket ---------- */

export async function rateTicket(
  id: string,
  rating: number,
  comment?: string,
): Promise<void> {
  const { db } = getFirebase()
  const nowMs = Date.now()

  // Get ticket data to extract service info
  const ticket = lsRead<Ticket>(TICKETS_LS).find((t) => t.id === id)
  if (!ticket) {
    console.warn("[helpdesk] rateTicket: ticket not found")
    return
  }

  // Update rating in ticket document (for reference in ticket view)
  const patch = {
    rating,
    ratingComment: comment || "",
    ratedAt: nowMs,
  }
  const list = lsRead<Ticket>(TICKETS_LS).map((t) =>
    t.id === id ? { ...t, ...patch } : t,
  )
  lsWrite(TICKETS_LS, list)

  try {
    if (db && !id.startsWith("LOCAL-")) {
      // Update ticket with rating
      await updateDoc(doc(db, TICKETS_COL, id), patch)

      // Also create a feedback entry (unified with IKM survey)
      await addDoc(collection(db, FEEDBACKS_COL), sanitize({
        service: ticket.service,
        rating,
        feedback: comment || "",
        ticketId: id,
        ticketCode: ticket.code,
        reporterEmail: ticket.reporterEmail || undefined,
        reporterUid: ticket.reporterUid || undefined,
        createdAt: nowMs,
      }))
    }
  } catch (err) {
    console.warn("[helpdesk] rateTicket fail:", (err as Error)?.message)
  }

  // Update local feedbacks cache
  const feedbacksList = lsRead<Feedback>(FEEDBACKS_LS)
  const newFeedback: Feedback = {
    id: `FB-${nowMs.toString(36).toUpperCase()}`,
    service: ticket.service,
    rating,
    feedback: comment || "",
    ticketId: id,
    ticketCode: ticket.code,
    reporterEmail: ticket.reporterEmail,
    reporterUid: ticket.reporterUid,
    createdAt: nowMs,
  }
  feedbacksList.unshift(newFeedback)
  lsWrite(FEEDBACKS_LS, feedbacksList)

  const target = ticket.code ?? id
  void logAudit({ actor: "reporter", action: `rate:${rating}`, target })
}

/* ---------- Tickets by User ---------- */

export function subscribeTicketsByUser(
  uid: string,
  cb: (tickets: Ticket[]) => void,
): () => void {
  const { db } = getFirebase()
  // local fallback first
  const local = lsRead<Ticket>(TICKETS_LS)
    .filter((t) => t.reporterUid === uid)
    .sort((a, b) => b.createdAt - a.createdAt)
  cb(local)

  if (!db) return () => {}
  const q = query(
    collection(db, TICKETS_COL),
    where("reporterUid", "==", uid),
    orderBy("createdAt", "desc"),
  )
  try {
    return onSnapshot(
      q,
      (snap) => {
        const list: Ticket[] = snap.docs.map((d) => normalizeTicket(d.id, d.data()))
        cb(list)
      },
      () => cb(local),
    )
  } catch {
    return () => {}
  }
}

/* ---------- Replies ---------- */

export function subscribeReplies(
  ticketId: string,
  cb: (list: Reply[]) => void,
): () => void {
  const { db } = getFirebase()
  const local = lsRead<Reply>(REPLIES_LS)
    .filter((r) => r.ticketId === ticketId)
    .sort((a, b) => a.createdAt - b.createdAt)
  cb(local)

  if (!db) return () => {}
  const q = query(
    collection(db, REPLIES_COL),
    where("ticketId", "==", ticketId),
    orderBy("createdAt", "asc"),
  )
  try {
    return onSnapshot(
      q,
      (snap) => {
        const list: Reply[] = snap.docs.map((d) => {
          const data = d.data() as any
          return {
            id: d.id,
            ticketId: data.ticketId,
            author: data.author,
            authorName: data.authorName ?? "",
            text: data.text ?? "",
            createdAt: toMillis(data.createdAt),
            readAt: data.readAt ? toMillis(data.readAt) : undefined,
          }
        })
        const all = lsRead<Reply>(REPLIES_LS).filter((r) => r.ticketId !== ticketId)
        lsWrite(REPLIES_LS, [...all, ...list])
        cb(list)
      },
      (err) => {
        console.warn("[helpdesk] subscribeReplies error:", err?.message)
        // Jika error index, log URL untuk buat index
        if (err?.message?.includes("index")) {
          console.error("Firestore index needed. Check Firebase Console > Firestore > Indexes")
        }
        cb(local)
      },
    )
  } catch (err) {
    console.warn("[helpdesk] subscribeReplies threw:", (err as Error)?.message)
    return () => {}
  }
}

export async function addReply(
  reply: Omit<Reply, "id" | "createdAt">,
): Promise<Reply> {
  const { db } = getFirebase()
  const nowMs = Date.now()
  let id = `R-${nowMs.toString(36).toUpperCase()}`

  try {
    if (db) {
      const ref = await addDoc(collection(db, REPLIES_COL), sanitize({
        ...reply,
        createdAt: nowMs,
      }))
      id = ref.id
    }
  } catch (err) {
    console.warn("[helpdesk] addReply fail:", (err as Error)?.message)
  }

  const created: Reply = { ...reply, id, createdAt: nowMs }
  const existing = lsRead<Reply>(REPLIES_LS)
  existing.push(created)
  lsWrite(REPLIES_LS, existing)

  // bump ticket counters
  try {
    const list = lsRead<Ticket>(TICKETS_LS).map((t) => {
      if (t.id !== reply.ticketId) return t
      const bumpAdmin = reply.author === "reporter" ? 1 : 0
      const bumpReporter = reply.author === "admin" ? 1 : 0
      return {
        ...t,
        replyCount: (t.replyCount || 0) + 1,
        unreadForAdmin: (t.unreadForAdmin || 0) + bumpAdmin,
        unreadForReporter: (t.unreadForReporter || 0) + bumpReporter,
        lastActivity: nowMs,
      }
    })
    lsWrite(TICKETS_LS, list)
    const target = list.find((x) => x.id === reply.ticketId)
    if (db && target && !target.id.startsWith("LOCAL-")) {
      await updateDoc(doc(db, TICKETS_COL, reply.ticketId), {
        replyCount: target.replyCount,
        unreadForAdmin: target.unreadForAdmin,
        unreadForReporter: target.unreadForReporter,
        lastActivity: nowMs,
      })
    }
    void logAudit({
      actor: reply.authorName || reply.author,
      action: `reply:${reply.author}`,
      target: target?.code ?? reply.ticketId,
    })
  } catch {
    /* ignore */
  }

  return created
}

/* ---------- Mark Replies as Read ---------- */

export async function markRepliesRead(
  ticketId: string,
  reader: "admin" | "reporter",
): Promise<void> {
  const { db } = getFirebase()
  const nowMs = Date.now()

  // Get replies from the OTHER party that haven't been read
  const author = reader === "admin" ? "reporter" : "admin"
  const localReplies = lsRead<Reply>(REPLIES_LS)
  const toMark = localReplies.filter(
    (r) => r.ticketId === ticketId && r.author === author && !r.readAt,
  )

  if (toMark.length === 0) return

  // Update local
  const updated = localReplies.map((r) =>
    toMark.some((m) => m.id === r.id) ? { ...r, readAt: nowMs } : r,
  )
  lsWrite(REPLIES_LS, updated)

  // Update Firestore
  if (db) {
    try {
      const batch = writeBatch(db)
      for (const r of toMark) {
        batch.update(doc(db, REPLIES_COL, r.id), { readAt: nowMs })
      }
      await batch.commit()
    } catch (err) {
      console.warn("[helpdesk] markRepliesRead fail:", (err as Error)?.message)
    }
  }
}

/* ---------- Typing Indicator ---------- */

export async function setTyping(
  ticketId: string,
  who: "admin" | "reporter",
  isTyping: boolean,
): Promise<void> {
  const { db } = getFirebase()
  const field = who === "admin" ? "typingAdmin" : "typingReporter"
  const value = isTyping ? Date.now() : null

  // Update local
  const list = lsRead<Ticket>(TICKETS_LS)
  const idx = list.findIndex((t) => t.id === ticketId)
  if (idx >= 0) {
    if (isTyping) {
      list[idx] = { ...list[idx], [field]: value as number }
    } else {
      const { [field]: _, ...rest } = list[idx] as any
      list[idx] = rest as Ticket
    }
    lsWrite(TICKETS_LS, list)
  }

  // Update Firestore
  if (db) {
    try {
      await updateDoc(doc(db, TICKETS_COL, ticketId), {
        [field]: value,
      })
    } catch (err) {
      console.warn("[helpdesk] setTyping fail:", (err as Error)?.message)
    }
  }
}

/* ---------- Feedback (Survey) ---------- */

export function subscribeFeedbacks(cb: (list: Feedback[]) => void): () => void {
  const { db } = getFirebase()
  cb(lsRead<Feedback>(FEEDBACKS_LS).sort((a, b) => b.createdAt - a.createdAt))

  if (!db) return () => {}
  const q = query(collection(db, FEEDBACKS_COL), orderBy("createdAt", "desc"))
  try {
    return onSnapshot(
      q,
      (snap) => {
        const list: Feedback[] = snap.docs.map((d) => {
          const data = d.data() as any
          return {
            id: d.id,
            service: data.service ?? "",
            rating: Number(data.rating ?? 0),
            feedback: data.feedback ?? "",
            ticketId: data.ticketId ?? undefined,
            ticketCode: data.ticketCode ?? undefined,
            reporterEmail: data.reporterEmail ?? undefined,
            reporterUid: data.reporterUid ?? undefined,
            createdAt: toMillis(data.createdAt),
          }
        })
        lsWrite(FEEDBACKS_LS, list)
        cb(list)
      },
      (err) => {
        console.warn("[helpdesk] feedbacks subscribe error:", err?.message)
        cb(lsRead<Feedback>(FEEDBACKS_LS).sort((a, b) => b.createdAt - a.createdAt))
      },
    )
  } catch (err) {
    console.warn("[helpdesk] feedbacks subscribe threw:", (err as Error)?.message)
    return () => {}
  }
}

export async function saveFeedback(
  f: Omit<Feedback, "id" | "createdAt">,
): Promise<Feedback> {
  const { db } = getFirebase()
  const nowMs = Date.now()
  try {
    if (db) {
      const ref = await addDoc(collection(db, FEEDBACKS_COL), sanitize({
        ...f,
        createdAt: nowMs,
      }))
      const created: Feedback = { ...f, id: ref.id, createdAt: nowMs }
      const list = lsRead<Feedback>(FEEDBACKS_LS)
      list.unshift(created)
      lsWrite(FEEDBACKS_LS, list)
      return created
    }
  } catch (err) {
      console.warn("[helpdesk] saveFeedback firestore fail:", (err as Error)?.message, f)
    }
  const created: Feedback = {
    ...f,
    id: `FB-${nowMs.toString(36).toUpperCase()}`,
    createdAt: nowMs,
  }
  const list = lsRead<Feedback>(FEEDBACKS_LS)
  list.unshift(created)
  lsWrite(FEEDBACKS_LS, list)
  return created
}

/* ---------- Audit log ---------- */

export async function logAudit(
  entry: Omit<AuditLog, "id" | "createdAt">,
): Promise<void> {
  const { db } = getFirebase()
  const nowMs = Date.now()
  const full: AuditLog = { ...entry, id: `A-${nowMs}`, createdAt: nowMs }
  const list = lsRead<AuditLog>(AUDIT_LS)
  list.unshift(full)
  lsWrite(AUDIT_LS, list.slice(0, 500))
  try {
    if (db) {
      await addDoc(collection(db, AUDIT_COL), sanitize({
        ...entry,
        createdAt: nowMs,
      }))
    }
  } catch {
    /* ignore */
  }
}

export function subscribeAuditLogs(cb: (list: AuditLog[]) => void): () => void {
  const { db } = getFirebase()
  cb(lsRead<AuditLog>(AUDIT_LS))
  if (!db) return () => {}
  const q = query(collection(db, AUDIT_COL), orderBy("createdAt", "desc"), fsLimit(100))
  try {
    return onSnapshot(
      q,
      (snap) => {
        const list: AuditLog[] = snap.docs.map((d) => {
          const data = d.data() as any
          return {
            id: d.id,
            actor: data.actor ?? "",
            action: data.action ?? "",
            target: data.target ?? "",
            meta: data.meta,
            createdAt: toMillis(data.createdAt),
          }
        })
        cb(list)
      },
      () => {
        /* keep local */
      },
    )
  } catch {
    return () => {}
  }
}

/* ---------- One-off search (e.g. duplicate check) ---------- */

export async function findRecentTicketsByService(
  service: string,
  sinceMs: number,
): Promise<Ticket[]> {
  const local = lsRead<Ticket>(TICKETS_LS).filter(
    (t) => t.service === service && t.createdAt >= sinceMs,
  )
  const { db } = getFirebase()
  if (!db) return local
  try {
    const q = query(
      collection(db, TICKETS_COL),
      where("service", "==", service),
      orderBy("createdAt", "desc"),
      fsLimit(50),
    )
    const snap = await getDocs(q)
    const list = snap.docs
      .map((d) => normalizeTicket(d.id, d.data()))
      .filter((t) => t.createdAt >= sinceMs)
    return list
  } catch {
    return local
  }
}

/* ---------- Chat History ---------- */

export type ChatMessage = {
  role: "user" | "ai"
  text: string
  timestamp: number
}

export type ChatSession = {
  id: string
  uid: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

const CHAT_SESSIONS_COL = "chat_sessions"
const CHAT_SESSIONS_LS = "helpdesk_chat_sessions"

export function subscribeChatSessions(
  uid: string,
  onUpdate: (sessions: ChatSession[]) => void,
): () => void {
  const { db } = getFirebase()
  const local = lsRead<ChatSession>(CHAT_SESSIONS_LS).filter(s => s.uid === uid)
  onUpdate(local)

  if (!db) return () => {}

  const q = query(
    collection(db, CHAT_SESSIONS_COL),
    where("uid", "==", uid),
    orderBy("updatedAt", "desc"),
    fsLimit(20),
  )

  const unsub = onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as ChatSession[]
    lsWrite(CHAT_SESSIONS_LS, list)
    onUpdate(list)
  }, () => {
    onUpdate(local)
  })

  return unsub
}

export async function saveChatSession(
  uid: string,
  messages: ChatMessage[],
): Promise<string> {
  const { db } = getFirebase()
  const nowMs = Date.now()

  const session: Omit<ChatSession, "id"> = {
    uid,
    messages,
    createdAt: nowMs,
    updatedAt: nowMs,
  }

  // Save to localStorage
  const local = lsRead<ChatSession>(CHAT_SESSIONS_LS)
  const newSession: ChatSession = { id: `LOCAL-${nowMs.toString(36)}`, ...session }
  local.unshift(newSession)
  lsWrite(CHAT_SESSIONS_LS, local.slice(0, 20))

  if (!db) return newSession.id

  try {
    const ref = await addDoc(collection(db, CHAT_SESSIONS_COL), sanitize(session))
    return ref.id
  } catch {
    return newSession.id
  }
}

export async function updateChatSession(
  id: string,
  messages: ChatMessage[],
): Promise<void> {
  const { db } = getFirebase()
  const nowMs = Date.now()

  // Update localStorage
  const local = lsRead<ChatSession>(CHAT_SESSIONS_LS)
  const idx = local.findIndex(s => s.id === id)
  if (idx >= 0) {
    local[idx] = { ...local[idx], messages, updatedAt: nowMs }
    lsWrite(CHAT_SESSIONS_LS, local)
  }

  if (!db || id.startsWith("LOCAL-")) return

  try {
    await updateDoc(doc(db, CHAT_SESSIONS_COL, id), {
      messages,
      updatedAt: nowMs,
    })
  } catch {
    // ignore
  }
}
