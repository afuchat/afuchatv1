export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      acoin_transactions: {
        Row: {
          amount: number
          created_at: string | null
          fee_charged: number | null
          id: string
          metadata: Json | null
          nexa_spent: number | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          fee_charged?: number | null
          id?: string
          metadata?: Json | null
          nexa_spent?: number | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          fee_charged?: number | null
          id?: string
          metadata?: Json | null
          nexa_spent?: number | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acoin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      active_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_name: string | null
          expires_at: string
          id: string
          ip_address: string | null
          last_active: string
          session_token: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_name?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          last_active?: string
          session_token: string
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_name?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_active?: string
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          ad_type: string
          clicks: number
          content: string | null
          created_at: string
          daily_budget: number
          end_date: string | null
          id: string
          image_url: string | null
          impressions: number
          placement: string
          post_id: string | null
          product_id: string | null
          start_date: string
          status: string
          target_url: string | null
          title: string | null
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_type: string
          clicks?: number
          content?: string | null
          created_at?: string
          daily_budget?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          placement?: string
          post_id?: string | null
          product_id?: string | null
          start_date?: string
          status?: string
          target_url?: string | null
          title?: string | null
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_type?: string
          clicks?: number
          content?: string | null
          created_at?: string
          daily_budget?: number
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          placement?: string
          post_id?: string | null
          product_id?: string | null
          start_date?: string
          status?: string
          target_url?: string | null
          title?: string | null
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merchant_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_clicks: {
        Row: {
          ad_id: string
          clicker_id: string | null
          created_at: string
          id: string
          placement: string
        }
        Insert: {
          ad_id: string
          clicker_id?: string | null
          created_at?: string
          id?: string
          placement: string
        }
        Update: {
          ad_id?: string
          clicker_id?: string | null
          created_at?: string
          id?: string
          placement?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_clicks_clicker_id_fkey"
            columns: ["clicker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_clicks_clicker_id_fkey"
            columns: ["clicker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          placement: string
          viewer_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          placement: string
          viewer_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          placement?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_requests: {
        Row: {
          business_profile_id: string
          commission_rate: number | null
          id: string
          notes: string | null
          payment_terms: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          business_profile_id: string
          commission_rate?: number | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          business_profile_id?: string
          commission_rate?: number | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_requests_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_requests_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_at: string | null
          blocked_id: string
          blocker_id: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_id: string
          blocker_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_id?: string
          blocker_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_folder_assignments: {
        Row: {
          assigned_at: string | null
          chat_id: string
          folder_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          chat_id: string
          folder_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          chat_id?: string
          folder_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_folder_assignments_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_folder_assignments_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "chat_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_folder_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_folder_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_folders: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_label_assignments: {
        Row: {
          assigned_at: string | null
          chat_id: string
          id: string
          label_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          chat_id: string
          id?: string
          label_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          chat_id?: string
          id?: string
          label_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_label_assignments_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "chat_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_label_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_label_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_labels: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_labels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_labels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          chat_id: string | null
          id: string
          is_admin: boolean | null
          joined_at: string | null
          user_id: string | null
        }
        Insert: {
          chat_id?: string | null
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          user_id?: string | null
        }
        Update: {
          chat_id?: string | null
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_preferences: {
        Row: {
          auto_download: boolean | null
          bubble_style: string | null
          chat_lock: boolean | null
          chat_theme: string | null
          created_at: string | null
          font_size: number | null
          id: string
          media_quality: string | null
          read_receipts: boolean | null
          sounds_enabled: boolean | null
          theme_id: string | null
          updated_at: string | null
          user_id: string
          wallpaper: string | null
          wallpaper_id: string | null
        }
        Insert: {
          auto_download?: boolean | null
          bubble_style?: string | null
          chat_lock?: boolean | null
          chat_theme?: string | null
          created_at?: string | null
          font_size?: number | null
          id?: string
          media_quality?: string | null
          read_receipts?: boolean | null
          sounds_enabled?: boolean | null
          theme_id?: string | null
          updated_at?: string | null
          user_id: string
          wallpaper?: string | null
          wallpaper_id?: string | null
        }
        Update: {
          auto_download?: boolean | null
          bubble_style?: string | null
          chat_lock?: boolean | null
          chat_theme?: string | null
          created_at?: string | null
          font_size?: number | null
          id?: string
          media_quality?: string | null
          read_receipts?: boolean | null
          sounds_enabled?: boolean | null
          theme_id?: string | null
          updated_at?: string | null
          user_id?: string
          wallpaper?: string | null
          wallpaper_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_preferences_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "chat_themes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_preferences_wallpaper_id_fkey"
            columns: ["wallpaper_id"]
            isOneToOne: false
            referencedRelation: "chat_wallpapers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_themes: {
        Row: {
          colors: Json
          created_at: string | null
          generated_prompt: string
          id: string
          image_url: string | null
          is_premium: boolean | null
          name: string
        }
        Insert: {
          colors: Json
          created_at?: string | null
          generated_prompt: string
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          name: string
        }
        Update: {
          colors?: Json
          created_at?: string | null
          generated_prompt?: string
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          name?: string
        }
        Relationships: []
      }
      chat_wallpapers: {
        Row: {
          created_at: string | null
          generated_prompt: string
          id: string
          image_url: string
          is_premium: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          generated_prompt: string
          id?: string
          image_url: string
          is_premium?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          generated_prompt?: string
          id?: string
          image_url?: string
          is_premium?: boolean | null
          name?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          is_channel: boolean | null
          is_favorite: boolean | null
          is_group: boolean | null
          is_pinned: boolean | null
          is_system_notifications: boolean | null
          is_verified: boolean | null
          member_limit: number | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_channel?: boolean | null
          is_favorite?: boolean | null
          is_group?: boolean | null
          is_pinned?: boolean | null
          is_system_notifications?: boolean | null
          is_verified?: boolean | null
          member_limit?: number | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          is_channel?: boolean | null
          is_favorite?: boolean | null
          is_group?: boolean | null
          is_pinned?: boolean | null
          is_system_notifications?: boolean | null
          is_verified?: boolean | null
          member_limit?: number | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          amount_ugx: number
          created_at: string
          earned_date: string
          engagement_score: number
          id: string
          likes_count: number
          user_id: string
          views_count: number
        }
        Insert: {
          amount_ugx?: number
          created_at?: string
          earned_date?: string
          engagement_score?: number
          id?: string
          likes_count?: number
          user_id: string
          views_count?: number
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          earned_date?: string
          engagement_score?: number
          id?: string
          likes_count?: number
          user_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_withdrawals: {
        Row: {
          amount_ugx: number
          id: string
          mobile_network: string
          notes: string | null
          phone_number: string
          processed_at: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount_ugx: number
          id?: string
          mobile_network: string
          notes?: string | null
          phone_number: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount_ugx?: number
          id?: string
          mobile_network?: string
          notes?: string | null
          phone_number?: string
          processed_at?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_settings: {
        Row: {
          conversion_fee_percent: number | null
          id: string
          nexa_to_acoin_rate: number | null
          p2p_fee_percent: number | null
          updated_at: string | null
        }
        Insert: {
          conversion_fee_percent?: number | null
          id?: string
          nexa_to_acoin_rate?: number | null
          p2p_fee_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          conversion_fee_percent?: number | null
          id?: string
          nexa_to_acoin_rate?: number | null
          p2p_fee_percent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      developer_applications: {
        Row: {
          created_at: string
          experience_level: string | null
          github_username: string | null
          id: string
          portfolio_url: string | null
          reason: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skills: string[] | null
          status: Database["public"]["Enums"]["developer_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_level?: string | null
          github_username?: string | null
          id?: string
          portfolio_url?: string | null
          reason: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[] | null
          status?: Database["public"]["Enums"]["developer_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          experience_level?: string | null
          github_username?: string | null
          id?: string
          portfolio_url?: string | null
          reason?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[] | null
          status?: Database["public"]["Enums"]["developer_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      developer_roles: {
        Row: {
          features_enabled: string[] | null
          granted_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          features_enabled?: string[] | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          features_enabled?: string[] | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      follow_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_challenges: {
        Row: {
          challenger_id: string
          challenger_score: number | null
          completed_at: string | null
          created_at: string
          difficulty: string
          game_type: string
          id: string
          opponent_id: string
          opponent_score: number | null
          status: string
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          challenger_score?: number | null
          completed_at?: string | null
          created_at?: string
          difficulty: string
          game_type: string
          id?: string
          opponent_id: string
          opponent_score?: number | null
          status?: string
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          challenger_score?: number | null
          completed_at?: string | null
          created_at?: string
          difficulty?: string
          game_type?: string
          id?: string
          opponent_id?: string
          opponent_score?: number | null
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string
          current_target_x: number | null
          current_target_y: number | null
          ended_at: string | null
          game_state: Json | null
          game_type: string
          guest_id: string | null
          guest_score: number
          host_id: string
          host_score: number
          id: string
          max_rounds: number
          player_data: Json | null
          room_code: string
          round: number
          started_at: string | null
          status: string
          target_spawned_at: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          current_target_x?: number | null
          current_target_y?: number | null
          ended_at?: string | null
          game_state?: Json | null
          game_type?: string
          guest_id?: string | null
          guest_score?: number
          host_id: string
          host_score?: number
          id?: string
          max_rounds?: number
          player_data?: Json | null
          room_code: string
          round?: number
          started_at?: string | null
          status?: string
          target_spawned_at?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          current_target_x?: number | null
          current_target_y?: number | null
          ended_at?: string | null
          game_state?: Json | null
          game_type?: string
          guest_id?: string | null
          guest_score?: number
          host_id?: string
          host_score?: number
          id?: string
          max_rounds?: number
          player_data?: Json | null
          room_code?: string
          round?: number
          started_at?: string | null
          status?: string
          target_spawned_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rooms_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rooms_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rooms_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rooms_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scores: {
        Row: {
          created_at: string
          difficulty: string
          game_type: string
          id: string
          metadata: Json | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty: string
          game_type: string
          id?: string
          metadata?: Json | null
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          game_type?: string
          id?: string
          metadata?: Json | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          challenge_id: string | null
          completed: boolean
          created_at: string
          id: string
          metadata: Json | null
          player_id: string
          score: number
          updated_at: string
        }
        Insert: {
          challenge_id?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          metadata?: Json | null
          player_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          challenge_id?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          metadata?: Json | null
          player_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "game_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_statistics: {
        Row: {
          gift_id: string
          id: string
          last_sale_price: number | null
          last_updated: string | null
          price_multiplier: number
          total_sent: number
        }
        Insert: {
          gift_id: string
          id?: string
          last_sale_price?: number | null
          last_updated?: string | null
          price_multiplier?: number
          total_sent?: number
        }
        Update: {
          gift_id?: string
          id?: string
          last_sale_price?: number | null
          last_updated?: string | null
          price_multiplier?: number
          total_sent?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_statistics_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: true
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_transactions: {
        Row: {
          created_at: string | null
          gift_id: string
          id: string
          is_anonymous: boolean | null
          message: string | null
          receiver_id: string
          sender_id: string
          xp_cost: number
        }
        Insert: {
          created_at?: string | null
          gift_id: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          receiver_id: string
          sender_id: string
          xp_cost: number
        }
        Update: {
          created_at?: string | null
          gift_id?: string
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          receiver_id?: string
          sender_id?: string
          xp_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_transactions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          available_from: string | null
          available_until: string | null
          base_xp_cost: number
          created_at: string | null
          description: string | null
          emoji: string
          id: string
          image_url: string | null
          name: string
          rarity: string
          season: string | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          base_xp_cost: number
          created_at?: string | null
          description?: string | null
          emoji: string
          id?: string
          image_url?: string | null
          name: string
          rarity?: string
          season?: string | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          base_xp_cost?: number
          created_at?: string | null
          description?: string | null
          emoji?: string
          id?: string
          image_url?: string | null
          name?: string
          rarity?: string
          season?: string | null
        }
        Relationships: []
      }
      linked_accounts: {
        Row: {
          id: string
          linked_at: string
          linked_user_id: string
          primary_user_id: string
        }
        Insert: {
          id?: string
          linked_at?: string
          linked_user_id: string
          primary_user_id: string
        }
        Update: {
          id?: string
          linked_at?: string
          linked_user_id?: string
          primary_user_id?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          location: string | null
          login_time: string
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          login_time?: string
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          login_time?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          asking_price: number
          created_at: string | null
          gift_id: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asking_price: number
          created_at?: string | null
          gift_id: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asking_price?: number
          created_at?: string | null
          gift_id?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_customer_chats: {
        Row: {
          chat_id: string
          created_at: string | null
          customer_id: string
          id: string
          merchant_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          merchant_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_customer_chats_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_customer_chats_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_price: number
          quantity: number
          subtotal: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_price: number
          quantity: number
          subtotal: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_price?: number
          quantity?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "merchant_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "merchant_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merchant_products"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_orders: {
        Row: {
          buyer_id: string
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          merchant_id: string
          notes: string | null
          order_number: string
          payment_status: string
          status: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          merchant_id: string
          notes?: string | null
          order_number: string
          payment_status?: string
          status?: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          merchant_id?: string
          notes?: string | null
          order_number?: string
          payment_status?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_products: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          external_id: string
          id: string
          image_url: string | null
          is_available: boolean | null
          merchant_id: string
          name: string
          price: number
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          external_id: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          merchant_id: string
          name: string
          price: number
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          external_id?: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          merchant_id?: string
          name?: string
          price?: number
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_wallet: {
        Row: {
          id: string
          merchant_id: string
          total_commission_owed: number | null
          total_commission_paid: number | null
          total_sales: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          merchant_id: string
          total_commission_owed?: number | null
          total_commission_paid?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          merchant_id?: string
          total_commission_owed?: number | null
          total_commission_paid?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_wallet_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          api_endpoint: string
          api_key: string | null
          commission_rate: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          logo_url: string | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_endpoint: string
          api_key?: string | null
          commission_rate?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_endpoint?: string
          api_key?: string | null
          commission_rate?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reports: {
        Row: {
          created_at: string
          id: string
          message_content: string | null
          message_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_content?: string | null
          message_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_content?: string | null
          message_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_status: {
        Row: {
          delivered_at: string | null
          id: string
          message_id: string | null
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          delivered_at?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          delivered_at?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_views: {
        Row: {
          id: string
          message_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          message_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          message_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_views_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          audio_url: string | null
          chat_id: string | null
          delivered_at: string | null
          edited_at: string | null
          encrypted_content: string
          id: string
          order_context: Json | null
          read_at: string | null
          reply_to_message_id: string | null
          sender_id: string | null
          sent_at: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          audio_url?: string | null
          chat_id?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          encrypted_content: string
          id?: string
          order_context?: Json | null
          read_at?: string | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          audio_url?: string | null
          chat_id?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          encrypted_content?: string
          id?: string
          order_context?: Json | null
          read_at?: string | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_programs: {
        Row: {
          apk_url: string | null
          app_type: string | null
          category: string
          created_at: string
          description: string | null
          developer_email: string | null
          developer_id: string
          features: string | null
          icon_url: string | null
          id: string
          image_url: string | null
          install_count: number
          is_published: boolean
          name: string
          privacy_url: string | null
          rating: number | null
          screenshots: string[] | null
          status: string
          target_countries: string[] | null
          terms_url: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          apk_url?: string | null
          app_type?: string | null
          category: string
          created_at?: string
          description?: string | null
          developer_email?: string | null
          developer_id: string
          features?: string | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          install_count?: number
          is_published?: boolean
          name: string
          privacy_url?: string | null
          rating?: number | null
          screenshots?: string[] | null
          status?: string
          target_countries?: string[] | null
          terms_url?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          apk_url?: string | null
          app_type?: string | null
          category?: string
          created_at?: string
          description?: string | null
          developer_email?: string | null
          developer_id?: string
          features?: string | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          install_count?: number
          is_published?: boolean
          name?: string
          privacy_url?: string | null
          rating?: number | null
          screenshots?: string[] | null
          status?: string
          target_countries?: string[] | null
          terms_url?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_programs_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mini_programs_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_digest_frequency: string | null
          email_enabled: boolean | null
          email_follows: boolean | null
          email_gifts: boolean | null
          email_likes: boolean | null
          email_mentions: boolean | null
          email_messages: boolean | null
          email_replies: boolean | null
          id: string
          push_enabled: boolean | null
          push_follows: boolean | null
          push_gifts: boolean | null
          push_likes: boolean | null
          push_mentions: boolean | null
          push_messages: boolean | null
          push_replies: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_digest_frequency?: string | null
          email_enabled?: boolean | null
          email_follows?: boolean | null
          email_gifts?: boolean | null
          email_likes?: boolean | null
          email_mentions?: boolean | null
          email_messages?: boolean | null
          email_replies?: boolean | null
          id?: string
          push_enabled?: boolean | null
          push_follows?: boolean | null
          push_gifts?: boolean | null
          push_likes?: boolean | null
          push_mentions?: boolean | null
          push_messages?: boolean | null
          push_replies?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_digest_frequency?: string | null
          email_enabled?: boolean | null
          email_follows?: boolean | null
          email_gifts?: boolean | null
          email_likes?: boolean | null
          email_mentions?: boolean | null
          email_messages?: boolean | null
          email_replies?: boolean | null
          id?: string
          push_enabled?: boolean | null
          push_follows?: boolean | null
          push_gifts?: boolean | null
          push_likes?: boolean | null
          push_mentions?: boolean | null
          push_messages?: boolean | null
          push_replies?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          id: string
          is_read: boolean
          post_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          post_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          post_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_gifts: {
        Row: {
          gift_id: string
          id: string
          pinned_at: string
          user_id: string
        }
        Insert: {
          gift_id: string
          id?: string
          pinned_at?: string
          user_id: string
        }
        Update: {
          gift_id?: string
          id?: string
          pinned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_gifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_gifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_acknowledgments: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_acknowledgments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_ai_summaries: {
        Row: {
          created_at: string
          id: string
          post_id: string
          summary: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          summary: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_ai_summaries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          display_order: number
          id: string
          image_url: string
          post_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          image_url: string
          post_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          image_url?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_link_previews: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          post_id: string
          site_name: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          post_id: string
          site_name?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          post_id?: string
          site_name?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_link_previews_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_replies: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          parent_reply_id: string | null
          pinned_at: string | null
          pinned_by: string | null
          post_id: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          parent_reply_id?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          post_id?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          parent_reply_id?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "post_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          id: string
          post_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          post_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          post_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          blocked_reason: string | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_blocked: boolean | null
          language_code: string | null
          quoted_post_id: string | null
          updated_at: string | null
          view_count: number
        }
        Insert: {
          author_id?: string | null
          blocked_reason?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_blocked?: boolean | null
          language_code?: string | null
          quoted_post_id?: string | null
          updated_at?: string | null
          view_count?: number
        }
        Update: {
          author_id?: string | null
          blocked_reason?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_blocked?: boolean | null
          language_code?: string | null
          quoted_post_id?: string | null
          updated_at?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "supported_languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "posts_quoted_post_id_fkey"
            columns: ["quoted_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          profile_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          profile_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          profile_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acoin: number | null
          affiliate_earnings: number | null
          affiliated_business_id: string | null
          ai_chat_id: string | null
          available_balance_ugx: number
          available_for_hire: boolean | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          banner_url: string | null
          bio: string | null
          business_category: string | null
          country: string | null
          created_at: string | null
          current_grade: string | null
          date_of_birth: string | null
          developer_tagline: string | null
          display_name: string
          github_url: string | null
          handle: string
          hide_followers_list: boolean | null
          hide_following_list: boolean | null
          hide_on_leaderboard: boolean | null
          id: string
          is_admin: boolean | null
          is_affiliate: boolean | null
          is_banned: boolean | null
          is_business_mode: boolean
          is_organization_verified: boolean | null
          is_private: boolean | null
          is_verified: boolean | null
          is_warned: boolean | null
          language: string | null
          last_login_date: string | null
          last_seen: string | null
          login_streak: number | null
          missed_earnings_total: number | null
          phone_number: string | null
          portfolio_url: string | null
          profile_completion_rewarded: boolean | null
          show_balance: boolean | null
          show_online_status: boolean | null
          show_read_receipts: boolean | null
          updated_at: string | null
          verification_source: string | null
          warned_at: string | null
          warned_by: string | null
          warning_reason: string | null
          website_url: string | null
          withdrawal_network: string | null
          withdrawal_phone: string | null
          xp: number
        }
        Insert: {
          acoin?: number | null
          affiliate_earnings?: number | null
          affiliated_business_id?: string | null
          ai_chat_id?: string | null
          available_balance_ugx?: number
          available_for_hire?: boolean | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          banner_url?: string | null
          bio?: string | null
          business_category?: string | null
          country?: string | null
          created_at?: string | null
          current_grade?: string | null
          date_of_birth?: string | null
          developer_tagline?: string | null
          display_name: string
          github_url?: string | null
          handle: string
          hide_followers_list?: boolean | null
          hide_following_list?: boolean | null
          hide_on_leaderboard?: boolean | null
          id: string
          is_admin?: boolean | null
          is_affiliate?: boolean | null
          is_banned?: boolean | null
          is_business_mode?: boolean
          is_organization_verified?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          is_warned?: boolean | null
          language?: string | null
          last_login_date?: string | null
          last_seen?: string | null
          login_streak?: number | null
          missed_earnings_total?: number | null
          phone_number?: string | null
          portfolio_url?: string | null
          profile_completion_rewarded?: boolean | null
          show_balance?: boolean | null
          show_online_status?: boolean | null
          show_read_receipts?: boolean | null
          updated_at?: string | null
          verification_source?: string | null
          warned_at?: string | null
          warned_by?: string | null
          warning_reason?: string | null
          website_url?: string | null
          withdrawal_network?: string | null
          withdrawal_phone?: string | null
          xp?: number
        }
        Update: {
          acoin?: number | null
          affiliate_earnings?: number | null
          affiliated_business_id?: string | null
          ai_chat_id?: string | null
          available_balance_ugx?: number
          available_for_hire?: boolean | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          banner_url?: string | null
          bio?: string | null
          business_category?: string | null
          country?: string | null
          created_at?: string | null
          current_grade?: string | null
          date_of_birth?: string | null
          developer_tagline?: string | null
          display_name?: string
          github_url?: string | null
          handle?: string
          hide_followers_list?: boolean | null
          hide_following_list?: boolean | null
          hide_on_leaderboard?: boolean | null
          id?: string
          is_admin?: boolean | null
          is_affiliate?: boolean | null
          is_banned?: boolean | null
          is_business_mode?: boolean
          is_organization_verified?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          is_warned?: boolean | null
          language?: string | null
          last_login_date?: string | null
          last_seen?: string | null
          login_streak?: number | null
          missed_earnings_total?: number | null
          phone_number?: string | null
          portfolio_url?: string | null
          profile_completion_rewarded?: boolean | null
          show_balance?: boolean | null
          show_online_status?: boolean | null
          show_read_receipts?: boolean | null
          updated_at?: string | null
          verification_source?: string | null
          warned_at?: string | null
          warned_by?: string | null
          warning_reason?: string | null
          website_url?: string | null
          withdrawal_network?: string | null
          withdrawal_phone?: string | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_affiliated_business_id_fkey"
            columns: ["affiliated_business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_affiliated_business_id_fkey"
            columns: ["affiliated_business_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ai_chat_id_fkey"
            columns: ["ai_chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_language_fkey"
            columns: ["language"]
            isOneToOne: false
            referencedRelation: "supported_languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_warned_by_fkey"
            columns: ["warned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_warned_by_fkey"
            columns: ["warned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      red_envelope_claims: {
        Row: {
          amount: number
          claimed_at: string
          claimer_id: string
          id: string
          red_envelope_id: string
        }
        Insert: {
          amount: number
          claimed_at?: string
          claimer_id: string
          id?: string
          red_envelope_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string
          claimer_id?: string
          id?: string
          red_envelope_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "red_envelope_claims_claimer_id_fkey"
            columns: ["claimer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_envelope_claims_claimer_id_fkey"
            columns: ["claimer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_envelope_claims_red_envelope_id_fkey"
            columns: ["red_envelope_id"]
            isOneToOne: false
            referencedRelation: "red_envelopes"
            referencedColumns: ["id"]
          },
        ]
      }
      red_envelopes: {
        Row: {
          chat_id: string | null
          claimed_count: number
          created_at: string
          envelope_type: string
          expires_at: string
          id: string
          is_expired: boolean
          message: string | null
          recipient_count: number
          sender_id: string
          total_amount: number
        }
        Insert: {
          chat_id?: string | null
          claimed_count?: number
          created_at?: string
          envelope_type?: string
          expires_at: string
          id?: string
          is_expired?: boolean
          message?: string | null
          recipient_count: number
          sender_id: string
          total_amount: number
        }
        Update: {
          chat_id?: string | null
          claimed_count?: number
          created_at?: string
          envelope_type?: string
          expires_at?: string
          id?: string
          is_expired?: boolean
          message?: string | null
          recipient_count?: number
          sender_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "red_envelopes_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_envelopes_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_envelopes_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          rewarded: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          rewarded?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          rewarded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_message: string
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          user_id: string
        }
        Insert: {
          alert_message: string
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean
          user_id: string
        }
        Update: {
          alert_message?: string
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          user_id?: string
        }
        Relationships: []
      }
      shopping_cart: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_cart_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merchant_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_cart_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_cart_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
          view_count: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at: string
          id?: string
          media_type: string
          media_url: string
          user_id: string
          view_count?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          acoin_price: number
          created_at: string | null
          description: string | null
          duration_days: number
          features: Json | null
          grants_verification: boolean | null
          id: string
          is_active: boolean | null
          name: string
          tier: string | null
        }
        Insert: {
          acoin_price: number
          created_at?: string | null
          description?: string | null
          duration_days?: number
          features?: Json | null
          grants_verification?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          tier?: string | null
        }
        Update: {
          acoin_price?: number
          created_at?: string | null
          description?: string | null
          duration_days?: number
          features?: Json | null
          grants_verification?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          tier?: string | null
        }
        Relationships: []
      }
      supported_languages: {
        Row: {
          code: string
          created_at: string | null
          name: string
          native_name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          name: string
          native_name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          name?: string
          native_name?: string
        }
        Relationships: []
      }
      telegram_users: {
        Row: {
          created_at: string
          current_menu: string | null
          id: string
          is_linked: boolean | null
          link_token: string | null
          link_token_expires_at: string | null
          menu_data: Json | null
          telegram_first_name: string | null
          telegram_id: number
          telegram_last_name: string | null
          telegram_username: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_menu?: string | null
          id?: string
          is_linked?: boolean | null
          link_token?: string | null
          link_token_expires_at?: string | null
          menu_data?: Json | null
          telegram_first_name?: string | null
          telegram_id: number
          telegram_last_name?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_menu?: string | null
          id?: string
          is_linked?: boolean | null
          link_token?: string | null
          link_token_expires_at?: string | null
          menu_data?: Json | null
          telegram_first_name?: string | null
          telegram_id?: number
          telegram_last_name?: string | null
          telegram_username?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_verification_codes: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          telegram_chat_id: string
          user_id: string
          verification_code: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          telegram_chat_id: string
          user_id: string
          verification_code: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          telegram_chat_id?: string
          user_id?: string
          verification_code?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      tips: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          post_id: string | null
          receiver_id: string
          sender_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          post_id?: string | null
          receiver_id: string
          sender_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          post_id?: string | null
          receiver_id?: string
          sender_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "tips_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          chat_id: string | null
          id: string
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          chat_id?: string | null
          id?: string
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          chat_id?: string | null
          id?: string
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_type: string
          earned_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_type: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_type?: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
          xp_earned: number
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      user_gifts: {
        Row: {
          acquired_at: string
          gift_id: string
          id: string
          is_pinned: boolean | null
          pin_order: number | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          gift_id: string
          id?: string
          is_pinned?: boolean | null
          pin_order?: number | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          gift_id?: string
          id?: string
          is_pinned?: boolean | null
          pin_order?: number | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_gifts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "gift_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mini_programs: {
        Row: {
          id: string
          installed_at: string
          mini_program_id: string
          user_id: string
        }
        Insert: {
          id?: string
          installed_at?: string
          mini_program_id: string
          user_id: string
        }
        Update: {
          id?: string
          installed_at?: string
          mini_program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mini_programs_mini_program_id_fkey"
            columns: ["mini_program_id"]
            isOneToOne: false
            referencedRelation: "mini_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mini_programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mini_programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_product_listings: {
        Row: {
          acoin_price: number
          category: string | null
          country: string
          created_at: string | null
          currency: string
          description: string | null
          id: string
          images: string[] | null
          is_available: boolean | null
          price: number
          seller_id: string
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          acoin_price?: number
          category?: string | null
          country: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          price: number
          seller_id: string
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          acoin_price?: number
          category?: string | null
          country?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_available?: boolean | null
          price?: number
          seller_id?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_product_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_product_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          additional_info: string | null
          created_at: string
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          additional_info?: string | null
          created_at?: string
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          additional_info?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          acoin_paid: number
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          plan_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          acoin_paid: number
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          plan_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          acoin_paid?: number
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          plan_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          account_type: string
          business_registration: string | null
          created_at: string | null
          email: string
          engagement_rate: string | null
          follower_count: string | null
          full_name: string
          id: string
          phone: string | null
          primary_platform: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_links: Json | null
          status: string
          supporting_documents: string[] | null
          tax_id: string | null
          updated_at: string | null
          user_id: string
          verification_reason: string
          website_url: string | null
        }
        Insert: {
          account_type: string
          business_registration?: string | null
          created_at?: string | null
          email: string
          engagement_rate?: string | null
          follower_count?: string | null
          full_name: string
          id?: string
          phone?: string | null
          primary_platform?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: Json | null
          status?: string
          supporting_documents?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
          user_id: string
          verification_reason: string
          website_url?: string | null
        }
        Update: {
          account_type?: string
          business_registration?: string | null
          created_at?: string | null
          email?: string
          engagement_rate?: string | null
          follower_count?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          primary_platform?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: Json | null
          status?: string
          supporting_documents?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string
          verification_reason?: string
          website_url?: string | null
        }
        Relationships: []
      }
      xp_transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transfers_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transfers_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transfers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transfers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          business_category: string | null
          country: string | null
          created_at: string | null
          current_grade: string | null
          display_name: string | null
          handle: string | null
          hide_on_leaderboard: boolean | null
          id: string | null
          is_banned: boolean | null
          is_business_mode: boolean | null
          is_organization_verified: boolean | null
          is_private: boolean | null
          is_verified: boolean | null
          is_warned: boolean | null
          warned_at: string | null
          warning_reason: string | null
          website_url: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          business_category?: string | null
          country?: string | null
          created_at?: string | null
          current_grade?: string | null
          display_name?: string | null
          handle?: string | null
          hide_on_leaderboard?: boolean | null
          id?: string | null
          is_banned?: boolean | null
          is_business_mode?: boolean | null
          is_organization_verified?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          is_warned?: boolean | null
          warned_at?: string | null
          warning_reason?: string | null
          website_url?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          business_category?: string | null
          country?: string | null
          created_at?: string | null
          current_grade?: string | null
          display_name?: string | null
          handle?: string | null
          hide_on_leaderboard?: boolean | null
          id?: string | null
          is_banned?: boolean | null
          is_business_mode?: boolean | null
          is_organization_verified?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          is_warned?: boolean | null
          warned_at?: string | null
          warning_reason?: string | null
          website_url?: string | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_ban_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      admin_process_withdrawal: {
        Args: { p_action: string; p_notes?: string; p_withdrawal_id: string }
        Returns: Json
      }
      admin_remove_warning: { Args: { p_user_id: string }; Returns: Json }
      admin_unban_user: { Args: { p_user_id: string }; Returns: Json }
      admin_warn_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      approve_affiliate_by_business:
        | { Args: { p_request_id: string }; Returns: Json }
        | {
            Args: {
              p_commission_rate?: number
              p_payment_terms?: string
              p_request_id: string
            }
            Returns: Json
          }
      approve_developer_application: {
        Args: { p_application_id: string }
        Returns: Json
      }
      award_xp: {
        Args: {
          p_action_type: string
          p_metadata?: Json
          p_user_id: string
          p_xp_amount: number
        }
        Returns: undefined
      }
      calculate_grade: { Args: { xp_amount: number }; Returns: string }
      can_claim_red_envelope: { Args: { p_user_id: string }; Returns: boolean }
      cancel_active_subscription: { Args: never; Returns: Json }
      charge_ad_daily_budgets: { Args: never; Returns: number }
      check_and_unlock_accessories: {
        Args: { p_user_id: string }
        Returns: Json
      }
      check_creator_eligibility: { Args: { p_user_id: string }; Returns: Json }
      check_daily_login_streak: { Args: { p_user_id: string }; Returns: Json }
      check_profile_completion: { Args: { p_user_id: string }; Returns: Json }
      claim_red_envelope: { Args: { p_envelope_id: string }; Returns: Json }
      cleanup_expired_sessions: { Args: never; Returns: number }
      cleanup_expired_subscriptions: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      convert_nexa_to_acoin: { Args: { p_nexa_amount: number }; Returns: Json }
      create_ad_campaign: {
        Args: {
          p_ad_type: string
          p_content?: string
          p_daily_budget: number
          p_end_date?: string
          p_image_url?: string
          p_placement: string
          p_post_id?: string
          p_product_id?: string
          p_target_url?: string
          p_title?: string
        }
        Returns: Json
      }
      create_marketplace_listing: {
        Args: {
          p_asking_price: number
          p_purchase_id: string
          p_user_id?: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      create_new_chat: { Args: { other_user_id: string }; Returns: string }
      create_order_from_cart: { Args: { p_merchant_id: string }; Returns: Json }
      create_red_envelope: {
        Args: {
          p_chat_id?: string
          p_envelope_type?: string
          p_message?: string
          p_recipient_count: number
          p_total_amount: number
        }
        Returns: Json
      }
      credit_daily_creator_earnings: { Args: never; Returns: Json }
      deactivate_expired_subscriptions: { Args: never; Returns: undefined }
      delete_chat_for_both: { Args: { p_chat_id: string }; Returns: boolean }
      developer_has_feature: {
        Args: { p_feature: string; p_user_id: string }
        Returns: boolean
      }
      distribute_daily_creator_rewards: { Args: never; Returns: Json }
      expire_subscriptions: { Args: never; Returns: number }
      generate_order_number: { Args: never; Returns: string }
      generate_telegram_verification_code: {
        Args: { p_telegram_chat_id: string; p_user_id: string }
        Returns: string
      }
      get_ads_for_placement: {
        Args: { p_limit?: number; p_placement: string }
        Returns: {
          ad_type: string
          content: string
          id: string
          image_url: string
          post_id: string
          product_id: string
          target_url: string
          title: string
          user_id: string
        }[]
      }
      get_daily_engagement: {
        Args: { p_date?: string; p_user_id: string }
        Returns: Json
      }
      get_daily_engagement_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          engagement_score: number
          handle: string
          hide_on_leaderboard: boolean
          likes_count: number
          potential_earnings: number
          replies_count: number
          user_id: string
          views_count: number
        }[]
      }
      get_gift_price: { Args: { p_gift_id: string }; Returns: number }
      get_or_create_chat: { Args: { other_user_id: string }; Returns: string }
      get_pending_withdrawals: {
        Args: never
        Returns: {
          amount_ugx: number
          avatar_url: string
          display_name: string
          handle: string
          id: string
          mobile_network: string
          notes: string
          phone_number: string
          requested_at: string
          user_id: string
        }[]
      }
      get_pool_status: { Args: never; Returns: Json }
      get_post_like_counts: {
        Args: { post_ids: string[] }
        Returns: {
          like_count: number
          post_id: string
        }[]
      }
      get_post_reply_counts: {
        Args: { post_ids: string[] }
        Returns: {
          post_id: string
          reply_count: number
        }[]
      }
      get_protected_profile_fields: {
        Args: { p_user_id: string }
        Returns: {
          affiliated_business_id: string
          is_admin: boolean
          is_affiliate: boolean
          is_business_mode: boolean
          is_organization_verified: boolean
          is_verified: boolean
        }[]
      }
      get_public_profile: {
        Args: { p_profile_id: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          country: string
          current_grade: string
          display_name: string
          handle: string
          id: string
          is_business_mode: boolean
          is_organization_verified: boolean
          is_verified: boolean
          website_url: string
          xp: number
        }[]
      }
      get_referrer_name: {
        Args: { referral_code_input: string }
        Returns: string
      }
      get_requesting_user: { Args: never; Returns: string }
      get_safe_profile_fields: {
        Args: { p_profile_id: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          business_category: string
          country: string
          current_grade: string
          display_name: string
          handle: string
          id: string
          is_business_mode: boolean
          is_organization_verified: boolean
          is_private: boolean
          is_verified: boolean
          show_balance: boolean
          website_url: string
          xp: number
        }[]
      }
      get_trending_topics: {
        Args: { hours_ago?: number; num_topics?: number }
        Returns: {
          post_count: number
          topic: string
        }[]
      }
      get_user_chat_ids: { Args: { p_user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_mini_program_installs: {
        Args: { program_id: string }
        Returns: undefined
      }
      is_chat_admin: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_chat_member: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_developer: { Args: { p_user_id: string }; Returns: boolean }
      is_group_creator: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_own_profile: { Args: { profile_id: string }; Returns: boolean }
      is_premium_user: { Args: { p_user_id: string }; Returns: boolean }
      is_user_blocked: {
        Args: { p_blocked_id: string; p_blocker_id: string }
        Returns: boolean
      }
      is_user_in_chat: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: boolean
      }
      mark_notifications_as_read: { Args: never; Returns: undefined }
      process_referral_reward:
        | {
            Args: { new_user_id: string; referral_code_input: string }
            Returns: {
              referrer_name: string
              success: boolean
            }[]
          }
        | {
            Args: { new_user_id: string; referrer_id: string }
            Returns: undefined
          }
      process_xp_transfer: {
        Args: { p_amount: number; p_message?: string; p_receiver_id: string }
        Returns: Json
      }
      purchase_listing: {
        Args: { p_buyer_id: string; p_listing_id: string }
        Returns: Json
      }
      purchase_marketplace_gift: {
        Args: { p_buyer_id: string; p_listing_id: string }
        Returns: Json
      }
      purchase_subscription: { Args: { p_plan_id: string }; Returns: Json }
      record_ad_click: {
        Args: { p_ad_id: string; p_placement: string }
        Returns: undefined
      }
      record_ad_impression: {
        Args: { p_ad_id: string; p_placement: string }
        Returns: undefined
      }
      record_login_attempt: {
        Args: {
          p_ip_address?: string
          p_location?: string
          p_success?: boolean
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      reject_affiliate_by_business: {
        Args: { p_notes?: string; p_request_id: string }
        Returns: Json
      }
      reject_developer_application: {
        Args: { p_application_id: string; p_reason?: string }
        Returns: Json
      }
      rejoin_group_with_admin_check: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      request_creator_withdrawal:
        | {
            Args: {
              p_amount_ugx: number
              p_mobile_network: string
              p_phone_number: string
            }
            Returns: Json
          }
        | {
            Args: { p_mobile_network: string; p_phone_number: string }
            Returns: Json
          }
      rotate_featured_items: { Args: never; Returns: undefined }
      send_gift: {
        Args: { p_gift_id: string; p_message?: string; p_receiver_id: string }
        Returns: Json
      }
      send_gift_combo: {
        Args: {
          p_gift_ids: string[]
          p_message?: string
          p_receiver_id: string
        }
        Returns: Json
      }
      send_message: {
        Args: { p_chat_id: string; p_plain_content: string }
        Returns: undefined
      }
      send_tip: {
        Args: {
          p_message?: string
          p_post_id?: string
          p_receiver_id: string
          p_xp_amount: number
        }
        Returns: Json
      }
      tip_post_author: {
        Args: {
          p_message?: string
          p_post_id: string
          p_sender_id?: string
          p_xp_amount: number
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      upsert_active_session: {
        Args: {
          p_browser?: string
          p_device_name?: string
          p_expires_at?: string
          p_ip_address?: string
          p_session_token: string
          p_user_id: string
        }
        Returns: string
      }
      verify_telegram_link: {
        Args: { p_telegram_chat_id: string; p_verification_code: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      developer_status: "none" | "pending" | "approved" | "rejected"
      notification_type:
        | "new_follower"
        | "new_like"
        | "new_reply"
        | "new_mention"
        | "gift"
      user_role_enum: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      developer_status: ["none", "pending", "approved", "rejected"],
      notification_type: [
        "new_follower",
        "new_like",
        "new_reply",
        "new_mention",
        "gift",
      ],
      user_role_enum: ["user", "admin"],
    },
  },
} as const
