import { apiClient } from "./apiClient";

export interface StaffUser {
  userId: number;
  name: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
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
  mustChangePassword?: boolean;
  department?: string;
  contact?: string;
  message?: string;
}

export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
  role: string;
  mustChangePassword?: boolean;

  // Lawyer
  phoneNumber?: string;
  qualification?: string;
  experience?: number;
  licenseNumber?: string;
  profileDescription?: string;

  // Clerk
  department?: string;
  contact?: string;
}

export interface SignupResponse {
  userId?: number;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  contact?: string;
  message?: string;
  token?: string;
}

const STAFF_STORAGE_KEY = "legalease_staff_user";

export const authApi = {
  // ────────────────────────────────────────────────────────────────
  // Login
  // ────────────────────────────────────────────────────────────────
  login: async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {

    authApi.logoutAll();

    const res = await apiClient.post<LoginResponse>(
      "/api/auth/login",
      {
        email,
        password,
      }
    );

    if (res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }

    return res.data;
  },

  // ────────────────────────────────────────────────────────────────
  // Signup
  // ────────────────────────────────────────────────────────────────
  signup: async (
    data: SignupRequest
  ): Promise<SignupResponse> => {
    const res = await apiClient.post<SignupResponse>(
      "/api/auth/signup",
      data
    );

    // Only save token if backend returns one after signup
    if (res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }

    return res.data;
  },

  // ────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────
// Staff session
// ────────────────────────────────────────────────────────────────
getCurrentStaff: (): StaffUser | null => {
  try {
    const data = localStorage.getItem(STAFF_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to read staff session:", error);
    return null;
  }
},

setCurrentStaff: (staff: StaffUser): void => {
  localStorage.setItem(
    STAFF_STORAGE_KEY,
    JSON.stringify(staff)
  );
},

setCurrentClerk: (clerk: StaffUser): void => {
  localStorage.setItem(
    STAFF_STORAGE_KEY,
    JSON.stringify(clerk)
  );
},

setCurrentAdmin: (admin: StaffUser): void => {
  localStorage.setItem(
    STAFF_STORAGE_KEY,
    JSON.stringify(admin)
  );
},

setCurrentLawyer: (lawyer: StaffUser): void => {
  localStorage.setItem(
    STAFF_STORAGE_KEY,
    JSON.stringify(lawyer)
  );
},

getCurrentClerk: (): StaffUser | null => {
  const user = authApi.getCurrentStaff();

  return user?.role?.toLowerCase() === "clerk"
    ? user
    : null;
},

getCurrentAdmin: (): StaffUser | null => {
  const user = authApi.getCurrentStaff();

  return user?.role?.toLowerCase() === "admin"
    ? user
    : null;
},

getCurrentLawyer: (): StaffUser | null => {
  const user = authApi.getCurrentStaff();

  return user?.role?.toLowerCase() === "lawyer"
    ? user
    : null;
},

isClerkAuthenticated: (): boolean => {
  return authApi.getCurrentStaff()?.role?.toLowerCase() === "clerk";
},

isAdminAuthenticated: (): boolean => {
  return authApi.getCurrentStaff()?.role?.toLowerCase() === "admin";
},

isLawyerAuthenticated: (): boolean => {
  return authApi.getCurrentStaff()?.role?.toLowerCase() === "lawyer";
},

isStaffAuthenticated: (): boolean => {
  return authApi.getCurrentStaff() !== null;
},

logoutClerk: (): void => {
  authApi.logoutAll();
},

logoutAdmin: (): void => {
  authApi.logoutAll();
},

logoutLawyer: (): void => {
  authApi.logoutAll();
},

logoutAll: (): void => {
  localStorage.removeItem(STAFF_STORAGE_KEY);
  localStorage.removeItem("token");

  // Clean old keys once
  localStorage.removeItem("legalease_clerk_user");
  localStorage.removeItem("legalease_admin_user");
  localStorage.removeItem("legalease_lawyer_user");
},
};