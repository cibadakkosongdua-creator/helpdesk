"use client"

import {
  AlertTriangle,
  Bell,
  Calendar,
  ChevronDown,
  Globe,
  Mail,
  MessageSquare,
  Minus,
  Plus,
  Save,
  Server,
  Settings,
  Shield,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import {
  subscribeSettings,
  saveEmergencyContacts,
  saveServiceStatus,
  saveFaq,
  saveAdminEmails,
  saveServices,
  saveSocialLinks,
  saveAnnouncement,
  saveMaintenanceSchedules,
  saveReplyTemplates,
  type AppSettings,
  type EmergencyContact,
  type FaqItem,
  type ServiceConfig,
  type ServiceStatus,
  type SocialLink,
  type AnnouncementConfig,
  type MaintenanceSchedule,
  type ReplyTemplate,
  DEFAULT_SETTINGS,
} from "@/lib/helpdesk/settings-service"
import type { ShowToastFn } from "./types"
import { ConfirmDialog } from "./confirm-dialog"

type Section = "contacts" | "portal" | "faq" | "admin-emails" | "services" | "socials" | "announcement" | "maintenance" | "templates"

const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "contacts", label: "Kontak Darurat", icon: AlertTriangle },
  { id: "portal", label: "Status Portal", icon: Server },
  { id: "announcement", label: "Pengumuman", icon: Bell },
  { id: "maintenance", label: "Jadwal Maintenance", icon: Calendar },
  { id: "faq", label: "FAQ", icon: MessageSquare },
  { id: "templates", label: "Template Balasan", icon: MessageSquare },
  { id: "admin-emails", label: "Admin Email", icon: Shield },
  { id: "services", label: "Daftar Layanan", icon: Settings },
  { id: "socials", label: "Sosial Media", icon: Globe },
]

export function AdminSettings({ showToast }: { showToast: ShowToastFn }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [activeSection, setActiveSection] = useState<Section>("contacts")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = subscribeSettings(setSettings)
    return () => unsub()
  }, [])

  const handleSave = async (section: Section) => {
    setSaving(true)
    try {
      switch (section) {
        case "contacts": await saveEmergencyContacts(settings.emergencyContacts); break
        case "portal": await saveServiceStatus(settings.serviceStatus); break
        case "announcement": await saveAnnouncement(settings.announcement ?? { active: false, text: "", type: "info" }); break
        case "maintenance": await saveMaintenanceSchedules(settings.maintenanceSchedules ?? []); break
        case "faq": await saveFaq(settings.faq); break
        case "admin-emails": await saveAdminEmails(settings.adminEmails); break
        case "services": await saveServices(settings.services); break
        case "socials": await saveSocialLinks(settings.socialLinks); break
        case "templates": await saveReplyTemplates(settings.replyTemplates ?? []); break
      }
      showToast("Pengaturan berhasil disimpan.", "success")
    } catch {
      showToast("Gagal menyimpan pengaturan.", "error")
    } finally {
      setSaving(false)
    }
  }

  const update = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pengaturan Aplikasi</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola kontak, status portal, FAQ, dan konfigurasi lainnya.</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const active = activeSection === s.id
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                active
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Section content */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-6 overflow-hidden">
        {activeSection === "contacts" && (
          <ContactsSection contacts={settings.emergencyContacts} onChange={(c) => update({ emergencyContacts: c })} onSave={() => handleSave("contacts")} saving={saving} />
        )}
        {activeSection === "portal" && (
          <PortalSection services={settings.services} status={settings.serviceStatus} onChange={(s) => update({ serviceStatus: s })} onSave={() => handleSave("portal")} saving={saving} />
        )}
        {activeSection === "announcement" && (
          <AnnouncementSection announcement={settings.announcement ?? { active: false, text: "", type: "info" }} onChange={(a) => update({ announcement: a })} onSave={() => handleSave("announcement")} saving={saving} />
        )}
        {activeSection === "maintenance" && (
          <MaintenanceSection schedules={settings.maintenanceSchedules ?? []} services={settings.services} onChange={(m) => update({ maintenanceSchedules: m })} onSave={() => handleSave("maintenance")} saving={saving} />
        )}
        {activeSection === "faq" && (
          <FaqSection faq={settings.faq} onChange={(f) => update({ faq: f })} onSave={() => handleSave("faq")} saving={saving} />
        )}
        {activeSection === "admin-emails" && (
          <AdminEmailsSection emails={settings.adminEmails} onChange={(e) => update({ adminEmails: e })} onSave={() => handleSave("admin-emails")} saving={saving} />
        )}
        {activeSection === "services" && (
          <ServicesSection services={settings.services} onChange={(s) => update({ services: s })} onSave={() => handleSave("services")} saving={saving} />
        )}
        {activeSection === "socials" && (
          <SocialLinksSection links={settings.socialLinks} onChange={(l) => update({ socialLinks: l })} onSave={() => handleSave("socials")} saving={saving} />
        )}
        {activeSection === "templates" && (
          <TemplatesSection templates={settings.replyTemplates ?? []} onChange={(t) => update({ replyTemplates: t })} onSave={() => handleSave("templates")} saving={saving} />
        )}
      </div>
    </div>
  )
}

