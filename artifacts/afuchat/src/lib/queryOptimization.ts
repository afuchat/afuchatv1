/**
 * Query optimization utilities for Supabase
 * Reduces data transfer and improves performance
 */

// Minimum fields needed for post display
export const POST_SELECT_FIELDS = `
  id,
  content,
  created_at,
  updated_at,
  author_id,
  image_url,
  view_count,
  language_code,
  profiles!inner(
    display_name,
    handle,
    is_verified,
    is_organization_verified,
    is_affiliate,
    is_business_mode,
    avatar_url,
    affiliated_business_id,
    last_seen,
    show_online_status
  ),
  post_images(image_url, display_order, alt_text),
  post_link_previews(url, title, description, image_url, site_name)
`;

// Compact version for list views (without link previews)
export const POST_COMPACT_SELECT = `
  id,
  content,
  created_at,
  author_id,
  image_url,
  view_count,
  profiles!inner(
    display_name,
    handle,
    is_verified,
    is_organization_verified,
    avatar_url
  ),
  post_images(image_url, display_order)
`;

// Minimum profile fields for avatars/mentions
export const PROFILE_MINIMAL_SELECT = `
  id,
  display_name,
  handle,
  avatar_url,
  is_verified
`;

// Profile fields for display
export const PROFILE_DISPLAY_SELECT = `
  id,
  display_name,
  handle,
  avatar_url,
  is_verified,
  is_organization_verified,
  is_affiliate,
  is_business_mode,
  affiliated_business_id,
  last_seen,
  show_online_status
`;

// Reply fields
export const REPLY_SELECT_FIELDS = `
  id,
  post_id,
  author_id,
  content,
  created_at,
  parent_reply_id,
  is_pinned,
  profiles(
    display_name,
    handle,
    is_verified,
    is_organization_verified,
    is_affiliate,
    is_business_mode,
    avatar_url
  )
`;

// Chat member with profile
export const CHAT_MEMBER_SELECT = `
  chat_id,
  user_id,
  is_admin,
  profiles(id, display_name, handle, avatar_url, is_verified)
`;

// Message fields for chat list
export const MESSAGE_LIST_SELECT = `
  chat_id,
  encrypted_content,
  attachment_type,
  audio_url,
  sent_at,
  sender_id,
  read_at
`;

/**
 * Batch fetch helper - fetches items in parallel batches
 */
export async function batchFetch<T, R>(
  items: T[],
  fetchFn: (batch: T[]) => Promise<R[]>,
  batchSize = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await fetchFn(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Cache manager for session-based caching
 */
export const cacheManager = {
  get<T>(key: string): T | null {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp, ttl } = JSON.parse(cached);
      
      // Check if cache is expired
      if (ttl && Date.now() - timestamp > ttl) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      return data as T;
    } catch {
      return null;
    }
  },
  
  set<T>(key: string, data: T, ttlMs?: number): void {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      }));
    } catch (e) {
      // Storage might be full, clear old items
      console.warn('Cache storage error:', e);
    }
  },
  
  remove(key: string): void {
    sessionStorage.removeItem(key);
  },
  
  clear(): void {
    sessionStorage.clear();
  },
};

/**
 * Request deduplication - prevents duplicate API calls
 */
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicatedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Return existing promise if request is in-flight
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }
  
  const promise = fetchFn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}
