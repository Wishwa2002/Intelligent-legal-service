import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListQuery, Paginated } from "./types";

export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

type Status = "loading" | "error" | "ready";
const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

type PageFetcher<T> = (
  q: ListQuery,
  signal: AbortSignal,
) => Promise<Paginated<T>>;

export function usePagedList<T>(
  fetchPage: PageFetcher<T>,
  query: Omit<ListQuery, "page">,
) {
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const queryKey = JSON.stringify(query);
  const q = useMemo(() => JSON.parse(queryKey) as Omit<ListQuery, "page">, [queryKey]);

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const moreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const c = new AbortController();
    setStatus("loading");
    setError(null);
    setMoreFailed(false);
    fetchRef
      .current({ ...q, page: 1 }, c.signal)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
        setPage(r.page);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (c.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(messageOf(e));
        setStatus("error");
      });
    return () => {
      c.abort();
      moreController.current?.abort();
    };
  }, [q, reloadToken]);

  const loadMore = useCallback(() => {
    if (loadingMore || status !== "ready") return;
    const c = new AbortController();
    moreController.current = c;
    setLoadingMore(true);
    setMoreFailed(false);
    fetchRef
      .current({ ...q, page: page + 1 }, c.signal)
      .then((r) => {
        setItems((prev) => [...prev, ...r.items]);
        setTotal(r.total);
        setPage(r.page);
      })
      .catch(() => {
        if (!c.signal.aborted) setMoreFailed(true);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoadingMore(false);
      });
  }, [loadingMore, status, q, page]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  return {
    items,
    total,
    status,
    error,
    loadingMore,
    moreFailed,
    hasMore: items.length < total,
    loadMore,
    retry,
  };
}

export function useDetail<T>(
  fetchOne: (id: string, signal: AbortSignal) => Promise<T>,
  id: string | undefined,
) {
  const fetchRef = useRef(fetchOne);
  fetchRef.current = fetchOne;
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) {
      setStatus("error");
      setError("Missing identifier");
      return;
    }
    const c = new AbortController();
    setStatus("loading");
    setError(null);
    fetchRef
      .current(id, c.signal)
      .then((r) => {
        setData(r);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (c.signal.aborted) return;
        setError(messageOf(e));
        setStatus("error");
      });
    return () => c.abort();
  }, [id, reloadToken]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);
  return { data, status, error, retry };
}
