"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, addDoc, getDocs, updateDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { BookOpen, Plus, Video, Lock, Unlock, Loader2, ChevronRight, Trash2, GraduationCap } from "lucide-react";

interface Lesson {
  title: string;
  videoUrl: string;
  duration: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  price: string;
  access: "free" | "paid";
  lessons: Lesson[];
  published: boolean;
  enrolledCount: number;
  timestamp: any;
}

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", price: "", access: "paid" as "free" | "paid",
    lessons: [{ title: "", videoUrl: "", duration: "" }],
  });

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "courses"), where("userId", "==", user.uid))).then((snap) => {
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Course[]);
    }).finally(() => setLoading(false));
  }, [user]);

  const addLesson = () => setForm((f) => ({ ...f, lessons: [...f.lessons, { title: "", videoUrl: "", duration: "" }] }));
  const updateLesson = (i: number, key: keyof Lesson, value: string) => {
    const lessons = [...form.lessons];
    lessons[i] = { ...lessons[i], [key]: value };
    setForm((f) => ({ ...f, lessons }));
  };
  const removeLesson = (i: number) => setForm((f) => ({ ...f, lessons: f.lessons.filter((_, idx) => idx !== i) }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, "courses"), {
        ...form, userId: user.uid, published: false, enrolledCount: 0, timestamp: serverTimestamp(),
      });
      setCourses((p) => [{ id: ref.id, ...form, published: false, enrolledCount: 0, timestamp: null }, ...p]);
      setForm({ title: "", description: "", price: "", access: "paid", lessons: [{ title: "", videoUrl: "", duration: "" }] });
      setShowForm(false);
    } catch { alert("Failed to save"); }
    finally { setSaving(false); }
  };

  const togglePublish = async (course: Course) => {
    await updateDoc(doc(db, "courses", course.id), { published: !course.published });
    setCourses((p) => p.map((c) => c.id === course.id ? { ...c, published: !c.published } : c));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await deleteDoc(doc(db, "courses", id));
    setCourses((p) => p.filter((c) => c.id !== id));
    if (selectedCourse?.id === id) setSelectedCourse(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Course Builder</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create and sell video courses to your audience.</p>
        </div>
        <button onClick={() => { setShowForm(true); setSelectedCourse(null); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Course
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Courses", value: courses.length, icon: BookOpen, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
          { label: "Published", value: courses.filter((c) => c.published).length, icon: GraduationCap, color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
          { label: "Total Lessons", value: courses.reduce((s, c) => s + (c.lessons?.length || 0), 0), icon: Video, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : courses.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center shadow-sm">
              <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-sm">No courses yet</p>
            </div>
          ) : (
            courses.map((c) => (
              <button key={c.id} onClick={() => { setSelectedCourse(c); setShowForm(false); }} className={`w-full text-left p-4 rounded-2xl border transition-all shadow-sm ${selectedCourse?.id === c.id ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20" : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{c.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.lessons?.length || 0} lessons</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.published ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                      {c.published ? "Live" : "Draft"}
                    </span>
                    {c.access === "paid" ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail / Create Form */}
        <div className="lg:col-span-2">
          {selectedCourse && !showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCourse.title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedCourse.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">₹{selectedCourse.price || "Free"}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedCourse.access === "paid" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                        {selectedCourse.access}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => togglePublish(selectedCourse)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${selectedCourse.published ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200" : "bg-green-600 hover:bg-green-700 text-white"}`}>
                      {selectedCourse.published ? "Unpublish" : "Publish"}
                    </button>
                    <button onClick={() => handleDelete(selectedCourse.id)} className="text-xs px-3 py-1.5 rounded-lg font-medium text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Lessons */}
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Curriculum ({selectedCourse.lessons?.length || 0} lessons)</h3>
                <div className="space-y-2">
                  {(selectedCourse.lessons || []).map((lesson, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                      <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lesson.title}</p>
                        {lesson.videoUrl && <p className="text-xs text-blue-500 truncate mt-0.5">{lesson.videoUrl}</p>}
                      </div>
                      {lesson.duration && <span className="text-xs text-gray-400 shrink-0">{lesson.duration}</span>}
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-gray-900 dark:text-white">Create New Course</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Course Title *</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Instagram Growth Masterclass" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                  <textarea rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Brief description of the course" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price (₹)</label>
                  <input type="number" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0 for free" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Access</label>
                  <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.access} onChange={(e) => setForm((f) => ({ ...f, access: e.target.value as "free" | "paid" }))}>
                    <option value="paid">Paid</option>
                    <option value="free">Free</option>
                  </select>
                </div>
              </div>

              {/* Lessons */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lessons</label>
                  <button type="button" onClick={addLesson} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Lesson
                  </button>
                </div>
                <div className="space-y-3">
                  {form.lessons.map((lesson, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                      <input className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                        placeholder="Lesson title" value={lesson.title} onChange={(e) => updateLesson(i, "title", e.target.value)} />
                      <input className="w-28 bg-transparent text-xs text-gray-500 dark:text-gray-400 placeholder-gray-400 outline-none"
                        placeholder="Video URL" value={lesson.videoUrl} onChange={(e) => updateLesson(i, "videoUrl", e.target.value)} />
                      <input className="w-16 bg-transparent text-xs text-gray-500 dark:text-gray-400 placeholder-gray-400 outline-none"
                        placeholder="5 min" value={lesson.duration} onChange={(e) => updateLesson(i, "duration", e.target.value)} />
                      {form.lessons.length > 1 && (
                        <button type="button" onClick={() => removeLesson(i)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                  Create Course
                </button>
              </div>
            </form>
          )}

          {!showForm && !selectedCourse && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 h-64 flex flex-col items-center justify-center shadow-sm text-center p-8">
              <GraduationCap className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="font-medium text-gray-500 dark:text-gray-400">Select a course to view details</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">or create a new one to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
