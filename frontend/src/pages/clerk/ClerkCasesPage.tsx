import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkLayout } from "../../components/layout/ClerkLayout";
import { authApi, type ClerkUser } from "../../api/authApi";
import { documentationApi, type DocumentationRequest } from "../../api/documentationApi";
import { agentApi, type ChatMessage } from "../../api/agentApi";

const formatDocId = (id: string | number) => `DMT${String(id).padStart(3, "0")}`;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW: { label: "Under Review", className: "bg-blue-50 text-blue-700 border-blue-200" },
  ASSIGNED: { label: "Assigned", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-purple-50 text-purple-700 border-purple-200" },
  REQUIRES_DOCUMENTS: { label: "Missing Docs", className: "bg-rose-50 text-rose-700 border-rose-200" },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Rejected", className: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

const FILTER_TABS = [
  { value: "", label: "All Cases" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "REQUIRES_DOCUMENTS", label: "Needs Docs" },
  { value: "COMPLETED", label: "Completed" },
];

export const AVAILABLE_SAMPLES = [
  { name: "NIC_Copy.pdf", title: "National Identity Card (NIC)", desc: "Clear scanned copy of Sri Lankan National Identity Card", icon: "🪪" },
  { name: "Tenancy_Agreement.pdf", title: "Rental & Lease Agreement", desc: "Residential / Commercial tenancy contract template", icon: "📜" },
  { name: "Original_Contract.pdf", title: "Commercial Contract Agreement", desc: "Original primary agreement draft for legal review", icon: "📑" },
  { name: "Completed_Affidavit_Draft.pdf", title: "Sworn Affidavit Statement", desc: "Signed and affirmed formal legal affidavit", icon: "⚖️" },
  { name: "Asset_Ownership_Proof.pdf", title: "Asset / Title Deed Proof", desc: "Certified deed and proof of property ownership", icon: "🏡" },
  { name: "Power_of_Attorney_Draft.pdf", title: "Power of Attorney (POA)", desc: "Special / General Power of Attorney document", icon: "✍️" },
  { name: "Draft_Will_Agreement.pdf", title: "Last Will & Testament Draft", desc: "Legal testamentary document and disposition deed", icon: "📜" },
  { name: "Witness_Details.pdf", title: "Witness Identification Details", desc: "Verified details and IDs of attesting witnesses", icon: "👥" },
  { name: "Amendment_Request_Letter.pdf", title: "Formal Amendment Letter", desc: "Official written request specifying contractual amendments", icon: "✉️" },
];

export const ClerkCasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentClerk, setCurrentClerk] = useState<ClerkUser | null>(null);
  const [requests, setRequests] = useState<DocumentationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modal inspection state
  const [selectedCase, setSelectedCase] = useState<DocumentationRequest | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Chat conversation for modal
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Ask to upload document modal state
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
    if (!selectedCase || !askDocName) return;
    try {
      setAskSubmitting(true);
      const updated = await documentationApi.requestDocumentReupload(
        selectedCase.requestId,
        askDocName,
        askDocNote,
        askFileId
      );
      setSelectedCase(updated);
      setRequests((prev) =>
        prev.map((r) => (String(r.requestId) === String(updated.requestId) ? updated : r))
      );
      setAskUploadModalOpen(false);
      setActionMessage({
        text: `Upload request for "${askDocName}" successfully sent to client! Status updated to REQUIRES_DOCUMENTS.`,
        type: "success",
      });
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.message || err.message || "Failed to submit document upload request.",
        type: "error",
      });
    } finally {
      setAskSubmitting(false);
    }
  };

  // Sample documents upload state
  const [samplePickerOpen, setSamplePickerOpen] = useState(false);
  const [sampleUploading, setSampleUploading] = useState(false);

  const handleUploadSample = async (sampleFileName: string) => {
    if (!selectedCase) return;
    try {
      setSampleUploading(true);
      await documentationApi.uploadSampleFile(selectedCase.requestId, sampleFileName);
      const refreshed = await documentationApi.getRequestById(selectedCase.requestId);
      setSelectedCase(refreshed);
      setRequests((prev) =>
        prev.map((r) => (String(r.requestId) === String(refreshed.requestId) ? refreshed : r))
      );
      setSamplePickerOpen(false);
      setActionMessage({
        text: `Sample document "${sampleFileName}" attached successfully!`,
        type: "success",
      });
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.message || err.message || "Failed to upload sample document.",
        type: "error",
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

  // 1. Guard check & clerk session loading
  useEffect(() => {
    const clerk = authApi.getCurrentClerk();
    if (!clerk || clerk.role?.toLowerCase() !== "clerk") {
      navigate("/clerk/login", { replace: true });
      return;
    }
    setCurrentClerk(clerk);
  }, [navigate]);

  // 2. Fetch assigned requests for this clerk
  const fetchAssignedCases = useCallback(async () => {
    const clerk = authApi.getCurrentClerk();
    if (!clerk) return;

    try {
      setLoading(true);
      setError(null);
      // Fetch specifically filtered by clerkId
      const allRequests = await documentationApi.getRequests();
      const myRequests = allRequests.filter(
        (r) => String(r.assignedClerkId) === String(clerk.userId)
      );
      setRequests(myRequests);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load assigned cases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentClerk) {
      fetchAssignedCases();
    }
  }, [currentClerk, fetchAssignedCases]);

  // 3. Load chat conversation when a case is selected
  const handleOpenCaseModal = async (req: DocumentationRequest) => {
    setSelectedCase(req);
    setActionMessage(null);
    setChatMessages([]);
    setChatLoading(true);

    try {
      const statusData = await agentApi.getRequestStatus(req.requestId);
      const wfId = statusData.workflow_id;
      if (wfId) {
        const chatData = await agentApi.getChatMessages(wfId);
        setChatMessages(chatData.messages || []);
      }
    } catch {
      // Chat might not exist for manually seeded requests
    } finally {
      setChatLoading(false);
    }
  };

  // 4. Update status directly from clerk portal
  const handleUpdateStatus = async (requestId: string | number, newStatus: string) => {
    try {
      setStatusUpdating(true);
      setActionMessage(null);
      const strId = String(requestId);
      const updated = await documentationApi.updateStatus(strId, newStatus);
      setSelectedCase(updated);
      setRequests((prev) => prev.map((r) => (String(r.requestId) === strId ? updated : r)));
      setActionMessage({ text: `Case #${strId} status updated to ${newStatus}.`, type: "success" });
    } catch (err: any) {
      setActionMessage({
        text: err.response?.data?.message || err.message || "Failed to update case status.",
        type: "error",
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  // 5. Filtered list
  const filteredCases = useMemo(() => {
    let list = [...requests];
    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.customerName || "").toLowerCase().includes(q) ||
          (r.serviceName || "").toLowerCase().includes(q) ||
          (r.documentType || "").toLowerCase().includes(q) ||
          String(r.requestId).includes(q) ||
          formatDocId(r.requestId).toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, statusFilter, search]);

  // Metrics
  const stats = useMemo(() => {
    const total = requests.length;
    const inProgress = requests.filter((r) => ["IN_PROGRESS", "UNDER_REVIEW"].includes(r.status)).length;
    const completed = requests.filter((r) => r.status === "COMPLETED").length;
    const missingDocs = requests.filter((r) => (r.missingDocuments?.length ?? 0) > 0).length;
    return { total, inProgress, completed, missingDocs };
  }, [requests]);

  if (!currentClerk) {
    return null;
  }

  return (
    <ClerkLayout
      title="My Assigned Cases"
      subtitle={`Welcome back, ${currentClerk.name} (${currentClerk.department || "Legal Operations"}) • Monitor case progress, audit client documents, and update case statuses.`}
      caseCount={requests.length}
    >
      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-600 to-slate-800" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Assigned
            </span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs">📋</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Assigned to your queue</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              In Progress / Review
            </span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs">⚖️</span>
          </div>
          <div className="text-3xl font-extrabold text-purple-900 tracking-tight">{stats.inProgress}</div>
          <div className="text-[11px] text-purple-600 mt-1 font-medium">Active legal workflows</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Completed
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs">✓</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-900 tracking-tight">{stats.completed}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">Successfully closed cases</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Missing Documents
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs">⚠️</span>
          </div>
          <div className="text-3xl font-extrabold text-rose-900 tracking-tight">{stats.missingDocs}</div>
          <div className="text-[11px] text-rose-600 mt-1 font-medium">Awaiting customer uploads</div>
        </div>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by client name, service, case ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-300/80 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white focus:border-amber-500 transition shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-900">{filteredCases.length}</strong> of <strong className="text-slate-900">{requests.length}</strong> cases
            </span>
            <button
              onClick={fetchAssignedCases}
              disabled={loading}
              className="text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Refresh Cases"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2 mt-3.5 pt-3.5 border-t border-slate-100">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.value === ""
                ? requests.length
                : requests.filter((r) => r.status === tab.value).length;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>


      {/* ── Cases List Table ── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading your assigned cases…</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
          <p className="text-sm font-bold">{error}</p>
          <button
            onClick={fetchAssignedCases}
            className="mt-3 px-4 py-1.5 bg-rose-700 text-white text-xs font-bold rounded-lg hover:bg-rose-800"
          >
            Retry
          </button>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <span className="text-4xl block mb-2">📂</span>
          <h3 className="text-base font-bold text-slate-800">No Assigned Cases Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search || statusFilter
              ? "No cases matched your search or status filter. Try clearing your filters."
              : "You do not have any cases assigned to you currently. New assignments from admin approvals will appear here."}
          </p>
          {(search || statusFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("");
              }}
              className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Case ID</th>
                  <th className="px-5 py-3.5">Customer / Client</th>
                  <th className="px-5 py-3.5">Legal Service</th>
                  <th className="px-5 py-3.5">Submitted</th>
                  <th className="px-5 py-3.5">Documents</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((req) => {
                  const missingCount = req.missingDocuments?.length ?? 0;
                  const fileCount = req.documentFiles?.length ?? 0;
                  const statusCfg = STATUS_CONFIG[req.status] || {
                    label: req.status,
                    className: "bg-slate-100 text-slate-600 border-slate-200",
                  };

                  return (
                    <tr
                      key={req.requestId}
                      className="hover:bg-amber-50/50 transition-colors group cursor-pointer border-b border-slate-100 last:border-0"
                      onClick={() => handleOpenCaseModal(req)}
                    >
                      {/* Case ID */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-900 text-amber-400 border border-slate-800 shadow-2xs">
                          {formatDocId(req.requestId)}
                        </span>
                      </td>

                      {/* Customer Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                            {req.customerName ? req.customerName[0].toUpperCase() : "C"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs group-hover:text-amber-950 transition-colors">
                              {req.customerName || "Customer"}
                            </div>
                            <div className="text-[11px] text-slate-500">{req.customerEmail || "—"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-800 bg-slate-100/80 px-2.5 py-1 rounded-lg text-xs border border-slate-200/60 inline-block">
                          {req.serviceName || req.documentType}
                        </span>
                      </td>

                      {/* Submitted Date */}
                      <td className="px-5 py-4 text-slate-600">
                        <div className="font-medium text-slate-700">
                          {new Date(req.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(req.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Documents Audit */}
                      <td className="px-5 py-4">
                        {missingCount === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{fileCount} Provided</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span>{missingCount} Missing</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border shadow-2xs ${statusCfg.className}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleOpenCaseModal(req)}
                          className="bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Review Case</span>
                          <span className="text-amber-400 group-hover:text-slate-950">→</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Case Inspection & Details Modal ── */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-fade-up overflow-hidden my-6">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm shadow">
                  ⚖️
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Case #{selectedCase.requestId}: {selectedCase.serviceName || selectedCase.documentType}
                    </h3>
                    <span className="text-xs font-mono font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                      {formatDocId(selectedCase.requestId)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Client: <strong className="text-white">{selectedCase.customerName || "Customer"}</strong> ({selectedCase.customerEmail || "No email"})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Feedback toast */}
              {actionMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    actionMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  <span>{actionMessage.type === "success" ? "✓" : "⚠️"}</span>
                  <span>{actionMessage.text}</span>
                </div>
              )}

              {/* Active Re-upload Request banner */}
              {selectedCase.reuploadNote && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <span className="text-lg">📢</span>
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 block">
                      Active Re-upload Request Sent to Client
                    </span>
                    <p className="mt-0.5 font-medium text-amber-950">{selectedCase.reuploadNote}</p>
                  </div>
                </div>
              )}

              {/* Status & Quick Action Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Current Case Status
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        STATUS_CONFIG[selectedCase.status]?.className || "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {STATUS_CONFIG[selectedCase.status]?.label || selectedCase.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Update Status:</span>
                  <select
                    value={selectedCase.status}
                    disabled={statusUpdating}
                    onChange={(e) => handleUpdateStatus(selectedCase.requestId, e.target.value)}
                    className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                  >
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="REQUIRES_DOCUMENTS">REQUIRES_DOCUMENTS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  {statusUpdating && (
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </div>

              {/* Required Documents Audit */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Required Documents Checklist
                  </h4>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      (selectedCase.missingDocuments?.length ?? 0) === 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {(selectedCase.missingDocuments?.length ?? 0) === 0
                      ? "✓ All Documents Provided"
                      : `⚠️ ${selectedCase.missingDocuments.length} Missing`}
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedCase.requiredDocuments?.map((doc, idx) => {
                    const isMissing = selectedCase.missingDocuments?.includes(doc);
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold gap-2 ${
                          isMissing
                            ? "bg-rose-50/50 border-rose-200 text-rose-800"
                            : "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span>{isMissing ? "❌" : "✅"}</span>
                          <span>{doc}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider">
                            {isMissing ? "MISSING" : "RECEIVED"}
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg transition shadow-xs"
                          >
                            <span>📨</span>
                            <span>Ask to upload this document</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Uploaded Files */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Uploaded Files ({selectedCase.documentFiles?.length ?? 0})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSamplePickerOpen(true)}
                    disabled={sampleUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-xs transition"
                  >
                    <span>📄</span>
                    <span>Use Sample Document</span>
                  </button>
                </div>
                {selectedCase.documentFiles?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No files uploaded yet for this case.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCase.documentFiles?.map((f) => (
                      <div
                        key={f.fileId}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {f.contentType?.includes("pdf") ? "📕" : "🖼️"}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{f.fileName}</div>
                            <div className="text-[11px] text-slate-400">
                              {(f.fileSize / 1024).toFixed(1)} KB • Uploaded{" "}
                              {new Date(f.uploadDate).toLocaleDateString()}
                            </div>
                            {f.rejectReason && (
                              <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
                                Reason: {f.rejectReason}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              f.documentStatus?.toLowerCase() === "rejected"
                                ? "text-rose-700 bg-rose-50 border-rose-200"
                                : "text-emerald-700 bg-emerald-50 border-emerald-200"
                            }`}
                          >
                            {f.documentStatus || "ACCEPTED"}
                          </span>
                          <a
                            href={`/api/document-files/${f.fileId}/download`}
                            download
                            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1 rounded-lg transition flex items-center gap-1"
                          >
                            <span>⬇️</span>
                            <span>Download</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => openAskModal(f.fileName, f.fileId)}
                            className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                          >
                            <span>⚠️</span>
                            <span>Ask to re-upload</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client Chat Log */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>💬</span>
                  <span>Client AI Conversation History</span>
                </h4>
                {chatLoading ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading messages…
                  </div>
                ) : chatMessages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No chat transcript available for this case.
                  </p>
                ) : (
                  <div className="bg-slate-900 rounded-xl p-4 max-h-60 overflow-y-auto space-y-3">
                    {chatMessages.map((msg, i) => {
                      const isClient = msg.role === "client";
                      return (
                        <div
                          key={i}
                          className={`flex flex-col ${isClient ? "items-end" : "items-start"}`}
                        >
                          <div className="text-[10px] text-slate-400 mb-0.5 font-semibold">
                            {isClient ? selectedCase.customerName || "Client" : "🤖 AI Legal Assistant"}
                          </div>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                              isClient
                                ? "bg-amber-500 text-slate-950 font-medium"
                                : "bg-slate-800 text-slate-200 border border-slate-700"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Close Case
              </button>
            </div>
          </div>
        </div>
      )}

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
      {samplePickerOpen && selectedCase && (
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
                Click any sample document below to attach it immediately to Case #{selectedCase.requestId}. The backend will register and verify it as an official legal document file.
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
    </ClerkLayout>
  );
};