/* ---------- Shared Action Bar ---------- */

function ActionBar({
  onAdd,
  addLabel,
  onSave,
  saving,
}: {
  onAdd?: () => void
  addLabel?: string
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      )}
      <div className="sm:flex-1" />
      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? "Menyimpan..." : "Simpan Perubahan"}
      </button>
    </div>
  )
}

/* ---------- Contacts Section ---------- */

function ContactsSection({
  contacts,
  onChange,
  onSave,
  saving,
}: {
  contacts: EmergencyContact[]
  onChange: (c: EmergencyContact[]) => void
  onSave: () => void
  saving: boolean
}) {
  const add = () => onChange([...contacts, { label: "", role: "", phone: "", whatsapp: "" }])
  const remove = (i: number) => onChange(contacts.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof EmergencyContact, value: string) => {
    const next = [...contacts]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Kontak Darurat</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Nomor yang ditampilkan di halaman utama saat kondisi darurat.</p>

      <div className="space-y-3">
        {contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-white/5">
            <input placeholder="Nama / Label" value={c.label} onChange={(e) => updateItem(i, "label", e.target.value)} className="input-field" />
            <input placeholder="Role / Jabatan" value={c.role} onChange={(e) => updateItem(i, "role", e.target.value)} className="input-field" />
            <input placeholder="No. Telepon" value={c.phone} onChange={(e) => updateItem(i, "phone", e.target.value)} className="input-field" />
            <input placeholder="WhatsApp (opsional)" value={c.whatsapp ?? ""} onChange={(e) => updateItem(i, "whatsapp", e.target.value)} className="input-field" />
            <ConfirmDialog
              title="Hapus Kontak?"
              description={`Kontak "${c.label || 'ini'}" akan dihapus dari daftar. Tindakan ini tidak dapat dibatalkan.`}
              onConfirm={() => remove(i)}
            />
          </div>
        ))}
      </div>

      <ActionBar onAdd={add} addLabel="Tambah Kontak" onSave={onSave} saving={saving} />
    </div>
  )
}

/* ---------- Portal Status Section ---------- */

