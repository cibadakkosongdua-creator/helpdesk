"use client"

import { Calendar, Clock, User, Phone, LogOut, Trash2, Filter, CheckCircle2, Circle } from "lucide-react"
import { useEffect, useState } from "react"
import { subscribeGuests, subscribeGuestsByDate, deleteGuest, checkOutGuest, type Guest } from "@/lib/helpdesk/guest-service"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import type { ShowToastFn } from "./types"

export function GuestList({ showToast }: { showToast: ShowToastFn }) {
  const [guests, setGuests] = useState<Guest[]>([])
  const [filterDate, setFilterDate] = useState<"all" | "today" | "week">("all")
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; guest: Guest | null }>({ isOpen: false, guest: null })

  useEffect(() => {
    setLoading(true)
    let unsub: (() => void) | undefined

    if (filterDate === "all") {
      unsub = subscribeGuests((list) => {
        setGuests(list)
        setLoading(false)
      })
    } else {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1
      
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const startOfWeekTime = startOfWeek.getTime()

      if (filterDate === "today") {
        unsub = subscribeGuestsByDate(startOfDay, endOfDay, (list) => {
          setGuests(list)
          setLoading(false)
        })
      } else if (filterDate === "week") {
        unsub = subscribeGuestsByDate(startOfWeekTime, endOfDay, (list) => {
          setGuests(list)
          setLoading(false)
        })
      }
    }

    return () => unsub?.()
  }, [filterDate])

  const handleCheckOut = async (guest: Guest) => {
    const notes = prompt("Catatan check-out (opsional):")
    if (notes !== null) {
      try {
        await checkOutGuest(guest.id, notes || undefined)
        showToast(`${guest.name} berhasil check-out`, "success")
      } catch {
        showToast("Gagal check-out tamu", "error")
      }
    }
  }

  const handleDelete = async (guest: Guest) => {
    setDeleteDialog({ isOpen: true, guest })
  }

  const confirmDelete = async () => {
    if (deleteDialog.guest) {
      try {
        await deleteGuest(deleteDialog.guest.id)
        showToast("Data tamu berhasil dihapus", "success")
      } catch {
        showToast("Gagal menghapus data tamu", "error")
      }
    }
    setDeleteDialog({ isOpen: false, guest: null })
  }

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, guest: null })
  }

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), "HH:mm", { locale: id })
  }

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "dd MMM yyyy", { locale: id })
  }

  const stats = {
    total: guests.length,
    checkedIn: guests.filter((g) => g.status === "checked-in").length,
    checkedOut: guests.filter((g) => g.status === "checked-out").length,
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Tamu</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.checkedIn}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Masih Di Lokasi</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-500/20 rounded-xl">
              <LogOut className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.checkedOut}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sudah Pulang</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10">
          <Filter className="w-4 h-4 text-slate-500" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterDate("all")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterDate === "all"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterDate("today")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterDate === "today"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10"
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setFilterDate("week")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterDate === "week"
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10"
            }`}
          >
            Minggu Ini
          </button>
        </div>
      </div>

      {/* Guest List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Memuat data tamu...
        </div>
      ) : guests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10">
          <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada data tamu</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Tamu
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Keperluan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Check-in
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {guests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{guest.name}</p>
                          {guest.phone && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {guest.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        guest.category === "Dinas" ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400" : 
                        guest.category === "Orang Tua" ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : 
                        "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400"
                      }`}>
                        {guest.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {guest.purpose}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(guest.checkInTime)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(guest.checkInTime)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {guest.status === "checked-in" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Masih Di Lokasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 text-xs font-bold">
                          <Circle className="w-3 h-3" />
                          Sudah Pulang
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {guest.status === "checked-in" && (
                          <button
                            onClick={() => handleCheckOut(guest)}
                            className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
                            title="Check-out"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(guest)}
                          className="p-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Tamu</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data tamu "{deleteDialog.guest?.name}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-500">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
