import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
}

type SubscriptionCallback = (payload: any) => void;

/**
 * Optimized real-time subscription hook
 * Consolidates multiple subscriptions into a single channel
 * Automatically handles cleanup and reconnection
 */
export function useRealtimeSubscription(
  subscriptions: Array<{
    config: SubscriptionConfig;
    callback: SubscriptionCallback;
  }>,
  enabled = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef(subscriptions.map(s => s.callback));

  // Keep callbacks updated without recreating subscription
  useEffect(() => {
    callbacksRef.current = subscriptions.map(s => s.callback);
  }, [subscriptions]);

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return;

    // Create a unique channel name
    const channelName = `optimized-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    let channel = supabase.channel(channelName);

    // Add all subscriptions to the channel
    subscriptions.forEach((sub, index) => {
      const { config } = sub;
      const event = config.event || '*';
      
      channel = channel.on(
        'postgres_changes' as any,
        {
          event,
          schema: config.schema || 'public',
          table: config.table,
          ...(config.filter ? { filter: config.filter } : {}),
        },
        (payload: any) => {
          // Use latest callback from ref
          callbacksRef.current[index]?.(payload);
        }
      );
    });

    channelRef.current = channel.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, subscriptions.length]); // Only recreate if count changes

  return channelRef.current;
}

/**
 * Simplified single table subscription
 */
export function useTableSubscription<T = any>(
  table: string,
  callbacks: {
    onInsert?: (data: T) => void;
    onUpdate?: (data: T, oldData: T) => void;
    onDelete?: (oldData: T) => void;
  },
  options: {
    enabled?: boolean;
    filter?: string;
  } = {}
) {
  const { enabled = true, filter } = options;
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `table-${table}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: any) => {
          const { eventType, new: newData, old: oldData } = payload;
          
          switch (eventType) {
            case 'INSERT':
              callbacksRef.current.onInsert?.(newData as T);
              break;
            case 'UPDATE':
              callbacksRef.current.onUpdate?.(newData as T, oldData as T);
              break;
            case 'DELETE':
              callbacksRef.current.onDelete?.(oldData as T);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, enabled]);
}

/**
 * Debounced real-time updates
 * Batches rapid updates into single state change
 */
export function useDebouncedRealtimeUpdates<T>(
  initialData: T[],
  idKey: keyof T = 'id' as keyof T,
  debounceMs = 100
) {
  const dataRef = useRef(initialData);
  const pendingUpdates = useRef<Map<string, { type: 'upsert' | 'delete'; data?: T }>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const setDataRef = useRef<((data: T[]) => void) | null>(null);

  const processUpdates = useCallback(() => {
    if (pendingUpdates.current.size === 0) return;

    let newData = [...dataRef.current];

    pendingUpdates.current.forEach((update, id) => {
      if (update.type === 'delete') {
        newData = newData.filter(item => String(item[idKey]) !== id);
      } else if (update.data) {
        const index = newData.findIndex(item => String(item[idKey]) === id);
        if (index >= 0) {
          newData[index] = update.data;
        } else {
          newData.unshift(update.data);
        }
      }
    });

    pendingUpdates.current.clear();
    dataRef.current = newData;
    setDataRef.current?.(newData);
  }, [idKey]);

  const queueUpdate = useCallback((type: 'upsert' | 'delete', data?: T) => {
    if (!data) return;
    
    const id = String(data[idKey]);
    pendingUpdates.current.set(id, { type, data: type === 'upsert' ? data : undefined });

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(processUpdates, debounceMs);
  }, [idKey, debounceMs, processUpdates]);

  return {
    onInsert: (data: T) => queueUpdate('upsert', data),
    onUpdate: (data: T) => queueUpdate('upsert', data),
    onDelete: (data: T) => queueUpdate('delete', data),
    setDataCallback: (fn: (data: T[]) => void) => { setDataRef.current = fn; },
    updateRef: (data: T[]) => { dataRef.current = data; },
  };
}
