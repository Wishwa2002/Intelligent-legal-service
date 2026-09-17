import React from "react";
import { Navigate } from "react-router-dom";
import { authApi } from "../api/authApi";

/**
 * Requires the user to be logged in as Admin.
 * Clerks and unauthenticated users are redirected to /login.
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (authApi.isAdminAuthenticated()) {
    return <>{children}</>;
  }
  // Clerk is logged in but tried to access admin — send to their own portal
  if (authApi.isClerkAuthenticated()) {
    return <Navigate to="/clerk/cases" replace />;
  }
  return <Navigate to="/login" replace />;
};

/**
 * Requires the user to be logged in as Clerk.
 * Unauthenticated users are redirected to /login.
 */
export const ClerkRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (authApi.isClerkAuthenticated()) {
    return <>{children}</>;
  }
  if (authApi.isAdminAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/login" replace />;
};
