import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { StaffLoginPage } from "./pages/StaffLoginPage";
import { DocumentationRequestsPage } from "./pages/admin/document_and_clerk/DocumentationRequestsPage";
import { DocumentationRequestDetailPage } from "./pages/admin/document_and_clerk/DocumentationRequestDetailPage";
import { ClerksPage } from "./pages/admin/document_and_clerk/ClerksPage";
import { DocumentationServicesPage } from "./pages/admin/document_and_clerk/DocumentationServicesPage";
import { CareersPage } from "./pages/admin/CareersPage";
import { ClientsPage } from "./pages/admin/ClientsPage";
import { ClerkCasesPage } from "./pages/clerk/ClerkCasesPage";
import { CareersPublicPage } from "./pages/public/CareersPublicPage";
import { AdminRoute, ClerkRoute } from "./routes/ProtectedRoutes";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/careers" element={<CareersPublicPage />} />
        <Route path="/jobs" element={<CareersPublicPage />} />

        {/* Login — single entry point */}
        <Route path="/login" element={<StaffLoginPage />} />
        <Route path="/staff/login" element={<Navigate to="/login" replace />} />
        <Route path="/clerk/login" element={<Navigate to="/login" replace />} />

        {/* ── Clerk routes (clerk only) ─────────────────────────── */}
        <Route path="/clerk" element={<Navigate to="/clerk/cases" replace />} />
        <Route
          path="/clerk/cases"
          element={
            <ClerkRoute>
              <ClerkCasesPage />
            </ClerkRoute>
          }
        />

        {/* ── Admin routes (admin only) ─────────────────────────── */}
        <Route
          path="/admin"
          element={<Navigate to="/admin/documentation-requests" replace />}
        />
        <Route
          path="/admin/documentation-requests"
          element={
            <AdminRoute>
              <DocumentationRequestsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/documentation-requests/:id"
          element={
            <AdminRoute>
              <DocumentationRequestDetailPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/clerks"
          element={
            <AdminRoute>
              <ClerksPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/clients"
          element={
            <AdminRoute>
              <ClientsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/documentation-services"
          element={
            <AdminRoute>
              <DocumentationServicesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/careers"
          element={
            <AdminRoute>
              <CareersPage />
            </AdminRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;