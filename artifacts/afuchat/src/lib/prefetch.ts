const routeChunks: Record<string, () => Promise<unknown>> = {
  '/search': () => import('@/pages/Search'),
  '/notifications': () => import('@/pages/Notifications'),
  '/chats': () => import('@/pages/Chats'),
  '/moments': () => import('@/pages/Moments'),
  '/gifts': () => import('@/pages/Gifts'),
  '/gifts/:id': () => import('@/pages/GiftDetail'),
  '/wallet': () => import('@/pages/FinancialHub'),
  '/marketplace': () => import('@/pages/Marketplace'),
  '/events': () => import('@/pages/Events'),
  '/shorts': () => import('@/pages/MusicShorts'),
  '/mini-programs': () => import('@/pages/MiniPrograms'),
  '/afuai': () => import('@/pages/AfuAI'),
  '/creator-earnings': () => import('@/pages/CreatorEarnings'),
  '/affiliate-dashboard': () => import('@/pages/AffiliateDashboard'),
  '/premium': () => import('@/pages/Premium'),
  '/settings': () => import('@/pages/Settings'),
  '/security': () => import('@/pages/SecurityDashboard'),
  '/transfer': () => import('@/pages/Transfer'),
};

const prefetched = new Set<string>();

export function prefetch(path: string): void {
  if (prefetched.has(path)) return;
  prefetched.add(path);
  routeChunks[path]?.().catch(() => {});
}
