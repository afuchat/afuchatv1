---
name: AfuChat rebuild patterns
description: Architecture decisions, TypeScript workarounds, and UI patterns from the major rebuild
---

## Layout
- New Layout.tsx: fixed 260px sidebar on desktop (md:), sticky 56px header + 60px bottom tabs on mobile
- Bottom tabs: Home, Explore, Gifts, Alerts, + Create (center), Profile
- React Query staleTime 5min / gcTime 30min for all layout data (profile, notif counts)
- User profile uses `as unknown as LayoutProfile` cast because generated types lag actual DB schema

## Feed
- useFeed.ts: use `(supabase as any).from('posts')` to avoid TypeScript overload errors
- Posts filter: `.neq('is_blocked', true)` NOT `.is('is_blocked', null)` (column has boolean values false/true)
- Posts filter: `.eq('visibility', 'public')` — all existing posts have visibility='public'
- Profiles join: `profiles!author_id(...)` works for the posts → profiles FK join
- Infinite query: initialPageParam: 0, PAGE_SIZE: 15, staleTime: 5min

## TypeScript workarounds (generated types lag DB)
- Any column not in generated types: cast query to `(supabase as any).from(...)`
- Cast results: `as unknown as TargetType[]` when Supabase infers GenericStringError
- Notifications table: `is_read` in TS types (not `read`)
- profiles columns is_admin, platinum_until: not in generated types → cast result

## Deleted pages (~30 removed)
ChristmasGifts, MemoryGame, PuzzleGame, SimpleGame, Games, SocialHub, DesktopChats,
WhatsNew, DeveloperSDK, AdManager, RedEnvelope, BusinessDashboard, AffiliateRequest,
ChangePassword, Onboarding, FoodDelivery, Bookings, Rides, Travel, RestaurantDetail,
FlightDetail, HotelDetail, ServiceDetail, MerchantOrders, MerchantOrderDetail,
MiniProgramOrders, MiniProgramOrderDetail, AfuMail (AfuMailCallback), UnifiedLeaderboard,
AdminAffiliateRequests, AdminVerificationRequests, AdminCreatorWithdrawals, UserNotFound, Index

## App config
- MAINTENANCE_MODE was `true` in src/config/app.ts — set to false for dev
- AuthContextType only has: user, session, loading — no signOut method

## Data efficiency strategy
- Always select specific columns, never SELECT *
- pagination: range(from, to) with PAGE_SIZE=15
- staleTime: 5min, gcTime: 30min across all queries
- Images: loading="lazy" on all img tags
- No realtime subscriptions on feed (only active chat should use realtime)
