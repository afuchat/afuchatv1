# AfuChat

A full-featured social super-app with chat, feed, gifts, payments, marketplace, mini-programs, and more — powered by Supabase backend and running on Replit.

## Run & Operate

- `pnpm --filter @workspace/afuchat run dev` — run the frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18, Vite, Tailwind CSS v3, shadcn/ui
- Backend: Supabase (auth, database, storage, realtime, edge functions)
- API: Express 5 (scaffolded, not yet wired to app)
- DB: PostgreSQL + Drizzle ORM (scaffolded, app uses Supabase directly)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/afuchat/src/` — All frontend source code
- `artifacts/afuchat/src/integrations/supabase/` — Supabase client + TypeScript types
- `artifacts/afuchat/src/contexts/AuthContext.tsx` — Auth state management
- `artifacts/afuchat/src/pages/` — All app pages (100+ pages)
- `artifacts/afuchat/src/components/` — Shared components
- `artifacts/afuchat/src/hooks/` — React hooks (many use Supabase directly)
- `artifacts/afuchat/src/lib/afuchat-sdk/` — Local stub for @afuchat/sdk (not on npm)
- `artifacts/api-server/` — Express backend scaffold (unused by app, available for extension)
- `lib/db/` — Drizzle ORM schema (unused by app, Supabase handles data)

## Architecture decisions

- **Supabase as backend**: The app connects directly to the existing Supabase project. All auth, data, realtime, storage, and edge functions go through Supabase, not the Replit API server.
- **Tailwind v3**: The app uses Tailwind v3 with postcss (not @tailwindcss/vite) — the copy script handles this automatically.
- **@afuchat/sdk stub**: The private `@afuchat/sdk` package is not on npm. A local stub at `src/lib/afuchat-sdk/index.ts` satisfies the imports in DeveloperSDK and DeveloperFeatures pages.
- **react-router-dom**: Uses v6 BrowserRouter (not wouter), since the app has complex routing with catch-alls and nested routes.
- **vite-plugin-pwa + @twa-dev/sdk**: Telegram Mini App support is baked in; the Telegram WebView event logs in console are expected.

## Product

AfuChat is a social super-app featuring: social feed, messaging/chat, user profiles, a gift marketplace, financial hub (wallet/transfers), mini-programs platform, food delivery, travel/bookings/rides, events, creator earnings, an affiliate program, an AI assistant (AfuAI), AfuMail (email), moments/stories, music shorts, a developer SDK, and admin tools.

## User preferences

- Keep Supabase as the backend — do not replace with Replit primitives unless explicitly asked.

## Gotchas

- The Supabase URL and anon key are hardcoded in `src/integrations/supabase/client.ts` — this is intentional for a public anon key.
- `@afuchat/sdk` is a private package not on npm. Any new references must use the local stub at `@/lib/afuchat-sdk`.
- Do not run `pnpm dev` at the workspace root — use the workflow or `pnpm --filter @workspace/afuchat run dev`.
- Telegram WebView postEvent logs in browser console are expected — the app is built as a Telegram Mini App.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
