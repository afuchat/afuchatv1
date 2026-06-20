-- Add chat organization features

-- Add pinning, favoriting, and archiving columns to chats table
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Create chat folders table
CREATE TABLE IF NOT EXISTS chat_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT '📁',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create chat labels table
CREATE TABLE IF NOT EXISTS chat_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#8b5cf6',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create chat folder assignments
CREATE TABLE IF NOT EXISTS chat_folder_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES chat_folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(chat_id, folder_id, user_id)
);

-- Create chat label assignments
CREATE TABLE IF NOT EXISTS chat_label_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES chat_labels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(chat_id, label_id, user_id)
);

-- Enable RLS
ALTER TABLE chat_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_folder_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_label_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_folders
CREATE POLICY "Users can view their own folders"
  ON chat_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON chat_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON chat_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON chat_folders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_labels
CREATE POLICY "Users can view their own labels"
  ON chat_labels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own labels"
  ON chat_labels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labels"
  ON chat_labels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labels"
  ON chat_labels FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_folder_assignments
CREATE POLICY "Users can view their own folder assignments"
  ON chat_folder_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folder assignments"
  ON chat_folder_assignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folder assignments"
  ON chat_folder_assignments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_label_assignments
CREATE POLICY "Users can view their own label assignments"
  ON chat_label_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own label assignments"
  ON chat_label_assignments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own label assignments"
  ON chat_label_assignments FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_folders_user_id ON chat_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_labels_user_id ON chat_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_folder_assignments_chat_id ON chat_folder_assignments(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_folder_assignments_folder_id ON chat_folder_assignments(folder_id);
CREATE INDEX IF NOT EXISTS idx_chat_label_assignments_chat_id ON chat_label_assignments(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_label_assignments_label_id ON chat_label_assignments(label_id);
CREATE INDEX IF NOT EXISTS idx_chats_pinned ON chats(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_chats_favorite ON chats(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_chats_archived ON chats(is_archived) WHERE is_archived = true;