function PortalSection({
  services,
  status,
  onChange,
  onSave,
  saving,
}: {
  services: ServiceConfig[]
  status: Record<string, ServiceStatus>
  onChange: (s: Record<string, ServiceStatus>) => void
  onSave: () => void
  saving: boolean
}) {
  const toggle = (id: string, value: ServiceStatus) => {
    onChange({ ...status, [id]: value })
  }

  const statusOptions: { value: ServiceStatus; label: string; color: string }[] = [
    { value: "online", label: "Online", color: "bg-emerald-500" },
    { value: "offline", label: "Offline", color: "bg-slate-400" },
    { value: "maintenance", label: "Maintenance", color: "bg-amber-500" },
  ]

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Status Portal Layanan</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Atur status tampilan setiap layanan di halaman utama.</p>

      <div className="space-y-2">
        {services.map((s) => {
          const current = status[s.id] ?? "online"
          return (
            <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-white/5">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.url}</p>
              </div>
              <div className="flex gap-1.5">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggle(s.id, opt.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      current === opt.value
                        ? `${opt.color} text-white shadow-sm`
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${current === opt.value ? "bg-white/80" : opt.color}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <ActionBar onSave={onSave} saving={saving} />
    </div>
  )
}

/* ---------- FAQ Section ---------- */

function FaqSection({
  faq,
  onChange,
  onSave,
  saving,
}: {
  faq: FaqItem[]
  onChange: (f: FaqItem[]) => void
  onSave: () => void
  saving: boolean
}) {
  const add = () => onChange([...faq, { question: "", answer: "" }])
  const remove = (i: number) => onChange(faq.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof FaqItem, value: string) => {
    const next = [...faq]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">FAQ (Pertanyaan Umum)</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Kelola pertanyaan yang ditampilkan di halaman utama.</p>

      <div className="space-y-4">
        {faq.map((f, i) => (
          <div key={i} className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">{i + 1}</span>
              <ConfirmDialog
                title="Hapus FAQ?"
                description="Pertanyaan ini akan dihapus dari daftar FAQ. Tindakan ini tidak dapat dibatalkan."
                onConfirm={() => remove(i)}
              />
            </div>
            <div className="space-y-3 min-w-0">
              <div className="min-w-0">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Pertanyaan</label>
                <input placeholder="Tulis pertanyaan..." value={f.question} onChange={(e) => updateItem(i, "question", e.target.value)} className="input-field" />
              </div>
              <div className="min-w-0">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Jawaban</label>
                <textarea placeholder="Tulis jawaban..." value={f.answer} onChange={(e) => updateItem(i, "answer", e.target.value)} rows={3} className="input-field resize-none" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <ActionBar onAdd={add} addLabel="Tambah FAQ" onSave={onSave} saving={saving} />
    </div>
  )
}

/* ---------- Admin Emails Section ---------- */

function AdminEmailsSection({
  emails,
  onChange,
  onSave,
  saving,
}: {
  emails: string[]
  onChange: (e: string[]) => void
  onSave: () => void
  saving: boolean
}) {
  const [newEmail, setNewEmail] = useState("")

  const add = () => {
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed || emails.includes(trimmed)) return
    onChange([...emails, trimmed])
    setNewEmail("")
  }

  const remove = (i: number) => onChange(emails.filter((_, idx) => idx !== i))

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Email Admin (Whitelist)</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Akun Google dengan email berikut otomatis mendapat akses admin.</p>

      <div className="flex gap-2 mb-4">
        <input
          placeholder="email@contoh.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="input-field flex-1"
          type="email"
        />
        <button onClick={add} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {emails.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">Belum ada email admin. Hanya menggunakan env var NEXT_PUBLIC_ADMIN_EMAILS.</p>
      ) : (
        <div className="space-y-1.5">
          {emails.map((e, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-sm text-slate-900 dark:text-white font-medium">{e}</span>
              </div>
              <ConfirmDialog
                title="Hapus Email Admin?"
                description={`Email "${e}" akan dihapus dari daftar whitelist admin. Tindakan ini tidak dapat dibatalkan.`}
                onConfirm={() => remove(i)}
              >
                <button className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </ConfirmDialog>
            </div>
          ))}
        </div>
      )}

      <ActionBar onSave={onSave} saving={saving} />
    </div>
  )
}

/* ---------- Services Section ---------- */

function ServicesSection({
  services,
  onChange,
  onSave,
  saving,
}: {
  services: ServiceConfig[]
  onChange: (s: ServiceConfig[]) => void
  onSave: () => void
  saving: boolean
}) {
  const add = () => onChange([...services, { id: "", name: "", url: "", description: "" }])
  const remove = (i: number) => onChange(services.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof ServiceConfig, value: string) => {
    const next = [...services]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Daftar Layanan (Portal)</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Layanan yang ditampilkan di Bento Grid halaman utama.</p>

      <div className="space-y-3">
        {services.map((s, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-white/5">
            <input placeholder="ID (contoh: perpus)" value={s.id} onChange={(e) => updateItem(i, "id", e.target.value)} className="input-field" />
            <input placeholder="Nama Layanan" value={s.name} onChange={(e) => updateItem(i, "name", e.target.value)} className="input-field" />
            <input placeholder="URL (contoh: perpus.sdn02cibadak.sch.id)" value={s.url} onChange={(e) => updateItem(i, "url", e.target.value)} className="input-field" />
            <input placeholder="Deskripsi singkat" value={s.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="input-field" />
            <ConfirmDialog
              title="Hapus Layanan?"
              description={`Layanan "${s.name || 'ini'}" akan dihapus dari daftar. Tindakan ini tidak dapat dibatalkan.`}
              onConfirm={() => remove(i)}
            />
          </div>
        ))}
      </div>

      <ActionBar onAdd={add} addLabel="Tambah Layanan" onSave={onSave} saving={saving} />
    </div>
  )
}

/* ---------- Social Links Section ---------- */

function SocialLinksSection({
  links,
  onChange,
  onSave,
  saving,
}: {
  links: SocialLink[]
  onChange: (l: SocialLink[]) => void
  onSave: () => void
  saving: boolean
}) {
  const add = () => onChange([...links, { id: "", platform: "", url: "", icon: "" }])
  const remove = (i: number) => onChange(links.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof SocialLink, value: string) => {
    const next = [...links]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Sosial Media</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Daftar sosial media yang tampil di footer website.</p>

      <div className="space-y-3">
        {links.map((l, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-white/5">
            <input placeholder="ID (contoh: instagram)" value={l.id} onChange={(e) => updateItem(i, "id", e.target.value)} className="input-field" />
            <input placeholder="Platform (contoh: Instagram)" value={l.platform} onChange={(e) => updateItem(i, "platform", e.target.value)} className="input-field" />
            <input placeholder="URL (contoh: https://instagram.com/...)" value={l.url} onChange={(e) => updateItem(i, "url", e.target.value)} className="input-field" />
            <div className="flex items-center gap-2">
              <input placeholder="Icon (opsional)" value={l.icon || ""} onChange={(e) => updateItem(i, "icon", e.target.value)} className="input-field flex-1" />
              <ConfirmDialog
                title="Hapus Sosial Media?"
                description={`Sosial media "${l.platform || 'ini'}" akan dihapus dari daftar. Tindakan ini tidak dapat dibatalkan.`}
                onConfirm={() => remove(i)}
              />
            </div>
          </div>
        ))}
      </div>

      <ActionBar onAdd={add} addLabel="Tambah Sosial Media" onSave={onSave} saving={saving} />
    </div>
  )
}

/* ---------- Announcement Section ---------- */

function AnnouncementSection({
  announcement,
  onChange,
  onSave,
  saving,
}: {
  announcement: AnnouncementConfig
  onChange: (a: AnnouncementConfig) => void
  onSave: () => void
  saving: boolean
}) {
  const typeOptions: { value: AnnouncementConfig["type"]; label: string; color: string }[] = [
    { value: "info", label: "Info", color: "bg-blue-500" },
    { value: "warning", label: "Peringatan", color: "bg-amber-500" },
    { value: "success", label: "Sukses", color: "bg-emerald-500" },
  ]

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Banner Pengumuman</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Tampilkan pengumuman di bagian atas halaman utama untuk semua pengunjung.</p>

      <div className="space-y-4">
        {/* Toggle aktif */}
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => onChange({ ...announcement, active: !announcement.active })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              announcement.active ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              announcement.active ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {announcement.active ? "Pengumuman Aktif" : "Pengumuman Nonaktif"}
          </span>
        </label>

        {/* Tipe */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Tipe Pengumuman</label>
          <div className="flex gap-1.5">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange({ ...announcement, type: opt.value })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  announcement.type === opt.value
                    ? `${opt.color} text-white shadow-sm`
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${announcement.type === opt.value ? "bg-white/80" : opt.color}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Teks */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Isi Pengumuman</label>
          <textarea
            placeholder="Tulis pengumuman yang akan ditampilkan..."
            value={announcement.text}
            onChange={(e) => onChange({ ...announcement, text: e.target.value })}
            rows={3}
            className="input-field resize-none"
          />
        </div>

        {/* Link opsional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Link URL (opsional)</label>
            <input
              placeholder="https://..."
              value={announcement.link ?? ""}
              onChange={(e) => onChange({ ...announcement, link: e.target.value || undefined })}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Label Tombol</label>
            <input
              placeholder="Selengkapnya"
              value={announcement.linkLabel ?? ""}
              onChange={(e) => onChange({ ...announcement, linkLabel: e.target.value || undefined })}
              className="input-field"
            />
          </div>
        </div>

        {/* Preview */}
        {announcement.active && announcement.text && (
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Preview</label>
            <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
              announcement.type === "info" ? "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/20"
              : announcement.type === "warning" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/20"
              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20"
            }`}>
              {announcement.text}
              {announcement.link && (
                <span className="ml-2 underline font-bold">{announcement.linkLabel || "Selengkapnya"}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <ActionBar onSave={onSave} saving={saving} />
    </div>
  )
}

/* ---------- Maintenance Scheduler Section ---------- */

function MaintenanceSection({
  schedules,
  services,
  onChange,
  onSave,
  saving,
}: {
  schedules: MaintenanceSchedule[]
  services: ServiceConfig[]
  onChange: (m: MaintenanceSchedule[]) => void
  onSave: () => void
  saving: boolean
}) {
  const add = () => {
    const id = `ms-${Date.now().toString(36)}`
    onChange([...schedules, { id, serviceId: services[0]?.id ?? "", label: "", from: Date.now(), to: Date.now() + 3600000 }])
  }
  const remove = (i: number) => onChange(schedules.filter((_, idx) => idx !== i))
  const updateItem = (i: number, patch: Partial<MaintenanceSchedule>) => {
    const next = [...schedules]
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }

  const toLocalDatetime = (ms: number) => {
    const d = new Date(ms)
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  }
  const fromLocalDatetime = (val: string) => new Date(val).getTime()

  const now = Date.now()

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Jadwal Maintenance Otomatis</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Layanan akan otomatis berstatus &quot;Maintenance&quot; saat jadwal aktif. Status kembali normal setelah jadwal berakhir.</p>

      {schedules.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic py-4">Belum ada jadwal maintenance.</p>
      ) : (
        <div className="space-y-3">
          {schedules.map((s, i) => {
            const isActive = now >= s.from && now <= s.to
            const isPast = now > s.to
            return (
              <div key={s.id} className={`p-4 rounded-xl border space-y-3 ${
                isActive ? "bg-amber-50/60 dark:bg-amber-500/5 border-amber-300 dark:border-amber-500/30"
                : isPast ? "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-white/5 opacity-60"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-white/5"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? "bg-amber-500 text-white" : isPast ? "bg-slate-400 text-white" : "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}>
                      {isActive ? "⚡ Sedang Aktif" : isPast ? "Selesai" : "Terjadwal"}
                    </span>
                  </div>
                  <ConfirmDialog
                    title="Hapus Jadwal?"
                    description={`Jadwal maintenance "${s.label || 'ini'}" akan dihapus.`}
                    onConfirm={() => remove(i)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Layanan</label>
                    <select
                      value={s.serviceId}
                      onChange={(e) => updateItem(i, { serviceId: e.target.value })}
                      className="input-field"
                    >
                      {services.map((svc) => (
                        <option key={svc.id} value={svc.id}>{svc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Keterangan</label>
                    <input
                      placeholder="Update server, dll."
                      value={s.label}
                      onChange={(e) => updateItem(i, { label: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Mulai</label>
                    <input
                      type="datetime-local"
                      value={toLocalDatetime(s.from)}
                      onChange={(e) => updateItem(i, { from: fromLocalDatetime(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Selesai</label>
                    <input
                      type="datetime-local"
                      value={toLocalDatetime(s.to)}
                      onChange={(e) => updateItem(i, { to: fromLocalDatetime(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ActionBar onAdd={add} addLabel="Tambah Jadwal" onSave={onSave} saving={saving} />
    </div>
  )
}

/* ---------- Reply Templates Section ---------- */

function TemplatesSection({
  templates,
  onChange,
  onSave,
  saving,
}: {
  templates: ReplyTemplate[]
  onChange: (t: ReplyTemplate[]) => void
  onSave: () => void
  saving: boolean
}) {
  const add = () => {
    const id = `tpl-${Date.now().toString(36)}`
    onChange([...templates, { id, title: "", content: "" }])
  }
  const remove = (i: number) => onChange(templates.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof ReplyTemplate, value: string) => {
    const next = [...templates]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Template Balasan Cepat</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Template yang bisa langsung dipilih admin saat membalas tiket. Hemat waktu untuk jawaban yang sering digunakan.</p>

      {templates.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic py-4">Belum ada template. Tambahkan template untuk mempercepat balasan tiket.</p>
      ) : (
        <div className="space-y-4">
          {templates.map((t, i) => (
            <div key={t.id} className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">{i + 1}</span>
                <ConfirmDialog
                  title="Hapus Template?"
                  description={`Template "${t.title || 'ini'}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
                  onConfirm={() => remove(i)}
                />
              </div>
              <div className="space-y-3 min-w-0">
                <div className="min-w-0">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Judul Template</label>
                  <input placeholder="Contoh: Sedang diproses" value={t.title} onChange={(e) => updateItem(i, "title", e.target.value)} className="input-field" />
                </div>
                <div className="min-w-0">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Isi Balasan</label>
                  <textarea placeholder="Tulis isi template balasan..." value={t.content} onChange={(e) => updateItem(i, "content", e.target.value)} rows={3} className="input-field resize-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ActionBar onAdd={add} addLabel="Tambah Template" onSave={onSave} saving={saving} />
    </div>
  )
}
