"use client"

import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { Ticket, Feedback, AuditLog } from "@/lib/helpdesk/firestore-service"
import type { Guest } from "@/lib/helpdesk/guest-service"

// Register standard fonts if needed, but standard fonts like Helvetica are built-in
// styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#334155",
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
  },
  table: {
    display: "flex",
    width: "auto",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomColor: "#f1f5f9",
    borderBottomWidth: 1,
    alignItems: "center",
    minHeight: 24,
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    fontWeight: "bold",
  },
  tableCell: {
    padding: 4,
  },
  // Column widths
  col1: { width: "15%" }, // Code / Date
  col2: { width: "20%" }, // Name / Service
  col3: { width: "15%" }, // Role / Rating
  col4: { width: "20%" }, // Service / Feedback
  col5: { width: "15%" }, // Priority
  col6: { width: "15%" }, // Status
  
  // Audit columns
  auditCol1: { width: "20%" }, // Time
  auditCol2: { width: "20%" }, // Action
  auditCol3: { width: "20%" }, // Actor
  auditCol4: { width: "40%" }, // Detail
  
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    borderTop: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
})

interface ReportPDFProps {
  type: "tickets" | "surveys" | "audit" | "guests"
  data: any[]
  serviceName?: (id: string) => string
}

export const ReportPDF = ({ type, data, serviceName }: ReportPDFProps) => {
  const dateStr = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {type === "tickets" 
              ? "Rekapan Tiket Helpdesk" 
              : type === "surveys" 
                ? "Rekapan Indeks Kepuasan Masyarakat" 
                : type === "guests"
                  ? "Rekapan Buku Tamu Digital"
                  : "Audit Log System"}
          </Text>
          <Text style={styles.subtitle}>Dicetak pada: {dateStr}</Text>
          <Text style={styles.subtitle}>Total Data: {data.length}</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {type === "tickets" ? (
              <>
                <Text style={[styles.tableCell, styles.col1]}>Kode</Text>
                <Text style={[styles.tableCell, styles.col2]}>Nama</Text>
                <Text style={[styles.tableCell, styles.col3]}>Layanan</Text>
                <Text style={[styles.tableCell, styles.col4]}>Dept</Text>
                <Text style={[styles.tableCell, styles.col5]}>Prioritas</Text>
                <Text style={[styles.tableCell, styles.col6]}>Status</Text>
              </>
            ) : type === "surveys" ? (
              <>
                <Text style={[styles.tableCell, { width: "20%" }]}>Tanggal</Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>Layanan</Text>
                <Text style={[styles.tableCell, { width: "10%" }]}>Rating</Text>
                <Text style={[styles.tableCell, { width: "45%" }]}>Ulasan</Text>
              </>
            ) : type === "guests" ? (
              <>
                <Text style={[styles.tableCell, { width: "15%" }]}>Waktu</Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>Nama</Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>Kategori</Text>
                <Text style={[styles.tableCell, { width: "35%" }]}>Tujuan</Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>Status</Text>
              </>
            ) : (
              <>
                <Text style={[styles.tableCell, styles.auditCol1]}>Waktu</Text>
                <Text style={[styles.tableCell, styles.auditCol2]}>Aktivitas</Text>
                <Text style={[styles.tableCell, styles.auditCol3]}>Pelaku</Text>
                <Text style={[styles.tableCell, styles.auditCol4]}>Detail</Text>
              </>
            )}
          </View>

          {/* Table Rows */}
          {data.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              {type === "tickets" ? (
                <>
                  <Text style={[styles.tableCell, styles.col1]}>{(item as Ticket).code}</Text>
                  <Text style={[styles.tableCell, styles.col2]}>{(item as Ticket).name}</Text>
                  <Text style={[styles.tableCell, styles.col3]}>{serviceName?.((item as Ticket).service) || (item as Ticket).service}</Text>
                  <Text style={[styles.tableCell, styles.col4]}>{(item as Ticket).department}</Text>
                  <Text style={[styles.tableCell, styles.col5]}>{(item as Ticket).priority}</Text>
                  <Text style={[styles.tableCell, styles.col6]}>{(item as Ticket).status}</Text>
                </>
              ) : type === "surveys" ? (
                <>
                  <Text style={[styles.tableCell, { width: "20%" }]}>
                    {new Date((item as Feedback).createdAt).toLocaleDateString("id-ID")}
                  </Text>
                  <Text style={[styles.tableCell, { width: "25%" }]}>
                    {serviceName?.((item as Feedback).service) || (item as Feedback).service}
                  </Text>
                  <Text style={[styles.tableCell, { width: "10%" }]}>{(item as Feedback).rating}/5</Text>
                  <Text style={[styles.tableCell, { width: "45%" }]}>{(item as Feedback).feedback}</Text>
                </>
              ) : type === "guests" ? (
                <>
                  <Text style={[styles.tableCell, { width: "15%" }]}>
                    {new Date((item as Guest).checkInTime).toLocaleDateString("id-ID")}
                  </Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>{(item as Guest).name}</Text>
                  <Text style={[styles.tableCell, { width: "15%" }]}>{(item as Guest).category}</Text>
                  <Text style={[styles.tableCell, { width: "35%" }]}>{(item as Guest).purpose}</Text>
                  <Text style={[styles.tableCell, { width: "15%" }]}>{(item as Guest).status}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.tableCell, styles.auditCol1]}>
                    {new Date((item as AuditLog).createdAt).toLocaleString("id-ID")}
                  </Text>
                  <Text style={[styles.tableCell, styles.auditCol2]}>{(item as AuditLog).action}</Text>
                  <Text style={[styles.tableCell, styles.auditCol3]}>{(item as AuditLog).actor}</Text>
                  <Text style={[styles.tableCell, styles.auditCol4]}>{(item as AuditLog).meta || "-"}</Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `Halaman ${pageNumber} dari ${totalPages} ΓÇó Smart Helpdesk SDN 02 Cibadak`
        )} fixed />
      </Page>
    </Document>
  )
}
