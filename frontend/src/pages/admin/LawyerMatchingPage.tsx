import { useEffect } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { LawyerRecommendations } from "../../components/lawyers/LawyerRecommendations";

export function LawyerMatchingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "AI Lawyer Matching | LegalEase Admin";
    return () => { document.title = previousTitle; };
  }, []);
  return <AdminLayout title="AI Lawyer Matching"
    subtitle="Assist walk-in clients by matching their legal needs with eligible lawyers and verified appointment availability."
    showStats={false} responsiveNavigation>
    <LawyerRecommendations showHeading={false} />
  </AdminLayout>;
}
