import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { documentationApi } from "../../api/documentationApi";
import { authApi } from "../../api/authApi";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

interface DashboardStats {
  total: number;
  pending: number;
  assigned: number;
  missingDocs: number;
}

const navItems = [
  {
    label: "Documentation Requests",
    path: "/admin/documentation-requests",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: "Lawyer Management",
    path: "/admin/lawyers",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    label: "Clerk Management",
    path: "/admin/clerks",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Client Management",
    path: "/admin/clients",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Documentation Services",
    path: "/admin/documentation-services",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 1.69 13.77M4.93 4.93A10 10 0 0 0 3.24 18.7" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    ),
  },
  {
    label: "Careers & Jobs",
    path: "/admin/careers",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    label: "Appointments",
    path: "/admin/appointments",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Service Requests",
    path: "/admin/service-requests",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="12" y2="16" />
      </svg>
    ),
  },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentAdmin = authApi.getCurrentAdmin();
  const [stats, setStats] = useState<DashboardStats>({ total: 0, pending: 0, assigned: 0, missingDocs: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Live real-time clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    authApi.logoutAdmin();
    navigate("/login");
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const all = await documentationApi.getRequests();
      const pending = all.filter(r => ["PENDING", "UNDER_REVIEW"].includes(r.status)).length;
      const assigned = all.filter(r => r.status === "ASSIGNED" || r.assignedClerkId).length;
      const missingDocs = all.filter(r => r.missingDocuments?.length > 0).length;
      setStats({ total: all.length, pending, assigned, missingDocs });
      setLastRefreshed(new Date());
    } catch {
      // silently ignore stat load failures
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [location.pathname]);

  const statCards = [
    {
      label: "Total Requests",
      value: stats.total,
      icon: "📋",
      topColor: "from-slate-600 to-slate-800",
      accent: "text-slate-900",
      bg: "bg-white",
      desc: "All client submissions",
    },
    {
      label: "Pending Review",
      value: stats.pending,
      icon: "⏳",
      topColor: "from-amber-400 to-amber-600",
      accent: "text-amber-900",
      bg: "bg-white",
      desc: "Awaiting administrative action",
    },
    {
      label: "Assigned to Clerks",
      value: stats.assigned,
      icon: "👤",
      topColor: "from-indigo-500 to-purple-600",
      accent: "text-indigo-950",
      bg: "bg-white",
      desc: "In active casework queue",
    },
    {
      label: "Missing Documents",
      value: stats.missingDocs,
      icon: "⚠️",
      topColor: "from-rose-500 to-amber-500",
      accent: "text-rose-950",
      bg: "bg-white",
      desc: "Requires client re-upload",
    },
  ];

  return (
    <div className="h-screen bg-slate-100/70 flex flex-col font-sans text-slate-900 selection:bg-amber-500/20 selection:text-amber-900 overflow-hidden">
      {/* ─── Top Header Bar ─── */}
      <header className="shrink-0 z-50 bg-slate-950 border-b border-slate-800 shadow-md backdrop-blur-md bg-opacity-95">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          {/* Left: Brand + Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              aria-label="Toggle sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link to="/admin/documentation-requests" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                ⚖️
              </div>
              <div>
                <div className="text-base font-serif font-bold tracking-wide text-white flex items-center gap-2">
                  <span>LegalEase</span>
                  <span className="text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 uppercase font-mono tracking-wider font-bold">
                    Admin Console
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium -mt-0.5">
                  Executive Operations & Oversight
                </div>
              </div>
            </Link>
          </div>

          {/* Right: Status, Refresh, and Clerk Workspace switch */}
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-2 text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] text-slate-300 font-semibold tracking-wide">
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
              </span>
              <button
                onClick={loadStats}
                disabled={statsLoading}
                className="ml-1 p-1 rounded-lg hover:bg-slate-900 text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
                aria-label="Refresh stats"
                title={`Refresh metrics (Metrics synced: ${lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })})`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <Link
              to="/clerk/cases"
              className="text-xs font-semibold text-slate-300 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-800 transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Clerk Portal</span>
            </Link>

            {currentAdmin && (
              <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-extrabold flex items-center justify-center text-[11px] shadow-xs">
                  {currentAdmin.name ? currentAdmin.name[0].toUpperCase() : "A"}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight">
                    {currentAdmin.name || "Administrator"}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-rose-300 hover:text-white bg-slate-900 hover:bg-rose-950/60 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-rose-900/60 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Sign out of Admin Console"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
            <Link
              to="/"
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs"
              title="Return to Main Portal"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                <path d="M19 12H5M5 12l7 7M5 12l7-7" />
              </svg>
              <span className="hidden md:inline">Public Site</span>
            </Link>

            <button
              onClick={() => {
                authApi.logoutAdmin();
                window.location.href = "/login";
              }}
              className="text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 px-3 py-1.5 rounded-xl border border-rose-800/60 transition flex items-center gap-1.5 shadow-2xs cursor-pointer ml-1"
              title="Sign Out of Admin Console"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ─── Sidebar (Fixed side navigation, does not scroll with page) ─── */}
        <aside
          className="bg-slate-950 border-r border-slate-800/90 transition-all duration-300 overflow-y-auto overflow-x-hidden flex flex-col shrink-0 h-full select-none"
          style={{
            width: sidebarOpen ? 240 : 0,
            minWidth: sidebarOpen ? 240 : 0,
          }}
        >
          <div className="p-4 space-y-1.5 min-w-[240px]">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
              <span>Core Operations</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            </div>
            {navItems.map(item => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 border border-amber-500/30 shadow-xs font-bold"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/90 border border-transparent"
                  }`}
                >
                  <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-amber-400" : "text-slate-500 group-hover:text-amber-400"}`}>
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-4 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick stats mini-summary at bottom of sidebar */}
          <div className="mt-auto p-4 border-t border-slate-900 bg-slate-950/80 backdrop-blur-xs min-w-[240px]">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>Operations Live</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="space-y-2 mb-3">
              {statCards.map(s => (
                <div key={s.label} className="flex items-center justify-between text-[11px] py-0.5 group">
                  <span className="text-slate-400 group-hover:text-slate-300 transition-colors flex items-center gap-1.5">
                    <span className="text-xs">{s.icon}</span>
                    <span>{s.label}</span>
                  </span>
                  <span className="font-bold font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                    {statsLoading ? "…" : s.value}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-950/30 hover:bg-rose-900/60 border border-rose-900/50 hover:border-rose-700 transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out Console</span>
            </button>
          </div>
        </aside>

        {/* ─── Main Content Canvas (Scrolls independently) ─── */}
        <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
          {/* KPI stat cards banner (scrolls naturally with page content) */}
          <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-7xl mx-auto">
              {statCards.map(s => (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.topColor}`} />
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      {s.label}
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-sm shadow-2xs group-hover:scale-110 transition-transform">
                      {s.icon}
                    </span>
                  </div>
                  <div className={`text-2xl sm:text-3xl font-black font-mono ${s.accent} tracking-tight`}>
                    {statsLoading ? (
                      <span className="inline-block w-10 h-7 bg-slate-100 rounded-lg animate-pulse" />
                    ) : (
                      s.value
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                    {s.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Page main content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 pb-4 border-b border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <span>Admin Console</span>
                <span>•</span>
                <span className="text-amber-600 font-bold">Operations Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">{subtitle}</p>
              )}
            </div>
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-semibold text-slate-700">LegalEase Administration Console</span>
                <span className="text-slate-300">•</span>
                <span>Documentation & Clerk Management</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                ASP.NET Core 9 • LangGraph Agentic AI
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
