"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, MessageSquareText, Users, CreditCard,
  Settings, LogOut, Menu, X, CalendarDays, Mail,
  Zap, BookOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// ── Navigation with grouped sections ──────────────────────────────
const coreNav = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Agent", href: "/dashboard/agent", icon: MessageSquareText },
  { name: "Leads", href: "/dashboard/leads", icon: Users },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
];

const moduleNav = [
  { name: "Booking", href: "/dashboard/booking", icon: CalendarDays, badge: "New" },
  { name: "Email Marketing", href: "/dashboard/email", icon: Mail, badge: "New" },
  { name: "Social Auto", href: "/dashboard/social", icon: Zap, badge: "New" },
  { name: "Courses", href: "/dashboard/courses", icon: BookOpen, badge: "New" },
];

const bottomNav = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface NavItemProps {
  item: { name: string; href: string; icon: any; badge?: string };
  pathname: string;
  onClose: () => void;
}

function NavItem({ item, pathname, onClose }: NavItemProps) {
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all group ${
        isActive
          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
          : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/60"
      }`}
    >
      <span className="flex items-center gap-3">
        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-blue-600 dark:text-blue-300" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"}`} />
        {item.name}
      </span>
      {item.badge && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [modulesOpen, setModulesOpen] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      if (!user) return;
      if (pathname === "/dashboard/onboarding") { setChecking(false); return; }
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (!data.businessName || !data.price) {
            router.push("/dashboard/onboarding");
          } else {
            setChecking(false);
          }
        } else {
          setChecking(false);
        }
      } catch { setChecking(false); }
    }
    checkOnboarding();
  }, [user, pathname, router]);

  if (checking && pathname !== "/dashboard/onboarding") {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900" />;
  }
  if (pathname === "/dashboard/onboarding") return <>{children}</>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">

        {/* Mobile topbar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-between px-4">
          <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold">AI</span>
            Sales OS
          </span>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-40 w-60 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transform transition-transform duration-200 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col shadow-xl lg:shadow-none`}>

          {/* Logo */}
          <div className="h-14 flex items-center px-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">AI</span>
              <span>Sales OS</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
            {/* Core nav */}
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 mb-2">Core</p>
            {coreNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onClose={() => setIsSidebarOpen(false)} />)}

            {/* Modules nav */}
            <div className="pt-4 pb-1">
              <button
                onClick={() => setModulesOpen(!modulesOpen)}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                <span>Modules</span>
                {modulesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </div>
            {modulesOpen && moduleNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onClose={() => setIsSidebarOpen(false)} />)}
          </div>

          {/* Bottom: settings + user */}
          <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 p-3 space-y-0.5">
            {bottomNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} onClose={() => setIsSidebarOpen(false)} />)}
            <div className="flex items-center gap-3 px-3 py-2.5 mt-2">
              {user?.photoURL
                ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-gray-100 dark:ring-gray-700" />
                : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">{user?.email?.[0].toUpperCase()}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user?.displayName || "User"}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button onClick={logOut} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
          <main className="flex-1 pt-14 lg:pt-0 p-4 lg:p-8">{children}</main>
        </div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        )}
      </div>
    </ProtectedRoute>
  );
}
