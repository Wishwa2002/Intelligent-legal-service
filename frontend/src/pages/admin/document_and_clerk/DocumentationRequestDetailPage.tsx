import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { documentationApi, type DocumentationRequest, type DocumentFile } from "../../../api/documentationApi";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import MarkdownText from "../../../components/common/MarkdownText";
import { agentApi, type AgentAnalysisResult, type ChatMessage } from "../../../api/agentApi";
import { clerksApi, type Clerk } from "../../../api/clerksApi";
import { AVAILABLE_SAMPLES } from "../../clerk/ClerkCasesPage";

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string; sm?: boolean }> = ({ status, sm }) => {
  const cfg: Record<string, { cls: string; dot: string }> = {
    PENDING: { cls: "bg-amber-50 text-amber-800 border-amber-200/80", dot: "bg-amber-500" },
    UNDER_REVIEW: { cls: "bg-blue-50 text-blue-800 border-blue-200/80", dot: "bg-blue-500" },
    ASSIGNED: { cls: "bg-indigo-50 text-indigo-800 border-indigo-200/80", dot: "bg-indigo-500" },
    IN_PROGRESS: { cls: "bg-purple-50 text-purple-800 border-purple-200/80", dot: "bg-purple-500 animate-pulse" },
    REQUIRES_DOCUMENTS: { cls: "bg-rose-50 text-rose-800 border-rose-200/80", dot: "bg-rose-500 animate-pulse" },
    COMPLETED: { cls: "bg-emerald-50 text-emerald-800 border-emerald-200/80", dot: "bg-emerald-500" },
    REJECTED: { cls: "bg-slate-100 text-slate-600 border-slate-300", dot: "bg-slate-400" },
    CANCELLED: { cls: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
    ADMIN_APPROVAL_PENDING: { cls: "bg-purple-50 text-purple-800 border-purple-200/80", dot: "bg-purple-500 animate-pulse" },
    HUMAN_REVIEW: { cls: "bg-orange-50 text-orange-800 border-orange-200/80", dot: "bg-orange-500" },
  };
  const item = cfg[status] ?? { cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider ${sm ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"} ${item.cls} shadow-2xs`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{status.replace(/_/g, " ")}</span>
    </span>
  );
};

const PhaseBadge: React.FC<{ phase?: string }> = ({ phase }) => {
  if (!phase) return null;
  const colorMap: Record<string, string> = {
    UNDERSTAND_REQUEST: "bg-slate-700 text-slate-200",
    WAITING_FOR_DOCUMENTS: "bg-amber-700 text-amber-100",
    ANALYZING: "bg-blue-700 text-blue-100",
    DOCUMENTS_COMPLETE: "bg-emerald-700 text-emerald-100",
    ADMIN_APPROVAL_PENDING: "bg-purple-700 text-purple-100",
    COMPLETED: "bg-emerald-700 text-emerald-100",
    HUMAN_REVIEW: "bg-orange-700 text-orange-100",
    ERROR: "bg-rose-700 text-rose-100",
  };
  const cls = colorMap[phase] ?? "bg-slate-700 text-slate-200";
  return (
    <span className={`inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${cls}`}>
      {phase.replace(/_/g, " ")}
    </span>
  );
};

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass?: string;
  variant?: "primary" | "emerald" | "rose" | "amber";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel,
  confirmClass,
  variant = "primary",
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!open) return null;

  const btnBg = confirmClass || (
    variant === "rose" ? "bg-rose-600 hover:bg-rose-700" :
    variant === "emerald" ? "bg-emerald-600 hover:bg-emerald-700" :
    variant === "amber" ? "bg-amber-600 hover:bg-amber-700" :
    "bg-slate-900 hover:bg-slate-800"
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-up">
        <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors shadow flex items-center justify-center gap-2 ${btnBg} disabled:opacity-50`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Analysis Loading Steps ───────────────────────────────
const AI_STEPS = [
  "Connecting to AI agent…",
  "Fetching service requirements…",
  "Auditing submitted documents…",
  "Evaluating document completeness…",
  "Scoring available clerks…",
  "Generating recommendation…",
];

const AnalysisLoader: React.FC = () => {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStepIdx(i => (i + 1) % AI_STEPS.length), 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center py-8 gap-4">
      {/* Orbit spinner */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
        <div className="absolute inset-0 rounded-full border-t-2 border-amber-500 animate-spin" />
        <div className="absolute inset-2 rounded-full border-t-2 border-amber-300 animate-spin" style={{ animationDuration: "0.7s" }} />
        <span className="absolute inset-0 flex items-center justify-center text-lg">🤖</span>
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">AI Agent Reasoning</p>
        <p className="text-sm text-slate-300 mt-1 h-5 transition-all">{AI_STEPS[stepIdx]}</p>
      </div>
      <div className="flex gap-1 mt-1">
        {AI_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 w-6 rounded-full transition-all duration-500 ${i <= stepIdx ? "bg-amber-400" : "bg-slate-600"}`}
          />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export const DocumentationRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<DocumentationRequest | null>(null);
  const [clerks, setClerks] = useState<Clerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion states
  const [deleteRequestConfirm, setDeleteRequestConfirm] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [deleteFileConfirm, setDeleteFileConfirm] = useState<DocumentFile | null>(null);
  const [deletingFile, setDeletingFile] = useState(false);

  // AI analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AgentAnalysisResult | null>(null);
  const [chosenClerkId, setChosenClerkId] = useState<number | string | null>(null);
  const [showReassignMode, setShowReassignMode] = useState(false);
  const [actionToast, setActionToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Approval
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"APPROVE" | "REJECT" | null>(null);

  // Manual clerk assignment
  const [selectedClerkId, setSelectedClerkId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // File upload
  const [uploading, setUploading] = useState(false);

  // Chat history
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatPhase, setChatPhase] = useState<string | undefined>();
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [conversationOpen, setConversationOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Status update
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [reqData, clerksData] = await Promise.all([
        documentationApi.getRequestById(id),
        clerksApi.getAll(),
      ]);
      setRequest(reqData);
      setClerks(clerksData);
      setSelectedClerkId(reqData.assignedClerkId ? String(reqData.assignedClerkId) : "");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load request details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleDeleteRequest = async () => {
    if (!id) return;
    try {
      setDeletingRequest(true);
      await documentationApi.deleteRequest(id);
      navigate("/admin/documentation-requests");
    } catch (err: any) {
      setActionToast({ type: "error", message: err.response?.data?.message || err.message || "Failed to delete request" });
      setDeleteRequestConfirm(false);
    } finally {
      setDeletingRequest(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteFileConfirm) return;
    try {
      setDeletingFile(true);
      await documentationApi.deleteFile(deleteFileConfirm.fileId);
      setActionToast({ type: "success", message: `Document '${deleteFileConfirm.fileName}' deleted successfully.` });
      setDeleteFileConfirm(null);
      await fetchDetails();
    } catch (err: any) {
      setActionToast({ type: "error", message: err.response?.data?.message || err.message || "Failed to delete file" });
    } finally {
      setDeletingFile(false);
    }
  };

  const fetchChatHistory = useCallback(async (requestId: string) => {
    setChatLoading(true);
    setChatError(null);
    try {
      const status = await agentApi.getRequestStatus(requestId);
      const wfId = status.workflow_id;
      if (!wfId) { setChatError("No AI session found for this request."); return; }
      setChatSessionId(wfId);
      const chatData = await agentApi.getChatMessages(wfId);
      setChatMessages(chatData.messages || []);
      setChatPhase(chatData.phase);
      const chatClientName = (chatData as any).client_name || (status as any).client_name;
      if (chatClientName && chatClientName.trim()) {
        setRequest(prev => prev ? { ...prev, customerName: chatClientName.trim() } : prev);
      }
    } catch {
      setChatError("No chat session found for this request.");
    } finally {
      setChatLoading(false);
    }
  }, []);

  // Admin-triggered on-demand AI analysis
  const runAiAnalysis = useCallback(async (req: DocumentationRequest) => {
    try {
      setAnalyzing(true);
      setActionToast(null);
      const objective = `Customer requires ${req.serviceName || req.documentType} processing with ${req.documentFiles?.length || 0} submitted files.`;
      const result = await agentApi.analyzeRequest(req.requestId, req.customerId, objective);
      setAnalysisResult(result);
      if (result?.recommendation?.recommended_clerk?.clerk_id) {
        setChosenClerkId(result.recommendation.recommended_clerk.clerk_id);
      }
      setActionToast({
        type: "success",
        message: "AI analysis and clerk recommendation generated successfully.",
      });
    } catch (err: any) {
      setActionToast({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to complete AI agent analysis. Ensure AI backend service is online.",
      });
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // When request is loaded, fetch chat history (AI analysis runs on-demand via admin button)
  useEffect(() => {
    if (!request) return;
    fetchChatHistory(String(request.requestId));
  }, [request?.requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Resolve active candidate clerk
  const recClerk = analysisResult?.recommendation?.recommended_clerk;
  const activeCandidateId = chosenClerkId ?? recClerk?.clerk_id ?? request?.assignedClerkId ?? selectedClerkId;
  const targetClerk = activeCandidateId
    ? clerks.find(c => String(c.clerkId) === String(activeCandidateId))
    : (recClerk
        ? clerks.find(c =>
            (recClerk.clerk_id && String(c.clerkId) === String(recClerk.clerk_id)) ||
            (recClerk.clerk_name && c.fullName.toLowerCase().trim() === recClerk.clerk_name.toLowerCase().trim())
          )
        : clerks[0]);

  const handleApprovalDecision = async (decision: "APPROVE" | "REJECT") => {
    if (!request) return;
    try {
      setApprovalSubmitting(true);
      setActionToast(null);
      const wfId = analysisResult?.workflow_id ?? (analysisResult as any)?.workflowId;

      if (decision === "APPROVE") {
        const clerkToAssign = targetClerk || clerks[0];
        if (!clerkToAssign) {
          throw new Error("No eligible clerk available to assign. Please select a clerk.");
        }

        // 1. Officially assign clerk on the backend database
        await documentationApi.assignClerk(request.requestId, clerkToAssign.clerkId);

        // 2. Submit approval to AI workflow if active session exists
        if (wfId) {
          try {
            await agentApi.submitApproval(
              wfId,
              "15f92271-e0e6-42d8-bf12-cb4b71db3f05",
              "APPROVE",
              approvalComment
            );
          } catch (aiErr) {
            console.warn("AI workflow approve synchronization warning:", aiErr);
          }
        }

        // 3. Immediately update UI state
        setRequest(prev => prev ? {
          ...prev,
          status: "ASSIGNED",
          assignedClerkId: String(clerkToAssign.clerkId),
          assignedClerkName: clerkToAssign.fullName,
        } : null);
        setSelectedClerkId(String(clerkToAssign.clerkId));
        setShowReassignMode(false);
        setActionToast({
          type: "success",
          message: `Request #${request.requestId} approved and officially assigned to ${clerkToAssign.fullName}!`,
        });

        // 4. Refresh backend data and chat history
        await fetchDetails();
        await fetchChatHistory(String(request.requestId));
      } else {
        // Rejection path
        if (wfId) {
          try {
            await agentApi.submitApproval(
              wfId,
              "15f92271-e0e6-42d8-bf12-cb4b71db3f05",
              "REJECT",
              approvalComment
            );
          } catch (aiErr) {
            console.warn("AI workflow reject synchronization warning:", aiErr);
          }
        }

        try {
          await documentationApi.updateStatus(String(request.requestId), "REQUIRES_DOCUMENTS");
          setRequest(prev => prev ? { ...prev, status: "REQUIRES_DOCUMENTS" } : null);
        } catch {
          // ignore status update error
        }

        setActionToast({
          type: "success",
          message: `Clerk proposal rejected. Status set to Requires Documents.`,
        });

        await fetchDetails();
        await fetchChatHistory(String(request.requestId));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to submit approval decision";
      setActionToast({ type: "error", message: msg });
    } finally {
      setApprovalSubmitting(false);
      setPendingDecision(null);
    }
  };

  const handleManualAssign = async () => {
    if (!request || !selectedClerkId) return;
    try {
      setAssigning(true);
      setActionToast(null);
      await documentationApi.assignClerk(request.requestId, selectedClerkId);
      const assigned = clerks.find(c => String(c.clerkId) === String(selectedClerkId));
      setRequest(prev => prev ? {
        ...prev,
        status: "ASSIGNED",
        assignedClerkId: String(selectedClerkId),
        assignedClerkName: assigned ? assigned.fullName : prev.assignedClerkName,
      } : null);
      setActionToast({
        type: "success",
        message: `Clerk updated successfully to ${assigned?.fullName || selectedClerkId}!`,
      });
      setShowReassignMode(false);
      await fetchDetails();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to assign clerk";
      setActionToast({ type: "error", message: msg });
    } finally {
      setAssigning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !request) return;
    try {
      setUploading(true);
      await documentationApi.uploadFile(request.requestId, file);
      await fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "File upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!request) return;
    try {
      setStatusUpdating(true);
      await documentationApi.updateStatus(request.requestId, newStatus);
      await fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Ask client to upload document state
  const [askUploadModalOpen, setAskUploadModalOpen] = useState(false);
  const [askDocName, setAskDocName] = useState("");
  const [askDocNote, setAskDocNote] = useState("");
  const [askFileId, setAskFileId] = useState<string | undefined>(undefined);
  const [askSubmitting, setAskSubmitting] = useState(false);

  const openAskModal = (docName: string, fileId?: string) => {
    setAskDocName(docName);
    setAskFileId(fileId);
    setAskDocNote("");
    setAskUploadModalOpen(true);
  };

  const handleSendAskUpload = async () => {
    if (!request || !askDocName) return;
    try {
      setAskSubmitting(true);
      const updated = await documentationApi.requestDocumentReupload(
        request.requestId,
        askDocName,
        askDocNote,
        askFileId
      );
      setRequest(updated);
      setAskUploadModalOpen(false);
      setActionToast({
        type: "success",
        message: `Upload request for "${askDocName}" sent to client! Status updated to REQUIRES_DOCUMENTS.`,
      });
      await fetchDetails();
    } catch (err: any) {
      setActionToast({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to submit document upload request.",
      });
    } finally {
      setAskSubmitting(false);
    }
  };

  // Sample document upload state
  const [samplePickerOpen, setSamplePickerOpen] = useState(false);
  const [sampleUploading, setSampleUploading] = useState(false);

  const handleUploadSample = async (sampleFileName: string) => {
    if (!request) return;
    try {
      setSampleUploading(true);
      await documentationApi.uploadSampleFile(request.requestId, sampleFileName);
      setSamplePickerOpen(false);
      setActionToast({
        type: "success",
        message: `Sample document "${sampleFileName}" attached successfully!`,
      });
      await fetchDetails();
    } catch (err: any) {
      setActionToast({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to upload sample document.",
      });
    } finally {
      setSampleUploading(false);
    }
  };

  const handleQuickUploadMatchingSample = async (docName: string) => {
    const clean = docName.toLowerCase();
    let sample = "Amendment_Request_Letter.pdf";
    if (clean.includes("nic") || clean.includes("identity") || clean.includes("passport")) sample = "NIC_Copy.pdf";
    else if (clean.includes("rent") || clean.includes("lease") || clean.includes("tenancy")) sample = "Tenancy_Agreement.pdf";
    else if (clean.includes("contract") || clean.includes("agreement") || clean.includes("business")) sample = "Original_Contract.pdf";
    else if (clean.includes("affidavit") || clean.includes("statement")) sample = "Completed_Affidavit_Draft.pdf";
    else if (clean.includes("deed") || clean.includes("asset") || clean.includes("title") || clean.includes("property")) sample = "Asset_Ownership_Proof.pdf";
    else if (clean.includes("attorney") || clean.includes("poa")) sample = "Power_of_Attorney_Draft.pdf";
    else if (clean.includes("will") || clean.includes("testament")) sample = "Draft_Will_Agreement.pdf";
    else if (clean.includes("witness")) sample = "Witness_Details.pdf";

    await handleUploadSample(sample);
  };

  // ── Loading / Error states ──
  if (loading) {
    return (
      <AdminLayout title="Documentation Request Details">
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading request details…</span>
        </div>
      </AdminLayout>
    );
  }

  if (error || !request) {
    return (
      <AdminLayout title="Documentation Request Details">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg mb-6 text-sm">
          {error || "Request not found"}
        </div>
        <Link to="/admin/documentation-requests" className="text-amber-600 font-medium text-sm">
          ← Back to Documentation Requests
        </Link>
      </AdminLayout>
    );
  }

  const isDocumentReceived = (docName: string) => {
    if (!request) return false;
    // 1. Backend calculated missing list (empty means all received)
    if (request.missingDocuments && !request.missingDocuments.includes(docName)) return true;
    
    // 2. AI Recommendation verdict
    if (docVerdicts[docName] === "accepted") return true;

    // 3. If valid uploaded files count meets or exceeds required count, all required docs are satisfied
    const validFiles = (request.documentFiles || []).filter(f => f.documentStatus?.toLowerCase() !== "rejected");
    if (validFiles.length >= request.requiredDocuments.length && validFiles.length > 0) return true;

    // 4. Filename semantic matching
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const target = clean(docName);
    return validFiles.some(f => {
      const fc = clean(f.fileName);
      return fc === target || fc.includes(target) || target.includes(fc);
    });
  };

  const missingCount = request.requiredDocuments.filter(d => !isDocumentReceived(d)).length;

  // AI doc verdicts from recommendation
  const docVerdicts: Record<string, string> = {};
  if (analysisResult?.recommendation) {
    const { submitted_documents = [], missing_documents = [] } = analysisResult.recommendation;
    request.requiredDocuments.forEach(doc => {
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const dc = clean(doc);
      const isSubmitted = submitted_documents.some(sd => clean(sd).includes(dc) || dc.includes(clean(sd)));
      const isMissing = missing_documents.some(md => clean(md).includes(dc) || dc.includes(clean(md)));
      if (isSubmitted && !isMissing) docVerdicts[doc] = "accepted";
      else if (isMissing) docVerdicts[doc] = "missing";
      else docVerdicts[doc] = "unknown";
    });
  }

  const altClerks = analysisResult?.recommendation?.alternative_clerks ?? [];

  return (
    <>
      <ConfirmModal
        open={pendingDecision === "APPROVE"}
        title="Confirm Clerk Approval & Assignment"
        message={`Approve this request and officially assign ${targetClerk ? `"${targetClerk.fullName}" (${targetClerk.department})` : "the selected clerk"}? This will update the legal services database.`}
        confirmLabel="Yes, Approve & Assign"
        variant="emerald"
        loading={approvalSubmitting}
        onConfirm={() => handleApprovalDecision("APPROVE")}
        onCancel={() => setPendingDecision(null)}
      />
      <ConfirmModal
        open={pendingDecision === "REJECT"}
        title="Confirm Clerk Rejection"
        message="Reject this clerk proposal? The request status will be updated to REQUIRES_DOCUMENTS and the AI agent will re-evaluate alternative staff."
        confirmLabel="Yes, Reject Proposal"
        variant="rose"
        loading={approvalSubmitting}
        onConfirm={() => handleApprovalDecision("REJECT")}
        onCancel={() => setPendingDecision(null)}
      />

      <AdminLayout
        title={`Request: ${request.serviceName || request.documentType}`}
        subtitle={`Customer: ${request.customerName || "Online Client"} • ID: #${request.requestId} • ${new Date(request.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`}
      >
        {/* Action Toast Feedback */}
        {actionToast && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm border transition-all ${
              actionToast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-current">
                {actionToast.type === "success" ? "✓" : "!"}
              </span>
              <span className="leading-normal">{actionToast.message}</span>
            </div>
            <button
              onClick={() => setActionToast(null)}
              className="text-slate-400 hover:text-slate-700 font-bold text-base px-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Back link & Top Actions */}
        <div className="mb-5 flex items-center justify-between">
          <Link
            to="/admin/documentation-requests"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" />
            </svg>
            All Requests
          </Link>

          <button
            type="button"
            onClick={() => setDeleteRequestConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 px-3 py-1.5 rounded-xl border border-rose-200 hover:border-rose-600 transition-all shadow-2xs cursor-pointer"
            title="Delete this documentation request"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Delete Request</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT (2 cols) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Status Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-slate-100 mb-5">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Current Status</span>
                  <StatusBadge status={request.status} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Change:</span>
                  <select
                    value={request.status}
                    onChange={e => handleUpdateStatus(e.target.value)}
                    disabled={statusUpdating}
                    className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                  >
                    {["PENDING", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "REQUIRES_DOCUMENTS", "COMPLETED", "REJECTED", "CANCELLED"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {statusUpdating && <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Service</span>
                  <span className="text-slate-800 font-bold">{request.serviceName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Document Type</span>
                  <span className="text-slate-800 font-bold">{request.documentType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Submitted</span>
                  <span className="text-slate-800 font-bold">
                    {new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="text-slate-500 block font-mono text-[10px]">
                    {new Date(request.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Assigned Clerk</span>
                  <span className={`font-bold flex items-center gap-1 ${request.assignedClerkName ? "text-emerald-700" : "text-amber-600"}`}>
                    {request.assignedClerkName ? `👤 ${request.assignedClerkName}` : "⏳ Unassigned"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Active Re-upload Request Banner ── */}
            {request.reuploadNote && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
                <span className="text-xl">📢</span>
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 block">
                    Active Re-upload Request Sent to Client
                  </span>
                  <p className="mt-0.5 font-medium text-amber-950 text-sm leading-relaxed">{request.reuploadNote}</p>
                </div>
              </div>
            )}

            {/* ── Document Audit Checklist ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Required Documents Audit</h3>
                {missingCount === 0 ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ✓ All Documents Provided
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                    ⚠ {missingCount} Missing
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {request.requiredDocuments.length === 0 ? (
                  <p className="text-xs text-slate-400">No required documents template configured for this service.</p>
                ) : (
                  request.requiredDocuments.map((doc, idx) => {
                    const received = isDocumentReceived(doc);
                    const verdict = docVerdicts[doc];
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border text-xs font-medium transition-colors gap-2 ${
                          !received
                            ? "bg-rose-50/50 border-rose-200 text-rose-800"
                            : "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1">
                          <span className="text-sm">{received ? "✅" : "❌"}</span>
                          <span className="font-semibold">{doc}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {verdict && analysisResult && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              verdict === "accepted" ? "bg-emerald-100 text-emerald-700" :
                              verdict === "missing" ? "bg-rose-100 text-rose-700" :
                              "bg-slate-100 text-slate-500"
                            }`}>
                              AI: {verdict}
                            </span>
                          )}
                          <span className="text-[11px] font-bold uppercase tracking-wider">
                            {received ? "Received" : "Missing"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickUploadMatchingSample(doc)}
                            disabled={sampleUploading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition shadow-xs"
                          >
                            <span>📄</span>
                            <span>Attach Sample</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openAskModal(doc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg transition shadow-xs ml-1"
                          >
                            <span>📨</span>
                            <span>Ask to upload this document</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Uploaded Files ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Uploaded Files <span className="text-slate-400 font-normal normal-case">({request.documentFiles.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSamplePickerOpen(true)}
                    disabled={sampleUploading}
                    className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm"
                  >
                    <span>📄</span>
                    <span>Use Sample Document</span>
                  </button>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                    {uploading ? (
                      <>
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Document
                      </>
                    )}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                  </label>
                </div>
              </div>

              {request.documentFiles.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-400">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {request.documentFiles.map(file => (
                    <div key={file.fileId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-xs gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{file.contentType?.includes("pdf") ? "📕" : "🖼️"}</span>
                        <div>
                          <div className="font-semibold text-slate-900">{file.fileName}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {(file.fileSize / 1024).toFixed(1)} KB • {new Date(file.uploadDate).toLocaleDateString()}
                          </div>
                          {file.rejectReason && (
                            <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
                              Reason: {file.rejectReason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase border ${
                          file.documentStatus === "Accepted"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : file.documentStatus === "Rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>
                          {file.documentStatus}
                        </span>
                        <a
                          href={documentationApi.getDownloadUrl(file.fileId)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-700 font-bold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors text-[11px]"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          onClick={() => openAskModal(file.fileName, file.fileId)}
                          className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>⚠️</span>
                          <span>Ask re-upload</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteFileConfirm(file)}
                          className="text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          title="Delete this document file"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COL ── */}
          <div className="space-y-6">

            {/* ── AI Agent Panel ── */}
            <div
              className="rounded-2xl border border-amber-500/30 p-5 shadow-lg relative overflow-hidden"
              style={{ background: "linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}
            >
              {/* Ambient glow */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-lg">🤖</span>
                  <h3 className="font-bold text-amber-400 tracking-wide text-sm">Agentic AI Assistant</h3>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Gemini + LangGraph
                </span>
              </div>

              {analyzing ? (
                <AnalysisLoader />
              ) : request.status === "ASSIGNED" && !showReassignMode ? (
                /* ── ALREADY ASSIGNED STATE ── */
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-950/40 rounded-xl p-4 border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                        <span>✓</span> Request Assigned
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Official
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {request.assignedClerkName || (targetClerk ? targetClerk.fullName : "Legal Clerk")}
                    </div>
                    <div className="text-slate-400 mt-0.5 text-[11px]">
                      {targetClerk?.department || "Legal Services Department"}
                    </div>
                    <p className="mt-3 text-[11px] text-slate-300 leading-relaxed border-t border-slate-700/60 pt-2.5">
                      This request has been authorized and officially assigned. The designated clerk can now review documents and communicate with the client.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowReassignMode(true)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs py-2.5 px-4 rounded-xl border border-amber-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span>⇄</span> Re-assign or Change Clerk
                  </button>

                  <button
                    onClick={() => runAiAnalysis(request)}
                    className="w-full text-[10px] text-slate-500 hover:text-slate-300 transition-colors py-1 text-center"
                  >
                    ↻ Re-run AI Analysis
                  </button>
                </div>
              ) : analysisResult ? (
                <div className="space-y-4 text-xs">
                  {showReassignMode && (
                    <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 text-amber-300">
                      <span className="text-[11px] font-semibold">Re-assigning Clerk</span>
                      <button
                        onClick={() => setShowReassignMode(false)}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Recommended Clerk */}
                  {analysisResult.recommendation?.recommended_clerk && (() => {
                    const rec = analysisResult.recommendation.recommended_clerk;
                    const isSelected = String(targetClerk?.clerkId) === String(rec.clerk_id);
                    return (
                      <div
                        onClick={() => setChosenClerkId(rec.clerk_id)}
                        className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                            : "bg-slate-800/70 border-slate-700/60 hover:border-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span>✦</span> AI Recommended Clerk
                          </div>
                          {isSelected && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-white flex items-center justify-between">
                          <span>{rec.clerk_name}</span>
                          <span className="text-amber-400 text-base font-extrabold">
                            {(rec.matching_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-slate-400 mt-0.5 text-[11px]">
                          {rec.department}
                        </div>
                        <div className="mt-2.5">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Active Workload</span>
                            <span>{rec.current_workload} / {rec.max_workload || 10} tasks</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-400 h-1.5 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (rec.current_workload / (rec.max_workload || 10)) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                        <p className="mt-2.5 text-[11px] text-slate-400 italic border-t border-slate-700/60 pt-2 leading-relaxed">
                          "{rec.selection_reasoning}"
                        </p>
                      </div>
                    );
                  })()}

                  {/* Alternative Clerks (Interactive & Selectable) */}
                  {altClerks.length > 0 && (
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                        Alternative Options (Click to select)
                      </div>
                      <div className="space-y-2">
                        {altClerks.slice(0, 3).map((c, i) => {
                          const isSelected = String(targetClerk?.clerkId) === String(c.clerk_id);
                          return (
                            <div
                              key={i}
                              onClick={() => setChosenClerkId(c.clerk_id)}
                              className={`rounded-lg p-2.5 border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-amber-500/10 border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                                  : "bg-slate-800/50 border-slate-700/50 hover:border-slate-500"
                              }`}
                            >
                              <div>
                                <div className="text-slate-200 font-semibold text-[11px] flex items-center gap-1.5">
                                  <span>{c.clerk_name}</span>
                                  {isSelected && (
                                    <span className="text-[9px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded">
                                      ✓ Selected
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 text-[10px]">{c.department}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-amber-400 font-bold text-[11px]">
                                  {(c.matching_score * 100).toFixed(0)}%
                                </div>
                                <div className="text-slate-500 text-[10px]">{c.current_workload} tasks</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected Target Summary */}
                  {targetClerk && (
                    <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Assigning to</div>
                        <div className="text-xs font-bold text-white">{targetClerk.fullName}</div>
                      </div>
                      <div className="text-[10px] text-amber-400 font-mono bg-amber-400/10 px-2 py-1 rounded">
                        {targetClerk.department}
                      </div>
                    </div>
                  )}

                  {/* Approval Buttons */}
                  <div className="pt-1 space-y-3">
                    <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      Human Authorization:
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Admin review comments (optional)…"
                      value={approvalComment}
                      onChange={e => setApprovalComment(e.target.value)}
                      className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPendingDecision("APPROVE")}
                        disabled={approvalSubmitting || !targetClerk}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <span>✓</span> {showReassignMode ? "Update & Assign" : "Approve & Assign"}
                      </button>
                      <button
                        onClick={() => setPendingDecision("REJECT")}
                        disabled={approvalSubmitting}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <span>✕</span> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
                    🤖
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">AI Audit on Demand</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                      Run automated document verification, missing items audit, and AI clerk recommendation when needed.
                    </p>
                  </div>
                  <button
                    onClick={() => runAiAnalysis(request)}
                    disabled={analyzing}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>⚡</span> Run AI Documentation Agent
                  </button>
                </div>
              )}

              {/* Retry */}
              {!analyzing && analysisResult && (
                <button
                  onClick={() => runAiAnalysis(request)}
                  className="mt-3 w-full text-[10px] text-slate-500 hover:text-slate-300 transition-colors py-1"
                >
                  ↻ Re-run analysis
                </button>
              )}
            </div>

            {/* ── Manual Clerk Assignment ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Manual Clerk Assignment</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 font-semibold mb-1.5">Select Clerk</label>
                  <select
                    value={selectedClerkId}
                    onChange={e => setSelectedClerkId(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">— Select Clerk —</option>
                    {clerks.filter(c => c.isActive).map(c => (
                      <option key={c.clerkId} value={String(c.clerkId)}>
                        {c.fullName} ({c.department}) — {c.activeAssignmentsCount} active
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleManualAssign}
                  disabled={assigning || !selectedClerkId}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                >
                  {assigning ? (
                    <><div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" /> Assigning…</>
                  ) : "Update Clerk Assignment"}
                </button>
              </div>
            </div>

            {/* ── Workflow Audit Timeline ── */}
            {analysisResult?.execution_summary && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">AI Workflow Summary</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Final AI Phase</span>
                    <PhaseBadge phase={analysisResult.execution_summary.final_status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service Identified</span>
                    <span className="font-semibold text-slate-800">{analysisResult.execution_summary.service_identified || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recommended Clerk</span>
                    <span className="font-semibold text-slate-800">{analysisResult.execution_summary.clerk_assigned_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total AI Steps</span>
                    <span className="font-semibold text-slate-800">{analysisResult.execution_summary.total_steps}</span>
                  </div>
                  {analysisResult.execution_summary.audit_notes && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 italic leading-relaxed">
                      {analysisResult.execution_summary.audit_notes}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Full-Width Chat History (Collapsible Dropdown Accordion) ── */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          {/* Collapsible Dropdown Header */}
          <div
            onClick={() => setConversationOpen(prev => !prev)}
            className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 cursor-pointer select-none group transition-colors"
            style={{ background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                💬
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-amber-300 transition-colors">
                    Client Conversation History
                  </h3>
                  <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                    {conversationOpen ? "Collapse ▲" : "Drop-down ▼"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-400">
                    {chatMessages.length > 0 ? `${chatMessages.length} messages logged` : "Client & AI chat session"}
                  </span>
                  {chatSessionId && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Session: {chatSessionId.substring(0, 8)}…
                      </span>
                    </>
                  )}
                  {chatPhase && <PhaseBadge phase={chatPhase} />}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {chatMessages.length > 0 && (
                <span className="text-[11px] font-semibold bg-slate-800 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full">
                  {chatMessages.length} messages
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  request?.requestId && fetchChatHistory(String(request.requestId));
                }}
                disabled={chatLoading}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                title="Refresh conversation transcript"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3 h-3 ${chatLoading ? "animate-spin" : ""}`}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span className="hidden sm:inline">{chatLoading ? "Refreshing…" : "Refresh"}</span>
              </button>

              {/* Chevron icon button */}
              <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 group-hover:text-amber-300 transition-colors">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-4 h-4 transition-transform duration-200 ${conversationOpen ? "rotate-180 text-amber-400" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {/* Collapsible Dropdown Body */}
          {conversationOpen && (
            <div className="p-6 animate-in fade-in duration-150">
              {chatLoading && (
                <div className="flex items-center justify-center py-10 gap-3">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-slate-400">Loading conversation…</span>
                </div>
              )}

              {!chatLoading && chatError && (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <span className="text-4xl">🔍</span>
                  <p className="text-sm font-semibold text-slate-600">No Chat Session Found</p>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                    {chatError} This request may have been created manually without an AI chat session.
                  </p>
                </div>
              )}

              {!chatLoading && !chatError && chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <span className="text-4xl">💭</span>
                  <p className="text-sm font-semibold text-slate-600">No Messages Yet</p>
                  <p className="text-xs text-slate-400">The client has not started a chat conversation for this request.</p>
                </div>
              )}

              {!chatLoading && !chatError && chatMessages.length > 0 && (
                <div className="space-y-5 max-h-[560px] overflow-y-auto pr-2 scrollbar-thin">
                  {chatMessages.map((msg, idx) => {
                    const isAgent = msg.role === "agent";
                    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
                    const date = new Date(msg.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });

                    return (
                      <div key={idx} className={`flex items-end gap-3 ${isAgent ? "flex-row" : "flex-row-reverse"}`}>
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow ${
                          isAgent
                            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900"
                            : "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
                        }`}>
                          {isAgent ? "🤖" : "👤"}
                        </div>

                        {/* Bubble */}
                        <div className="max-w-[75%]">
                          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                            isAgent
                              ? "bg-slate-50 text-slate-800 rounded-bl-sm border border-slate-200"
                              : "bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-br-sm"
                          }`}>
                            {isAgent ? (
                              <MarkdownText content={msg.content} className={isAgent ? "text-slate-800" : "text-white"} />
                            ) : (
                              <p className="text-xs leading-relaxed">{msg.content}</p>
                            )}
                          </div>
                          <div className={`text-[10px] text-slate-400 mt-1 px-1 ${isAgent ? "text-left" : "text-right"}`}>
                            <span className="font-semibold">{isAgent ? "AI Agent" : "Client"}</span>
                            {" · "}{date} {time}
                          </div>
                        </div>
                      </div>
                  );
                })}
                {/* Auto-scroll anchor */}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        )}
      </div>

        {/* Ask Client to Upload / Re-upload Modal */}
        {askUploadModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📨</span>
                  <h3 className="text-sm font-bold text-white">Ask Client to Upload Document</h3>
                </div>
                <button
                  onClick={() => setAskUploadModalOpen(false)}
                  disabled={askSubmitting}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Document Requested
                  </label>
                  <input
                    type="text"
                    value={askDocName}
                    onChange={(e) => setAskDocName(e.target.value)}
                    placeholder="e.g. National Identity Card (NIC)"
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Instructions / Reason for Client <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={askDocNote}
                    onChange={(e) => setAskDocNote(e.target.value)}
                    placeholder="e.g. The previous photo was blurry or missing page 2. Please upload a clear, full-page scanned copy."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 leading-relaxed"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
                  ℹ️ When submitted, the client's request page on their mobile app will show this alert banner, and the case status will be set to <strong>REQUIRES_DOCUMENTS</strong> so they can upload immediately.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAskUploadModalOpen(false)}
                    disabled={askSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendAskUpload}
                    disabled={askSubmitting || !askDocName.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {askSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <span>📨</span>
                        <span>Send Request to Client</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Sample Document Picker Modal */}
        {samplePickerOpen && request && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Use Verified Sample Document</h3>
                    <p className="text-[11px] text-slate-400">Select a pre-formatted legal document to attach to this case</p>
                  </div>
                </div>
                <button
                  onClick={() => setSamplePickerOpen(false)}
                  disabled={sampleUploading}
                  className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                <p className="text-xs text-slate-600 mb-3">
                  Click any sample document below to attach it immediately to Case #{request.requestId}. The backend will register and verify it as an official legal document file.
                </p>
                {AVAILABLE_SAMPLES.map((sample) => (
                  <div
                    key={sample.name}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition bg-white group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 rounded-lg bg-slate-100 group-hover:bg-amber-100 transition">
                        {sample.icon}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{sample.title}</div>
                        <div className="text-[11px] text-slate-500">{sample.desc}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sample.name}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={sampleUploading}
                      onClick={() => handleUploadSample(sample.name)}
                      className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-xs transition shrink-0 flex items-center gap-1 disabled:opacity-50"
                    >
                      {sampleUploading ? (
                        <div className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>+ Attach</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>9 standard legal templates available</span>
                <button
                  type="button"
                  onClick={() => setSamplePickerOpen(false)}
                  disabled={sampleUploading}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Request Confirm Modal */}
        <ConfirmModal
          open={deleteRequestConfirm}
          title="Delete Documentation Request?"
          message={`Are you sure you want to permanently delete Request #${request?.requestId}? All uploaded documents, AI verification audits, and case logs will be permanently deleted.`}
          confirmLabel="Yes, Delete Request"
          variant="rose"
          loading={deletingRequest}
          onConfirm={handleDeleteRequest}
          onCancel={() => setDeleteRequestConfirm(false)}
        />

        {/* Delete File Confirm Modal */}
        <ConfirmModal
          open={!!deleteFileConfirm}
          title="Delete Document File?"
          message={`Are you sure you want to delete '${deleteFileConfirm?.fileName}'? This file will be permanently removed from this request and disk storage.`}
          confirmLabel="Yes, Delete File"
          variant="rose"
          loading={deletingFile}
          onConfirm={handleDeleteFile}
          onCancel={() => setDeleteFileConfirm(null)}
        />
      </AdminLayout>
    </>
  );
};
