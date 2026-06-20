-- CRITICAL FIX: Drop the overly permissive RLS policy that exposes all profile columns
-- This policy was added in migration 20251217112350 and allows anyone to read sensitive PII/financial data
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;