import React from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";

interface LawyerLayoutProps {
  children: React.ReactNode;
}

export const LawyerLayout: React.FC<LawyerLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const currentLawyer = authApi.getCurrentLawyer?.();

  const handleLogout = () => {
    authApi.logoutLawyer?.();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white shadow">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold">
            Lawyer Dashboard
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              {currentLawyer?.name || "Lawyer"}
            </span>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};