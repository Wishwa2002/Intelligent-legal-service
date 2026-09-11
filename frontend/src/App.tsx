import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { DocumentationRequestsPage } from "./pages/admin/document_and_clerk/DocumentationRequestsPage";
import { DocumentationRequestDetailPage } from "./pages/admin/document_and_clerk/DocumentationRequestDetailPage";
import { ClerksPage } from "./pages/admin/document_and_clerk/ClerksPage";
import { DocumentationServicesPage } from "./pages/admin/document_and_clerk/DocumentationServicesPage";
import { CareersPage } from "./pages/admin/CareersPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<Navigate to="/admin/documentation-requests" replace />} />
        <Route path="/admin/documentation-requests" element={<DocumentationRequestsPage />} />
        <Route path="/admin/documentation-requests/:id" element={<DocumentationRequestDetailPage />} />
        <Route path="/admin/clerks" element={<ClerksPage />} />
        <Route path="/admin/documentation-services" element={<DocumentationServicesPage />} />
        <Route path="/admin/careers" element={<CareersPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;