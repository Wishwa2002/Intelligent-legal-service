import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";

import {
  serviceRequestsApi,
  type ServiceRequest,
  type ServiceRequestStatus,
  type ChangeStatusData,
  STATUS_LABELS,
  STATUS_COLORS,
} from "../../api/serviceRequestsApi";

import { authApi } from "../../api/authApi";

import {
  createTestAiWorkflow,
  type TestAiWorkflow,
} from "../../data/aiWorkflowTestData";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{
  status: ServiceRequestStatus;
}> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
);

// Admin allowed transitions
const ADMIN_TRANSITIONS: Partial<
  Record<ServiceRequestStatus, ServiceRequestStatus[]>
> = {
  Submitted: ["InProgress", "Rejected", "Cancelled"],
  InProgress: [
    "AwaitingReview",
    "RevisionRequired",
    "Cancelled",
  ],
  AwaitingReview: [
    "Approved",
    "Rejected",
    "RevisionRequired",
  ],
  RevisionRequired: [
    "InProgress",
    "Cancelled",
  ],
  Approved: ["Completed"],
};

const ALL_STATUSES: ServiceRequestStatus[] = [
  "Submitted",
  "InProgress",
  "AwaitingReview",
  "Approved",
  "Rejected",
  "RevisionRequired",
  "Completed",
  "Cancelled",
];

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const AdminServiceRequestsPage: React.FC = () => {
  const admin = authApi.getCurrentAdmin();

  const [requests, setRequests] =
    useState<ServiceRequest[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ───────────────────────────────────────────────────────────
  // Filters
  // ───────────────────────────────────────────────────────────

  const [statusFilter, setStatusFilter] =
    useState<ServiceRequestStatus | "ALL">("ALL");

  const [search, setSearch] = useState("");

  // ───────────────────────────────────────────────────────────
  // Normal Status Change Modal
  // ───────────────────────────────────────────────────────────

  const [changingId, setChangingId] =
    useState<string | null>(null);

  const [newStatus, setNewStatus] =
    useState<ServiceRequestStatus>("InProgress");

  const [note, setNote] = useState("");

  const [changing, setChanging] = useState(false);

  const [changeError, setChangeError] =
    useState<string | null>(null);

  // ───────────────────────────────────────────────────────────
  // AI Workflow Review
  // ───────────────────────────────────────────────────────────

  const [reviewRequest, setReviewRequest] =
    useState<ServiceRequest | null>(null);

  const [aiWorkflow, setAiWorkflow] =
    useState<TestAiWorkflow | null>(null);

  const [approvingAi, setApprovingAi] =
    useState(false);

  const [aiRejected, setAiRejected] =
    useState(false);

  // ───────────────────────────────────────────────────────────
  // Load Requests
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const data =
        await serviceRequestsApi.getAll();

      setRequests(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load requests."
      );
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // Filter
  // ───────────────────────────────────────────────────────────

  const filtered = requests.filter((r) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      r.status === statusFilter;

    const query =
      search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      r.title
        .toLowerCase()
        .includes(query) ||
      r.requestType
        .toLowerCase()
        .includes(query) ||
      r.customerName
        .toLowerCase()
        .includes(query);

    return matchesStatus && matchesSearch;
  });

  // ───────────────────────────────────────────────────────────
  // Normal Status Change
  // ───────────────────────────────────────────────────────────

  const openStatusModal = (
    id: string,
    current: ServiceRequestStatus
  ) => {
    const options =
      ADMIN_TRANSITIONS[current];

    if (!options || options.length === 0) {
      return;
    }

    setChangingId(id);
    setNewStatus(options[0]);
    setNote("");
    setChangeError(null);
  };

  const submitStatusChange = async () => {
    if (!changingId) return;

    try {
      setChanging(true);
      setChangeError(null);

      const data: ChangeStatusData = {
        status: newStatus,
        note: note.trim() || undefined,
      };

      await serviceRequestsApi.changeStatus(
        changingId,
        data,
        admin?.userId
      );

      await fetchAll();

      setChangingId(null);
    } catch (err: any) {
      setChangeError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update status."
      );
    } finally {
      setChanging(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // AI Workflow
  // ───────────────────────────────────────────────────────────

  const openAiWorkflow = (
    request: ServiceRequest
  ) => {
    setReviewRequest(request);

    setAiWorkflow(
      createTestAiWorkflow(
        request.serviceRequestId
      )
    );

    setAiRejected(false);
  };

  const closeAiWorkflow = () => {
    setReviewRequest(null);
    setAiWorkflow(null);
    setAiRejected(false);
    setApprovingAi(false);
  };

  const approveAiWorkflow = async () => {
    if (!aiWorkflow) return;

    try {
      setApprovingAi(true);

      // Simulates processing delay for test workflow presentation.
      await new Promise((resolve) =>
        setTimeout(resolve, 900)
      );

      setAiWorkflow({
        ...aiWorkflow,
        status: "Completed",
      });

      setAiRejected(false);
    } finally {
      setApprovingAi(false);
    }
  };

  const rejectAiWorkflow = () => {
    setAiRejected(true);
  };

  // ───────────────────────────────────────────────────────────
  // Status modal derived values
  // ───────────────────────────────────────────────────────────

  const changingRequest =
    changingId
      ? requests.find(
          (r) =>
            r.serviceRequestId ===
            changingId
        )
      : null;

  const availableTransitions =
    changingRequest
      ? ADMIN_TRANSITIONS[
          changingRequest.status as ServiceRequestStatus
        ] ?? []
      : [];

  // ───────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────

  return (
    <AdminLayout
      title="Service Requests"
      subtitle="Manage customer service requests and AI workflow approvals"
    >
      {/* ─────────────────────────────────────────────── */}
      {/* Filters */}
      {/* ─────────────────────────────────────────────── */}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search by title, type, or customer…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target
                .value as ServiceRequestStatus | "ALL"
            )
          }
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">
            All Statuses
          </option>

          {ALL_STATUSES.map((status) => (
            <option
              key={status}
              value={status}
            >
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <button
          onClick={fetchAll}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* ─────────────────────────────────────────────── */}
      {/* Statistics */}
      {/* ─────────────────────────────────────────────── */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(
          [
            "Submitted",
            "InProgress",
            "AwaitingReview",
            "Approved",
          ] as ServiceRequestStatus[]
        ).map((status) => (
          <div
            key={status}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <p className="text-2xl font-bold text-slate-800">
              {
                requests.filter(
                  (r) =>
                    r.status === status
                ).length
              }
            </p>

            <p className="text-xs text-slate-500 mt-0.5">
              {STATUS_LABELS[status]}
            </p>
          </div>
        ))}
      </div>

      {/* ─────────────────────────────────────────────── */}
      {/* Requests Table */}
      {/* ─────────────────────────────────────────────── */}

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Loading…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No requests found.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Title
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Customer
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Type
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Priority
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Submitted
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((request) => {
                const canChange =
                  !!ADMIN_TRANSITIONS[
                    request.status as ServiceRequestStatus
                  ]?.length;

                return (
                  <tr
                    key={
                      request.serviceRequestId
                    }
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p
                        className="font-medium text-slate-800 truncate max-w-[220px]"
                        title={request.title}
                      >
                        {request.title}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {request.customerName}
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {request.requestType}
                    </td>

                    <td className="px-4 py-3.5">
                      {request.priority ? (
                        <span className="text-xs font-medium text-slate-600">
                          {request.priority}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status={
                          request.status as ServiceRequestStatus
                        }
                      />
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(
                        request.createdAt
                      ).toLocaleDateString(
                        "en-US",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            openAiWorkflow(
                              request
                            )
                          }
                          className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Review AI Workflow
                        </button>

                        {canChange && (
                          <button
                            onClick={() =>
                              openStatusModal(
                                request.serviceRequestId,
                                request.status as ServiceRequestStatus
                              )
                            }
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Change Status
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─────────────────────────────────────────────── */}
      {/* AI Workflow Review Modal */}
      {/* ─────────────────────────────────────────────── */}

      {reviewRequest &&
        aiWorkflow && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
              {/* Header */}

              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">
                        AI Workflow Review
                      </h2>

                      <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                        Test Data
                      </span>
                    </div>

                    <p className="text-sm text-slate-500 mt-1">
                      Review the coordinator
                      result before approving
                      the final action.
                    </p>
                  </div>

                  <button
                    onClick={
                      closeAiWorkflow
                    }
                    className="text-slate-400 hover:text-slate-700 text-xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Customer Request */}

                <div className="border border-slate-200 rounded-xl p-5">
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-2">
                    Customer Request
                  </p>

                  <h3 className="font-bold text-slate-900 text-lg">
                    {
                      reviewRequest.title
                    }
                  </h3>

                  <div className="grid sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase">
                        Customer
                      </p>

                      <p className="font-medium text-slate-700 mt-1">
                        {
                          reviewRequest.customerName
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 uppercase">
                        Request Type
                      </p>

                      <p className="font-medium text-slate-700 mt-1">
                        {
                          reviewRequest.requestType
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 uppercase">
                        Priority
                      </p>

                      <p className="font-medium text-slate-700 mt-1">
                        {reviewRequest.priority ||
                          "Normal"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Coordinator */}

                <div className="border border-purple-200 bg-purple-50 rounded-xl p-5">
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase font-semibold text-purple-500">
                        Planning /
                        Coordinator Agent
                      </p>

                      <p className="font-bold text-purple-900 mt-1 text-lg">
                        Multi-Agent Analysis
                        Completed
                      </p>

                      <p className="text-xs text-purple-600 mt-2 break-all">
                        Workflow ID:{" "}
                        {
                          aiWorkflow.workflowId
                        }
                      </p>
                    </div>

                    <div>
                      <span
                        className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold ${
                          aiWorkflow.status ===
                          "Completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {
                          aiWorkflow.status
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specialist Agents */}

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Specialist Agent
                    Results
                  </h3>

                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Lawyer */}

                    <div className="border border-slate-200 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div>
                          <p className="font-bold text-slate-800">
                            Lawyer
                            Recommendation
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            Member 1 Agent
                          </p>
                        </div>

                        <span className="text-xs font-bold text-green-600">
                          ✓ Completed
                        </span>
                      </div>

                      <p className="font-bold text-slate-900">
                        {
                          aiWorkflow.lawyer
                            .name
                        }
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        {
                          aiWorkflow.lawyer
                            .qualification
                        }
                      </p>

                      <p className="text-sm text-slate-600 mt-3">
                        {
                          aiWorkflow.lawyer
                            .practiceArea
                        }
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        {
                          aiWorkflow.lawyer
                            .experience
                        }{" "}
                        years experience
                      </p>
                    </div>

                    {/* Scheduling */}

                    <div className="border border-slate-200 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div>
                          <p className="font-bold text-slate-800">
                            Scheduling
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            Member 2 Agent
                          </p>
                        </div>

                        <span className="text-xs font-bold text-green-600">
                          ✓ Completed
                        </span>
                      </div>

                      <p className="text-xs uppercase text-slate-400">
                        Selected Date
                      </p>

                      <p className="font-bold text-slate-900 mt-1">
                        {
                          aiWorkflow.slot
                            .date
                        }
                      </p>

                      <p className="text-xs uppercase text-slate-400 mt-4">
                        Time
                      </p>

                      <p className="font-semibold text-slate-700 mt-1">
                        {
                          aiWorkflow.slot
                            .time
                        }
                      </p>
                    </div>

                    {/* Documentation */}

                    <div className="border border-slate-200 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div>
                          <p className="font-bold text-slate-800">
                            Documentation
                          </p>

                          <p className="text-xs text-slate-400 mt-1">
                            Member 3 Agent
                          </p>
                        </div>

                        <span className="text-xs font-bold text-green-600">
                          ✓ Completed
                        </span>
                      </div>

                      <p className="text-xs uppercase text-slate-400 mb-2">
                        Required
                        Documents
                      </p>

                      <div className="space-y-2">
                        {aiWorkflow.documents.map(
                          (
                            document
                          ) => (
                            <p
                              key={
                                document
                              }
                              className="text-sm text-slate-600"
                            >
                              <span className="text-green-600 font-bold mr-2">
                                ✓
                              </span>

                              {
                                document
                              }
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation */}

                <div
                  className={`rounded-xl border p-5 ${
                    aiWorkflow.validationPassed
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase font-semibold text-slate-500">
                        Coordinator
                        Validation
                      </p>

                      <p
                        className={`font-bold text-lg mt-1 ${
                          aiWorkflow.validationPassed
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {aiWorkflow.validationPassed
                          ? "✓ Validation Passed"
                          : "✕ Validation Failed"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        3 / 3 Agents
                        Completed
                      </p>

                      <p className="text-xs text-slate-500">
                        Outputs validated
                        by coordinator
                      </p>
                    </div>
                  </div>
                </div>

                {/* Final Action */}

                <div className="border border-slate-200 rounded-xl p-5">
                  <p className="text-xs uppercase tracking-wide font-semibold text-slate-400">
                    Final Action Requiring
                    Admin Approval
                  </p>

                  <h3 className="font-bold text-slate-900 text-lg mt-1">
                    Create Lawyer
                    Appointment
                  </h3>

                  <div className="grid md:grid-cols-2 gap-5 mt-5">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs uppercase text-slate-400">
                        Selected Lawyer
                      </p>

                      <p className="font-bold text-slate-900 mt-1">
                        {
                          aiWorkflow.lawyer
                            .name
                        }
                      </p>

                      <p className="text-sm text-slate-500">
                        {
                          aiWorkflow.lawyer
                            .practiceArea
                        }
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs uppercase text-slate-400">
                        Selected
                        Appointment
                      </p>

                      <p className="font-bold text-slate-900 mt-1">
                        {
                          aiWorkflow.slot
                            .date
                        }
                      </p>

                      <p className="text-sm text-slate-500">
                        {
                          aiWorkflow.slot
                            .time
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rejected */}

                {aiRejected && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <p className="font-bold text-red-800">
                      Action Rejected
                    </p>

                    <p className="text-sm text-red-700 mt-1">
                      Administrator
                      rejected the proposed
                      appointment action.
                    </p>
                  </div>
                )}

                {/* Completed */}

                {aiWorkflow.status ===
                  "Completed" && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                        ✓
                      </div>

                      <div>
                        <p className="font-bold text-green-800 text-lg">
                          Workflow
                          Completed
                        </p>

                        <p className="text-green-700 text-sm mt-1">
                          Administrator
                          approved the
                          proposed final
                          action.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}

              <div className="p-6 border-t border-slate-200 bg-slate-50">
                {aiWorkflow.status ===
                  "AwaitingApproval" &&
                !aiRejected ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={
                        approveAiWorkflow
                      }
                      disabled={
                        approvingAi ||
                        !aiWorkflow.validationPassed
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      {approvingAi
                        ? "Approving..."
                        : "Approve Appointment"}
                    </button>

                    <button
                      onClick={
                        rejectAiWorkflow
                      }
                      disabled={
                        approvingAi
                      }
                      className="flex-1 border border-red-200 text-red-700 bg-white hover:bg-red-50 font-semibold py-3 rounded-xl transition-colors"
                    >
                      Reject
                    </button>

                    <button
                      onClick={
                        closeAiWorkflow
                      }
                      disabled={
                        approvingAi
                      }
                      className="px-6 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={
                      closeAiWorkflow
                    }
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ─────────────────────────────────────────────── */}
      {/* Status Change Modal */}
      {/* ─────────────────────────────────────────────── */}

      {changingId &&
        changingRequest && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Change Request Status
              </h3>

              <p className="text-sm text-slate-500 mb-5 truncate">
                "
                {
                  changingRequest.title
                }
                "
              </p>

              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">
                  Current:{" "}
                  <StatusBadge
                    status={
                      changingRequest.status as ServiceRequestStatus
                    }
                  />
                </p>
              </div>

              {changeError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {changeError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  New Status
                </label>

                <select
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(
                      e.target
                        .value as ServiceRequestStatus
                    )
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableTransitions.map(
                    (status) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {
                          STATUS_LABELS[
                            status
                          ]
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Note
                  (optional)
                </label>

                <textarea
                  value={note}
                  onChange={(e) =>
                    setNote(
                      e.target
                        .value
                    )
                  }
                  rows={3}
                  placeholder="Add a note about this status change…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={
                    submitStatusChange
                  }
                  disabled={
                    changing
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {changing
                    ? "Updating…"
                    : "Update Status"}
                </button>

                <button
                  onClick={() =>
                    setChangingId(
                      null
                    )
                  }
                  className="flex-1 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </AdminLayout>
  );
};

export default AdminServiceRequestsPage;