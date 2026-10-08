import { useParams } from "react-router-dom";
import { formatDate } from "./components";
import { DetailBody, DetailLayout, DetailLoadState } from "./DetailShell";
import { useDetail } from "./hooks";
import { legalIntelligenceSource } from "./source";

const CourtCaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data, status, error, retry } = useDetail(legalIntelligenceSource.getCase, id);

  return (
    <DetailLayout>
      {status !== "ready" || !data ? (
        <DetailLoadState status={status} error={error} onRetry={retry} />
      ) : (
        <DetailBody
          meta={[data.court, data.category]}
          title={data.title}
          facts={[
            { label: "Case number", value: data.caseNumber },
            { label: "Court", value: data.court },
            { label: "Decision date", value: formatDate(data.decisionDate) },
            { label: "Outcome", value: data.decision },
          ]}
          summary={data.summary}
          details={data.details}
          sourceName={data.sourceName}
          sourceUrl={data.sourceUrl}
          related={data.related}
        />
      )}
    </DetailLayout>
  );
};

export default CourtCaseDetailPage;
