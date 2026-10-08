import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/apiClient";

// ─── Customer session management ─────────────────────────────────────────────

const CUSTOMER_KEY = "legalease_customer_user";

export interface CustomerUser {
  userId: number;
  name: string;
  email: string;
  role: string;
}

export const customerAuth = {
  getUser: (): CustomerUser | null => {
    try {
      const raw = localStorage.getItem(CUSTOMER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: CustomerUser) => localStorage.setItem(CUSTOMER_KEY, JSON.stringify(user)),
  logout: () => localStorage.removeItem(CUSTOMER_KEY),
  isLoggedIn: () => {
    const u = customerAuth.getUser();
    return !!(u && u.role?.toLowerCase() === "customer");
  },
};

// ─── CustomerLoginPage ────────────────────────────────────────────────────────

export const CustomerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerAuth.isLoggedIn()) navigate("/my-requests", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.post<CustomerUser>("/api/auth/login", { email: email.trim(), password });
      const role = res.data.role?.toLowerCase();
      if (role !== "customer") {
        setError("This portal is for customers only. Please use the staff login.");
        return;
      }
      customerAuth.setUser(res.data);
      navigate("/my-requests");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Customer Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to manage your legal service requests</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Staff?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Staff Login →
          </Link>
        </p>
      </div>
    </div>
  );
};
