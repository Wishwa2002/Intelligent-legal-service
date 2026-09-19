import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { StaffLoginPage } from "./pages/StaffLoginPage";
import { DocumentationRequestsPage } from "./pages/admin/document_and_clerk/DocumentationRequestsPage";
import { DocumentationRequestDetailPage } from "./pages/admin/document_and_clerk/DocumentationRequestDetailPage";
import { ClerksPage } from "./pages/admin/document_and_clerk/ClerksPage";
import { DocumentationServicesPage } from "./pages/admin/document_and_clerk/DocumentationServicesPage";
import { CareersPage } from "./pages/admin/CareersPage";
import { ClerkCasesPage } from "./pages/clerk/ClerkCasesPage";
import { CareersPublicPage } from "./pages/public/CareersPublicPage";
import { AdminRoute, ClerkRoute } from "./routes/ProtectedRoutes";
// ── Customer Service Requests (Member 4) ──
import { CustomerLoginPage } from "./pages/customer/CustomerLoginPage";
import { MyServiceRequestsPage } from "./pages/customer/MyServiceRequestsPage";
import { CreateServiceRequestPage } from "./pages/customer/CreateServiceRequestPage";
import { ServiceRequestDetailPage } from "./pages/customer/ServiceRequestDetailPage";
import { AdminServiceRequestsPage } from "./pages/admin/ServiceRequestsAdminPage";


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
        {/* ── Admin: Customer Service Requests (Member 4) ──────────── */}
        <Route
          path="/admin/service-requests"
          element={
            <AdminRoute>
              <AdminServiceRequestsPage />
            </AdminRoute>
          }
        />

        {/* ── Customer Portal (Member 4) ───────────────────────────── */}
        <Route path="/customer/login" element={<CustomerLoginPage />} />
        <Route path="/my-requests" element={<MyServiceRequestsPage />} />
        <Route path="/my-requests/new" element={<CreateServiceRequestPage />} />
        <Route path="/my-requests/:id" element={<ServiceRequestDetailPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;