# Email Notifications Setup Guide

## Fitur
- Notifikasi email saat tiket baru masuk (ke Admin)
- Notifikasi email saat ada balasan baru (ke User)
- Notifikasi email saat status tiket berubah (ke User)

---

## STEP 1: Pilih Email Service

### Rekomendasi: Resend (Gratis 3.000 email/bulan)

**Kelebihan:**
- Gratis 3.000 email/bulan
- Mudah setup
- Support Next.js API Routes
- Dashboard untuk monitoring

**Alternatif:**
- **SendGrid** - Gratis 100 email/hari
- **Postmark** - Gratis 100 email/bulan
- **Nodemailer + Gmail SMTP** - Gratis tapi limit

---

## STEP 2: Setup Resend

### 2.1 Daftar Akun
1. Buka https://resend.com
2. Klik "Start for free"
3. Daftar dengan email Anda
4. Verifikasi email

### 2.2 Buat API Key
1. Login ke Dashboard Resend
2. Klik "API Keys" di sidebar
3. Klik "Add API Key"
4. Beri nama: "Helpdesk SDN 02"
5. Copy API Key (dimulai dengan `re_...`)

### 2.3 Verify Domain (Opsional untuk Production)
Untuk menggunakan email custom (misal: noreply@sekolah.sch.id):

1. Klik "Domains" di sidebar
2. Klik "Add Domain"
3. Masukkan domain Anda
4. Tambahkan DNS records yang diberikan:
   - MX record
   - TXT record (SPF)
   - TXT record (DKIM)
5. Tunggu verifikasi (5-30 menit)

**Untuk testing:** Bisa pakai `onboarding@resend.dev` tanpa verify domain.

---

## STEP 3: Install Resend SDK

```bash
npm install resend
```

---

## STEP 4: Setup Environment Variables

Buat file `.env.local` di root project:

```env
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Admin Email (untuk notifikasi tiket baru)
ADMIN_EMAIL=admin@sekolah.sch.id

# App URL (untuk link di email)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Untuk production, ganti dengan domain Anda:
# NEXT_PUBLIC_APP_URL=https://helpdesk.sekolah.sch.id
```

**Penting:**
- Jangan commit `.env.local` ke Git
- Restart dev server setelah menambah env variables

---

## STEP 5: Test Email

### 5.1 Test via API Route

```bash
curl -X POST http://localhost:3000/api/email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new-ticket",
    "data": {
      "ticketCode": "TKT-TEST",
      "ticketId": "test123",
      "reporterName": "Ahmad Test",
      "service": "IT Support",
      "priority": "Tinggi",
      "department": "IT",
      "details": "Ini adalah test email dari helpdesk"
    }
  }'
```

### 5.2 Test via UI

1. Buka aplikasi
2. Buat tiket baru sebagai user
3. Cek email admin (sesuai ADMIN_EMAIL)
4. Balas tiket sebagai admin
5. Cek email user (jika reporterEmail diisi)

---

## STEP 6: Integrasi di Kode

### 6.1 Notifikasi Tiket Baru (sudah otomatis)
Edit `admin-dashboard.tsx` atau tempat subscribe tickets:

```typescript
// Di useEffect subscribeTickets
if (newTickets.length > 0 && prevTicketsRef.current.length > 0) {
  // ... existing notification code ...

  // Kirim email notifikasi
  fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "new-ticket",
      data: {
        ticketCode: newTickets[0].code,
        ticketId: newTickets[0].id,
        reporterName: newTickets[0].name,
        service: serviceName(newTickets[0].service),
        priority: newTickets[0].priority,
        department: newTickets[0].department,
        details: newTickets[0].details,
      },
    }),
  }).catch(() => {}) // Silent fail
}
```

### 6.2 Notifikasi Balasan Baru
Edit `reply-thread.tsx` setelah kirim balasan:

```typescript
await addReply({ ... })

// Kirim email notifikasi (hanya jika balasan admin)
if (as === "admin" && !isInternal && ticket.reporterEmail) {
  fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "reply",
      data: {
        ticketCode: ticket.code,
        ticketId: ticket.id,
        reporterName: ticket.name,
        reporterEmail: ticket.reporterEmail,
        replyText: text.trim(),
        adminName: authorName,
      },
    }),
  }).catch(() => {})
}
```

### 6.3 Notifikasi Status Berubah
Edit `firestore-service.ts` di fungsi `updateTicketStatus`:

```typescript
export async function updateTicketStatus(id: string, status: TicketStatus, actor: string) {
  // ... existing code ...

  // Kirim email notifikasi
  const ticket = await getTicketById(id) // perlu fungsi baru
  if (ticket?.reporterEmail) {
    fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "status-change",
        data: {
          ticketCode: ticket.code,
          ticketId: ticket.id,
          reporterName: ticket.name,
          reporterEmail: ticket.reporterEmail,
          newStatus: status,
        },
      }),
    }).catch(() => {})
  }
}
```

---

## STEP 7: Production Checklist

- [ ] Verify domain di Resend
- [ ] Update `NEXT_PUBLIC_APP_URL` ke domain production
- [ ] Update `from` email di `email-service.ts` ke domain Anda
- [ ] Set `ADMIN_EMAIL` ke email admin yang valid
- [ ] Test semua skenario email:
  - [ ] Tiket baru ke admin
  - [ ] Balasan ke user
  - [ ] Status change ke user
- [ ] Monitor di Dashboard Resend

---

## Troubleshooting

### Email tidak terkirim
1. Cek API Key benar
2. Cek ADMIN_EMAIL valid
3. Cek log di Dashboard Resend
4. Cek console browser/server untuk error

### Email masuk Spam
1. Verify domain dengan SPF & DKIM
2. Gunakan domain sendiri (bukan resend.dev)
3. Hindari kata-kata spam di subject/body

### Limit exceeded
- Resend gratis: 3.000 email/bulan
- Upgrade ke plan berbayar jika perlu

---

## Files Created

1. `lib/helpdesk/email-service.ts` - Email service & templates
2. `app/api/email/route.ts` - API endpoint
3. `docs/EMAIL_SETUP.md` - Dokumentasi ini

---

## Environment Variables Required

```env
RESEND_API_KEY=re_xxxxx
ADMIN_EMAIL=admin@sekolah.sch.id
NEXT_PUBLIC_APP_URL=https://helpdesk.sekolah.sch.id
```
