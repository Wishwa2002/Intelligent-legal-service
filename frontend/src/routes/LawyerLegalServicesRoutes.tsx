import { Navigate, Route } from "react-router-dom";
import { LawyersPage } from "../pages/admin/LawyersPage";
import { LawyerLegalServicesLayout } from "../pages/admin/LawyerLegalServicesLayout";
import { SpecializationsPage } from "../pages/admin/SpecializationsPage";
import { LegalServicesPage } from "../pages/admin/LegalServicesPage";
import { LawyerMatchingPage } from "../pages/admin/LawyerMatchingPage";
import { WorkforceHiringPage } from "../features/lawyerServices/aiOperations/pages/WorkforceHiringPage";
import { adminWorkflowRoutes } from "./adminWorkflowRoutes";
import { WorkflowRouteRedirect } from "./WorkflowRouteRedirect";
import { AdminRoute } from "./ProtectedRoutes";

export const lawyerLegalServicesRoutes = <>
  <Route path="/admin/lawyers" element={<AdminRoute><Navigate to="/admin/lawyer-services/lawyers" replace /></AdminRoute>} />
  <Route path="/admin/lawyer-management" element={<AdminRoute><Navigate to="/admin/lawyer-services/lawyers" replace /></AdminRoute>} />
  <Route path="/admin/lawyer-management/new" element={<AdminRoute><Navigate to="/admin/lawyer-services/lawyers" replace /></AdminRoute>} />
  <Route path="/admin/lawyer-management/:id" element={<AdminRoute><Navigate to="/admin/lawyer-services/lawyers" replace /></AdminRoute>} />
  <Route path="/admin/lawyer-management/:id/edit" element={<AdminRoute><Navigate to="/admin/lawyer-services/lawyers" replace /></AdminRoute>} />
  <Route path="/admin/lawyer-management/specializations" element={<AdminRoute><Navigate to="/admin/lawyer-services/specializations" replace /></AdminRoute>} />
  <Route path="/admin/lawyer-management/legal-services" element={<AdminRoute><Navigate to="/admin/lawyer-services/legal-services" replace /></AdminRoute>} />
  <Route path="/admin/lawyer-management/recommendation-test" element={<AdminRoute><WorkflowRouteRedirect to={adminWorkflowRoutes.lawyerMatching} /></AdminRoute>} />
  <Route path={adminWorkflowRoutes.lawyerMatching} element={<AdminRoute><LawyerMatchingPage /></AdminRoute>} />
  <Route path="/admin/lawyer-services/recommendations" element={<AdminRoute><WorkflowRouteRedirect to={adminWorkflowRoutes.lawyerMatching} /></AdminRoute>} />
  <Route path="/admin/lawyer-services/ai-recommendation" element={<AdminRoute><WorkflowRouteRedirect to={adminWorkflowRoutes.lawyerMatching} /></AdminRoute>} />
  <Route path="/admin/lawyer-services/ai-operations" element={<AdminRoute><WorkflowRouteRedirect to={adminWorkflowRoutes.workforceHiring} /></AdminRoute>} />
  <Route path="/admin/lawyer-services" element={<AdminRoute><LawyerLegalServicesLayout /></AdminRoute>}>
    <Route index element={<Navigate to="lawyers" replace />} />
    <Route path="lawyers" element={<LawyersPage />} />
    <Route path="specializations" element={<SpecializationsPage />} />
    <Route path="legal-services" element={<LegalServicesPage />} />
    <Route path="workforce-hiring" element={<WorkforceHiringPage />} />
  </Route>
</>;
