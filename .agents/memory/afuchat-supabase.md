---
name: AfuChat Supabase query patterns
description: Correct DB query patterns, table schemas, and FK join syntax
---

## Key column facts
- posts.is_blocked: boolean (false/true), NOT nullable — use .neq('is_blocked', true)
- posts.visibility: text — value is 'public' for all public posts
- profiles.platinum_until: timestamp — if > NOW() user is premium (not a boolean is_premium)
- profiles.is_admin: boolean — check for admin role
- notifications: column is `is_read` (boolean), NOT `read`
- stories: columns are id, user_id, media_url, media_type, expires_at, created_at, privacy (NO `type` column)
- chats: has last_message, last_message_at, is_group, avatar_url, is_channel

## Working FK join syntax (PostgREST)
- posts → profiles: `profiles!author_id(display_name, handle, avatar_url, is_verified)`
- stories → profiles: `profiles!user_id(display_name, handle, avatar_url, is_verified)`

## Post counts
- 211 visible posts (is_blocked=false AND visibility='public') as of June 2026

## Supabase project
- Project ID: rhnsjqqtdzlkvqazfcbg
- CDN: cdn.afuchat.com (avatars, post images, video thumbnails)
- Anon key hardcoded in src/integrations/supabase/client.ts (intentional, public)
