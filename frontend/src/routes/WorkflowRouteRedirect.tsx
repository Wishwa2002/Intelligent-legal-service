import { Navigate, useLocation } from "react-router-dom";

export function WorkflowRouteRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}
