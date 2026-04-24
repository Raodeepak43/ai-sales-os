"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { CalendarDays, Plus, Trash2, Clock, Loader2, CheckCircle } from "lucide-react";

interface Booking {
  id: string;
  name: string;
  contact: string;
  date: string;
  timeSlot: string;
  status: "pending" | "confirmed" | "cancelled";
  timestamp: any;
}

const TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM",
];

export default function BookingPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", date: "", timeSlot: "" });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
    getDocs(q).then((snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Booking[];
      data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setBookings(data);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.date || !form.timeSlot || !form.name) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, "bookings"), {
        ...form,
        userId: user.uid,
        status: "confirmed",
        timestamp: serverTimestamp(),
      });
      setBookings((prev) => [{ id: docRef.id, ...form, status: "confirmed", timestamp: null }, ...prev]);
      setForm({ name: "", contact: "", date: "", timeSlot: "" });
      setShowForm(false);
    } catch (e) { alert("Failed to save booking"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "bookings", id));
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  // Build mini calendar
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const bookedDates = new Set(bookings.map((b) => b.date));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking System</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage appointments and time slots.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Booking
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-500" />
            {today.toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <span key={i} className="text-gray-400 font-medium py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDay }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = day === today.getDate();
              const hasBooking = bookedDates.has(dateStr);
              return (
                <button
                  key={day}
                  onClick={() => setForm((f) => ({ ...f, date: dateStr }))}
                  className={`rounded-full aspect-square flex items-center justify-center text-xs font-medium transition-colors
                    ${isToday ? "bg-blue-600 text-white" : ""}
                    ${hasBooking && !isToday ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" : ""}
                    ${!isToday && !hasBooking ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" : ""}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-500"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Today</div>
            <div className="flex items-center gap-2 text-xs text-gray-500"><span className="w-3 h-3 rounded-full bg-violet-200 inline-block" /> Has booking</div>
          </div>
        </div>

        {/* Form + Bookings */}
        <div className="lg:col-span-2 space-y-4">
          {showForm && (
            <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Add New Booking</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Name *</label>
                  <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Client name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label>
                  <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Email or phone" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Slot *</label>
                  <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.timeSlot} onChange={(e) => setForm((f) => ({ ...f, timeSlot: e.target.value }))} required>
                    <option value="">Select slot</option>
                    {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Confirm Booking
                </button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
            ) : bookings.length === 0 ? (
              <div className="py-16 text-center">
                <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No bookings yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "New Booking" to add one</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{b.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{b.contact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{b.date}</p>
                        <p className="text-xs text-gray-400">{b.timeSlot}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${b.status === "confirmed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                        {b.status}
                      </span>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
