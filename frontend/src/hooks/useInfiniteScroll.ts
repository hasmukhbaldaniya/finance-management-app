"use client";

import { useCallback, useEffect, useRef } from "react";

// Reads hasMore/isLoading/onLoadMore via a ref instead of effect deps, so the
// IntersectionObserver isn't torn down and recreated on every fetch — it just
// checks the latest values when the sentinel actually scrolls into view.
//
// The sentinel element is rendered conditionally (only while hasMore is true),
// so it doesn't exist in the DOM on mount — a plain useRef + useEffect(fn, [])
// would attach to `null` once and never re-run once the element actually
// appears. A callback ref fixes this: React invokes it every time the node is
// attached (and again with `null` when detached), so the observer gets
// (re-)created exactly when there's something to observe.
export function useInfiniteScroll(onLoadMore: () => void, hasMore: boolean, isLoading: boolean) {
  const latest = useRef({ onLoadMore, hasMore, isLoading });
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    latest.current = { onLoadMore, hasMore, isLoading };
  }, [onLoadMore, hasMore, isLoading]);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && latest.current.hasMore && !latest.current.isLoading) {
          latest.current.onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return sentinelRef;
}
