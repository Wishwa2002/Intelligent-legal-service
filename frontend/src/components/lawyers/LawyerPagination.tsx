import { lawyerPageRange } from "./lawyerPageUtils";

interface LawyerPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function LawyerPagination({ page, pageSize, totalItems, totalPages, loading, onPageChange, onPageSizeChange }: LawyerPaginationProps) {
  const { start, end } = lawyerPageRange(page, pageSize, totalItems);

  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
    <span>Showing {start}–{end} of {totalItems} registered lawyers</span>
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2">Rows per page
        <select aria-label="Rows per page" value={pageSize} disabled={loading}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-amber-600">
          {[10, 20, 30].map(size => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <nav aria-label="Lawyer pages" className="flex items-center gap-2">
        <button type="button" aria-label="Previous page" disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
        <span className="whitespace-nowrap px-1 font-semibold text-slate-700">Page {page} of {totalPages}</span>
        <button type="button" aria-label="Next page" disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
      </nav>
    </div>
  </div>;
}
