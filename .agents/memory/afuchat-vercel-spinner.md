---
name: AfuChat Vercel spinner fix
description: Why the deployed site showed an infinite spinner and the pattern used to fix it
---

## The problem
On Vercel (production), `CombinedRouteGuard` renders `<PageSkeleton>` while `authLoading || profileCheckLoading` is true. If either Supabase call hangs indefinitely (no TCP timeout in a cloud environment), the spinner never goes away.

Two culprits:
1. `AuthContext` — `supabase.auth.getSession()` or `onAuthStateChange` can hang without ever resolving/rejecting on a fresh Vercel cold start.
2. `useProfileCheck` — `supabase.from('profiles').select(...).maybeSingle()` query can hang similarly.

The `#app-loader` HTML spinner in `index.html` was a separate issue — `main.tsx` was calling `hideLoader()` synchronously (before React's first paint) via `requestAnimationFrame`.

## The fix pattern
**AuthContext** — add a 5 s `setTimeout` safety net right after `onAuthStateChange` is set up; clear it in every path that calls `setLoading(false)` and in the cleanup return:
```js
const authTimeout = setTimeout(() => { if (isMounted) setLoading(false); }, 5000);
// ... in every setLoading(false) path:
clearTimeout(authTimeout);
// ... in cleanup:
return () => { isMounted = false; clearTimeout(authTimeout); subscription.unsubscribe(); };
```

**useProfileCheck** — add a 6 s timeout at the top of `fetchProfile`; clear it in the cache-hit early return and in the `finally` block:
```js
const profileTimeout = setTimeout(() => {
  if (isMountedRef.current) { setData({ ...safeDefaults }); setLoading(false); }
}, 6000);
// ... cache hit: clearTimeout(profileTimeout); return;
// ... finally: clearTimeout(profileTimeout);
```

**main.tsx** — hide the HTML loader after React's first paint using double-rAF, with a 3 s hard fallback:
```js
requestAnimationFrame(() => { requestAnimationFrame(hideLoader); });
setTimeout(hideLoader, 3000);
```

**Why:** Cloud environments (Vercel, Cloudflare) can drop TCP connections silently; Supabase SDK does not have a built-in request timeout. Without a fallback the loading state stays `true` forever.
