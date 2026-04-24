"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import ChatInterface from "@/components/ChatInterface";
import { 
  MessageSquare, Calendar, BookOpen, Mail, 
  Heart, AtSign, Globe,
  ShieldCheck, ArrowRight, Star
} from "lucide-react";

interface BusinessProfile {
  businessName: string;
  price: string;
  serviceDescription: string;
  keyBenefits: string;
  targetAudience: string;
  aiTone: string;
  handle: string;
}

interface Course {
  id: string;
  title: string;
  price: string;
  access: string;
  lessons: any[];
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "booking" | "courses" | "about">("chat");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch Profile
      const userQuery = query(collection(db, "users"), where("handle", "==", username));
      const userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data() as BusinessProfile;
        const userId = userSnap.docs[0].id;
        setProfile(userData);

        // Fetch Courses
        const courseQuery = query(collection(db, "courses"), where("userId", "==", userId), where("published", "==", true));
        const courseSnap = await getDocs(courseQuery);
        setCourses(courseSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Course[]);
      }
      setLoading(false);
    }
    fetchData();
  }, [username]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">404: Business Not Found</h1>
        <p className="text-gray-500 mt-2">The link you followed may be broken or the business has moved.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#030712] font-sans">
      {/* Header / Brand Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
        <div className="max-w-screen-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg">
              {profile.businessName[0]}
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white leading-tight">{profile.businessName}</h1>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                <ShieldCheck className="w-3 h-3 text-blue-500" />
                Verified Merchant
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Heart className="w-4 h-4 text-gray-400" />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <AtSign className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero Banner (Subtle) */}
      <div className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 px-4 pt-8 pb-6 text-center border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-screen-md mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-4">
            <Star className="w-3 h-3 fill-current" />
            Top Rated Service
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">
            Elevate your business with {profile.businessName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            {profile.serviceDescription}
          </p>
        </div>
      </div>

      {/* Main Content & Tabs */}
      <div className="max-w-screen-md mx-auto p-4 pb-24">
        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-2xl mb-6">
          <button 
            onClick={() => setActiveTab("chat")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "chat" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button 
            onClick={() => setActiveTab("booking")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "booking" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}
          >
            <Calendar className="w-4 h-4" />
            Book
          </button>
          <button 
            onClick={() => setActiveTab("courses")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "courses" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}
          >
            <BookOpen className="w-4 h-4" />
            Courses
          </button>
          <button 
            onClick={() => setActiveTab("about")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === "about" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}
          >
            <Star className="w-4 h-4" />
            Info
          </button>
        </div>

        {/* Tab Views */}
        <div className="min-h-[400px]">
          {activeTab === "chat" && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-blue-500/5 overflow-hidden">
              <ChatInterface 
                businessName={profile.businessName} 
                price={profile.price} 
                userId={username as string} 
                onBuyTrigger={(leadId) => {
                  // Redirect to payment or capture final lead data
                  console.log("Triggering Buy for Lead:", leadId);
                  alert("Redirecting to secure checkout...");
                  // Example: window.location.href = `/api/pay?leadId=${leadId}&amount=${profile.price}`;
                }}
              />
            </div>
          )}

          {activeTab === "booking" && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-center">
                <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Schedule a Session</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">Select a convenient time for us to connect.</p>
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                  {["Today, 2:00 PM", "Tomorrow, 10:00 AM", "Monday, 4:00 PM", "Tuesday, 11:00 AM"].map(time => (
                    <button key={time} className="px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-900 dark:text-gray-300 border border-gray-100 dark:border-gray-700 hover:border-blue-500 transition-all">
                      {time}
                    </button>
                  ))}
                </div>
                <button className="w-full max-w-sm mt-6 py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                  Check All Availability <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === "courses" && (
            <div className="space-y-3">
              {courses.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 p-12 rounded-3xl border border-gray-100 dark:border-gray-800 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No courses published yet.</p>
                </div>
              ) : (
                courses.map(course => (
                  <div key={course.id} className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:border-blue-500 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{course.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{course.lessons.length} Lessons • {course.access}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">₹{course.price}</p>
                      <button className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-blue-600 flex items-center gap-1 mt-1 transition-colors">
                        View <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "about" && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-8">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Key Benefits</h3>
                <div className="grid grid-cols-1 gap-4">
                  {profile.keyBenefits.split(',').map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Star className="w-3 h-3 text-green-600 fill-current" />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{benefit.trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Target Audience</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  {profile.targetAudience}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom CTA for Mobile */}
      <div className="fixed bottom-6 left-4 right-4 z-40 lg:hidden">
        <button 
          onClick={() => setActiveTab("chat")}
          className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
        >
          <MessageSquare className="w-5 h-5" />
          Talk to AI Sales Closer
        </button>
      </div>

      {/* Footer */}
      <footer className="max-w-screen-md mx-auto px-4 py-12 text-center border-t border-gray-100 dark:border-gray-800 mt-8">
        <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-600 text-xs font-semibold">
          <Globe className="w-3 h-3" />
          Powered by AI Sales OS
        </div>
      </footer>
    </div>
  );
}
