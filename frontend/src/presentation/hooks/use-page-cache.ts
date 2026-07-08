"use client";

import { useRef, useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────

interface PageData<T> {
  data: T[];
  total: number;
  totalPages: number;
}

interface CacheEntry<T> {
  data: PageData<T>;
  promise: Promise<PageData<T>> | null;
}

interface UsePageCacheOptions<T> {
  fetchFn: (page: number) => Promise<{ success: boolean; data: T[]; total: number; totalPages: number }>;
  prefetchDelta?: number; // prefetch N pages ahead (default: 1)
}

interface UsePageCacheReturn<T> {
  /** Current page data (undefined until first load) */
  current: PageData<T> | undefined;
  /** Loading state for the current page */
  loading: boolean;
  /** Load a specific page (cached if available) */
  loadPage: (page: number) => Promise<PageData<T>>;
  /** Clear entire cache (call when filters change) */
  clearCache: () => void;
  /** Total pages from the most recent response */
  totalPages: number;
  /** Total records from the most recent response */
  total: number;
}

// ─── Hook ──────────────────────────────────────────────────

/**
 * Client-side page cache.
 * Stores visited pages in memory so navigating back is instant.
 * Optionally prefetches adjacent pages in the background.
 */
export function usePageCache<T>({
  fetchFn,
  prefetchDelta = 1,
}: UsePageCacheOptions<T>): UsePageCacheReturn<T> {
  const cache = useRef<Map<number, CacheEntry<T>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<PageData<T> | undefined>();
  const prefetchTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const clearCache = useCallback(() => {
    // Cancel any pending prefetches
    for (const timer of prefetchTimers.current.values()) {
      clearTimeout(timer);
    }
    prefetchTimers.current.clear();
    cache.current.clear();
    setCurrent(undefined);
  }, []);

  const prefetchPage = useCallback(
    (page: number) => {
      // Don't prefetch if already cached or already being fetched
      const entry = cache.current.get(page);
      if (entry?.data || entry?.promise) return;

      const promise = fetchFn(page).then((res) => {
        if (res.success) {
          const pageData: PageData<T> = {
            data: res.data,
            total: res.total,
            totalPages: res.totalPages,
          };
          // Update the cache entry with the resolved data
          const existing = cache.current.get(page);
          if (existing) existing.data = pageData;
          return pageData;
        }
        throw new Error("Prefetch failed");
      });

      cache.current.set(page, { data: null as unknown as PageData<T>, promise });
    },
    [fetchFn],
  );

  const loadPage = useCallback(
    async (page: number): Promise<PageData<T>> => {
      // 1. Check cache
      const cached = cache.current.get(page);
      if (cached?.data) {
        setCurrent(cached.data);
        setLoading(false);

        // Prefetch next page on cached hit too
        if (cached.data.totalPages > page) {
          const nextPage = page + 1;
          // Small delay so we don't flood on rapid pagination
          const existingTimer = prefetchTimers.current.get(nextPage);
          if (!existingTimer) {
            const timer = setTimeout(() => {
              prefetchPage(nextPage);
              prefetchTimers.current.delete(nextPage);
            }, 300);
            prefetchTimers.current.set(nextPage, timer);
          }
        }

        return cached.data;
      }

      // 2. If currently being fetched by a prefetch, wait for it
      if (cached?.promise) {
        setLoading(true);
        const pageData = await cached.promise;
        setCurrent(pageData);
        setLoading(false);
        return pageData;
      }

      // 3. Fetch from server
      setLoading(true);
      const entry: CacheEntry<T> = { data: null as unknown as PageData<T>, promise: null };
      const promise = fetchFn(page).then((res) => {
        if (res.success) {
          const pageData: PageData<T> = {
            data: res.data,
            total: res.total,
            totalPages: res.totalPages,
          };
          entry.data = pageData;
          setCurrent(pageData);
          setLoading(false);

          // Prefetch next page(s) after successful load
          if (pageData.totalPages > page) {
            const pagesToPrefetch = Math.min(prefetchDelta, pageData.totalPages - page);
            for (let i = 1; i <= pagesToPrefetch; i++) {
              const nextPage = page + i;
              const timer = setTimeout(() => {
                prefetchPage(nextPage);
                prefetchTimers.current.delete(nextPage);
              }, 500 * i); // stagger prefetches
              prefetchTimers.current.set(nextPage, timer);
            }
          }

          return pageData;
        }
        setLoading(false);
        throw new Error(res.error ?? "Error al cargar datos");
      });
      entry.promise = promise;
      cache.current.set(page, entry);

      return promise;
    },
    [fetchFn, prefetchDelta, prefetchPage],
  );

  return {
    current,
    loading,
    loadPage,
    clearCache,
    totalPages: current?.totalPages ?? 0,
    total: current?.total ?? 0,
  };
}
