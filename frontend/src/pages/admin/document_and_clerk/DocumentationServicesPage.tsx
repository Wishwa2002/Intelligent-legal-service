import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { documentationApi, type DocumentationService } from "../../../api/documentationApi";

export const DocumentationServicesPage: React.FC = () => {
  const [services, setServices] = useState<DocumentationService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredDocsInput, setRequiredDocsInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentationApi.getServices(true);
      setServices(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setRequiredDocsInput("");
    setShowModal(true);
  };

  const handleOpenEdit = (service: DocumentationService) => {
    setEditingId(service.serviceId);
    setName(service.name);
    setDescription(service.description);
    setRequiredDocsInput(service.requiredDocuments.join(", "));
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const docs = requiredDocsInput
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    try {
      setSaving(true);
      if (editingId !== null) {
        await documentationApi.updateService(editingId, {
          name,
          description,
          isActive: true,
          requiredDocuments: docs,
        });
      } else {
        await documentationApi.createService({
          name,
          description,
          requiredDocuments: docs,
        });
      }
      setShowModal(false);
      await fetchServices();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm("Are you sure you want to deactivate this documentation service?")) return;
    try {
      await documentationApi.deactivateService(id);
      await fetchServices();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to deactivate service");
    }
  };

  return (
    <AdminLayout
      title="Documentation Services Template Management"
      subtitle="Define legal documentation service types, required customer proofs, and checklist requirements."
    >
      <div className="flex justify-between items-center mb-6">
        <div className="text-xs text-slate-500">
          Configured Services: <strong>{services.length}</strong>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Add New Service Template</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading documentation service templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc) => (
            <div
              key={svc.serviceId}
              className={`bg-white rounded-xl border p-6 shadow-sm flex flex-col justify-between transition-all ${
                svc.isActive ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    ID #{svc.serviceId}
                  </span>
                  {svc.isActive ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900 mb-1">{svc.name}</h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">{svc.description}</p>

                <div className="mb-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Required Documents ({svc.requiredDocuments?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {svc.requiredDocuments?.length > 0 ? (
                      svc.requiredDocuments.map((doc, idx) => (
                        <span
                          key={idx}
                          className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium px-2 py-0.5 rounded"
                        >
                          ✓ {doc}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">None specified</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2 text-xs">
                <button
                  onClick={() => handleOpenEdit(svc)}
                  className="text-slate-700 hover:text-slate-900 font-medium px-2.5 py-1 rounded hover:bg-slate-100"
                >
                  Edit
                </button>
                {svc.isActive && (
                  <button
                    onClick={() => handleDeactivate(svc.serviceId)}
                    className="text-rose-600 hover:text-rose-800 font-medium px-2.5 py-1 rounded hover:bg-rose-50"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingId ? "Edit Documentation Service" : "Add Documentation Service Template"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Business Registration Documentation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the scope of documentation processing..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Documents Checklist (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. NIC Copy, Business Registration Form, Address Proof"
                  value={requiredDocsInput}
                  onChange={(e) => setRequiredDocsInput(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  The AI Agent and Customer portal will use this list to check for missing proofs.
                </span>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
