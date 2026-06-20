import { memo, useCallback, useRef, useMemo } from 'react';

/**
 * Shallow comparison for objects
 */
export function shallowEqual<T extends Record<string, any>>(a: T, b: T): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  
  return true;
}

/**
 * Deep comparison for arrays (shallow items)
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

/**
 * Compare Post objects for memoization
 * Only compares fields that would affect rendering
 */
export function postsEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  
  // Core fields
  if (a.id !== b.id) return false;
  if (a.content !== b.content) return false;
  if (a.like_count !== b.like_count) return false;
  if (a.reply_count !== b.reply_count) return false;
  if (a.view_count !== b.view_count) return false;
  if (a.has_liked !== b.has_liked) return false;
  
  // Profile fields
  if (a.profiles?.display_name !== b.profiles?.display_name) return false;
  if (a.profiles?.avatar_url !== b.profiles?.avatar_url) return false;
  if (a.profiles?.is_verified !== b.profiles?.is_verified) return false;
  
  // Image count check (shallow)
  if ((a.post_images?.length || 0) !== (b.post_images?.length || 0)) return false;
  
  return true;
}

/**
 * Higher-order component for list item memoization with custom comparison
 */
export function withListItemMemo<P extends { id: string }>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return memo(Component, propsAreEqual || ((prev, next) => prev.id === next.id));
}

/**
 * Virtualization helper - only render items in viewport
 */
export function useVirtualization<T extends { id: string }>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan = 3
) {
  return useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return {
      virtualItems: items.slice(startIndex, endIndex).map((item, index) => ({
        ...item,
        virtualIndex: startIndex + index,
        offsetTop: (startIndex + index) * itemHeight,
      })),
      totalHeight: items.length * itemHeight,
      startIndex,
      endIndex,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);
}

/**
 * Stable callback ref - prevents unnecessary re-renders from callback changes
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Batched state updates helper
 */
export function useBatchedUpdates() {
  const pendingUpdates = useRef<(() => void)[]>([]);
  const rafId = useRef<number>();
  
  const scheduleUpdate = useCallback((update: () => void) => {
    pendingUpdates.current.push(update);
    
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(() => {
        const updates = pendingUpdates.current;
        pendingUpdates.current = [];
        rafId.current = undefined;
        
        // Execute all updates in one batch
        updates.forEach(fn => fn());
      });
    }
  }, []);
  
  return scheduleUpdate;
}
