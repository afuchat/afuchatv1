-- Add banner_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Create storage bucket for profile banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-banners', 'profile-banners', true)
ON CONFLICT (id) DO NOTHING;