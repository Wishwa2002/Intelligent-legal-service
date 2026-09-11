import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { documentationApi } from "../../api/documentationApi";

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
];


export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle }) => {
  const location = useLocation();
  const [stats, setStats] = useState<DashboardStats>({ total: 0, pending: 0, assigned: 0, missingDocs: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      color: "from-slate-700 to-slate-800",
      accent: "text-white",
    },
    {
      label: "Pending Review",
      value: stats.pending,
      icon: "⏳",
      color: "from-amber-600 to-amber-700",
      accent: "text-white",
    },
    {
      label: "Assigned",
      value: stats.assigned,
      icon: "✅",
      color: "from-indigo-600 to-indigo-700",
      accent: "text-white",
    },
    {
      label: "Missing Docs",
      value: stats.missingDocs,
      icon: "⚠️",
      color: "from-rose-600 to-rose-700",
      accent: "text-white",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ─── Top Header ─── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 h-14"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Left: logo + toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link to="/" className="flex items-center gap-2">
            <span className="text-base font-serif font-bold tracking-wide text-amber-400">
              LEX<span className="text-white">INTELLIGENCE</span>
            </span>
            <span className="hidden sm:inline text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 uppercase font-mono tracking-wider">
              Admin Console
            </span>
          </Link>
        </div>

        {/* Right: status, back link */}
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Updated{" "}
              {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </span>
            <button
              onClick={loadStats}
              disabled={statsLoading}
              className="ml-1 text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
              aria-label="Refresh stats"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <Link to="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" />
            </svg>
            <span className="hidden sm:inline">Portal</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ─── */}
        <aside
          className="flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 overflow-hidden"
          style={{
            width: sidebarOpen ? 220 : 0,
            minWidth: sidebarOpen ? 220 : 0,
            display: "flex",
          }}
        >
          <div className="p-3 pt-4 space-y-1 min-w-[220px]">
            {navItems.map(item => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group ${
                    isActive
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span className={isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"}>
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1 h-4 rounded-full bg-amber-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Stats mini-panel at bottom of sidebar */}
          <div className="mt-auto p-3 border-t border-slate-800 space-y-2">
            {statCards.map(s => (
              <div key={s.label} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{s.label}</span>
                <span className="font-bold text-slate-300">
                  {statsLoading ? "…" : s.value}
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* KPI stat cards banner */}
          <div className="bg-white border-b border-slate-200 px-6 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-5xl">
              {statCards.map(s => (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 bg-gradient-to-br ${s.color} shadow-sm`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <div className={`text-xl font-bold ${s.accent}`}>
                      {statsLoading ? (
                        <span className="inline-block w-6 h-5 bg-white/20 rounded animate-pulse" />
                      ) : s.value}
                    </div>
                    <div className="text-[10px] text-white/70 font-medium uppercase tracking-wider">
                      {s.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <h1 className="text-2xl font-serif font-bold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
              )}
            </div>
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-3 text-center text-[11px] text-slate-400">
            Intelligent Legal Service Platform • Documentation & Clerk Management System • ASP.NET Core + LangGraph AI
          </footer>
        </div>
      </div>
    </div>
  );
};
