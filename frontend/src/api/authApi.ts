import { apiClient } from "./apiClient";

export interface ClerkUser {
  userId: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  contact?: string;
  message?: string;
}

export interface LoginResponse {
  token?: string;
  userId: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  contact?: string;
  message?: string;
}

const CLERK_STORAGE_KEY = "legalease_clerk_user";
const ADMIN_STORAGE_KEY = "legalease_admin_user";

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>("/api/auth/login", { email, password });
    if (res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }
    return res.data;
  },

  // ── Clerk session ────────────────────────────────────────────────
  getCurrentClerk: (): ClerkUser | null => {
    try {
      const data = localStorage.getItem(CLERK_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setCurrentClerk: (clerk: ClerkUser): void => {
    localStorage.setItem(CLERK_STORAGE_KEY, JSON.stringify(clerk));
  },
  logoutClerk: (): void => {
    localStorage.removeItem(CLERK_STORAGE_KEY);
    localStorage.removeItem("token");
  },
  isClerkAuthenticated: (): boolean => {
    const user = authApi.getCurrentClerk();
    return !!(user && user.role?.toLowerCase() === "clerk");
  },

  // ── Admin session ────────────────────────────────────────────────
  getCurrentAdmin: (): ClerkUser | null => {
    try {
      const data = localStorage.getItem(ADMIN_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setCurrentAdmin: (admin: ClerkUser): void => {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
  },
  logoutAdmin: (): void => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem("token");
  },
  isAdminAuthenticated: (): boolean => {
    const user = authApi.getCurrentAdmin();
    return !!(user && user.role?.toLowerCase() === "admin");
  },

  // ── Shared helpers ───────────────────────────────────────────────
  isStaffAuthenticated: (): boolean =>
    authApi.isClerkAuthenticated() || authApi.isAdminAuthenticated(),

  logoutAll: (): void => {
    authApi.logoutClerk();
    authApi.logoutAdmin();
  },
};
