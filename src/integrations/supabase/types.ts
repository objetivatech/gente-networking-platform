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
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      attendances: {
        Row: {
          id: string
          meeting_id: string
          registered_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          meeting_id: string
          registered_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          meeting_id?: string
          registered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      business_deals: {
        Row: {
          client_name: string | null
          closed_by_user_id: string
          created_at: string | null
          deal_date: string
          description: string | null
          id: string
          referred_by_user_id: string | null
          value: number
        }
        Insert: {
          client_name?: string | null
          closed_by_user_id: string
          created_at?: string | null
          deal_date: string
          description?: string | null
          id?: string
          referred_by_user_id?: string | null
          value?: number
        }
        Update: {
          client_name?: string | null
          closed_by_user_id?: string
          created_at?: string | null
          deal_date?: string
          description?: string | null
          id?: string
          referred_by_user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      contents: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      gente_em_acao: {
        Row: {
          created_at: string | null
          guest_company: string | null
          guest_name: string | null
          id: string
          image_url: string | null
          meeting_date: string
          meeting_type: string
          notes: string | null
          partner_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          guest_company?: string | null
          guest_name?: string | null
          id?: string
          image_url?: string | null
          meeting_date: string
          meeting_type: string
          notes?: string | null
          partner_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          guest_company?: string | null
          guest_name?: string | null
          id?: string
          image_url?: string | null
          meeting_date?: string
          meeting_type?: string
          notes?: string | null
          partner_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          code: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string
          metadata: Json | null
          name: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          code: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by: string
          metadata?: Json | null
          name?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          code?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          metadata?: Json | null
          name?: string | null
          status?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_time: string | null
          team_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_time?: string | null
          team_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_time?: string | null
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      points_history: {
        Row: {
          activity_type: string | null
          created_at: string | null
          id: string
          points_after: number
          points_before: number
          points_change: number
          rank_after: Database["public"]["Enums"]["member_rank"] | null
          rank_before: Database["public"]["Enums"]["member_rank"] | null
          reason: string | null
          reference_id: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          created_at?: string | null
          id?: string
          points_after: number
          points_before: number
          points_change: number
          rank_after?: Database["public"]["Enums"]["member_rank"] | null
          rank_before?: Database["public"]["Enums"]["member_rank"] | null
          reason?: string | null
          reference_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string | null
          created_at?: string | null
          id?: string
          points_after?: number
          points_before?: number
          points_change?: number
          rank_after?: Database["public"]["Enums"]["member_rank"] | null
          rank_before?: Database["public"]["Enums"]["member_rank"] | null
          reason?: string | null
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_segment: string | null
          company: string | null
          created_at: string | null
          email: string | null
          email_notifications_enabled: boolean | null
          full_name: string
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          notify_on_meeting: boolean | null
          notify_on_referral: boolean | null
          notify_on_testimonial: boolean | null
          phone: string | null
          points: number | null
          position: string | null
          rank: Database["public"]["Enums"]["member_rank"] | null
          rd_station_synced_at: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_segment?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          full_name: string
          id: string
          instagram_url?: string | null
          linkedin_url?: string | null
          notify_on_meeting?: boolean | null
          notify_on_referral?: boolean | null
          notify_on_testimonial?: boolean | null
          phone?: string | null
          points?: number | null
          position?: string | null
          rank?: Database["public"]["Enums"]["member_rank"] | null
          rd_station_synced_at?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_segment?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          full_name?: string
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          notify_on_meeting?: boolean | null
          notify_on_referral?: boolean | null
          notify_on_testimonial?: boolean | null
          phone?: string | null
          points?: number | null
          position?: string | null
          rank?: Database["public"]["Enums"]["member_rank"] | null
          rd_station_synced_at?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string | null
          from_user_id: string
          id: string
          notes: string | null
          to_user_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string | null
          from_user_id: string
          id?: string
          notes?: string | null
          to_user_id: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string | null
          from_user_id?: string
          id?: string
          notes?: string | null
          to_user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          is_facilitator: boolean | null
          joined_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_facilitator?: boolean | null
          joined_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_facilitator?: boolean | null
          joined_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          content: string
          created_at: string | null
          from_user_id: string
          id: string
          to_user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          from_user_id: string
          id?: string
          to_user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          from_user_id?: string
          id?: string
          to_user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      add_activity_feed: {
        Args: {
          _activity_type: string
          _description?: string
          _metadata?: Json
          _reference_id?: string
          _title: string
          _user_id: string
        }
        Returns: string
      }
      calculate_user_points: { Args: { _user_id: string }; Returns: number }
      get_rank_from_points: {
        Args: { _points: number }
        Returns: Database["public"]["Enums"]["member_rank"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_guest: { Args: { _user_id: string }; Returns: boolean }
      is_team_facilitator: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      recalculate_all_user_points: { Args: never; Returns: number }
      update_user_points_and_rank: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "facilitador" | "membro" | "convidado"
      member_rank: "iniciante" | "bronze" | "prata" | "ouro" | "diamante"
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
      app_role: ["admin", "facilitador", "membro", "convidado"],
      member_rank: ["iniciante", "bronze", "prata", "ouro", "diamante"],
    },
  },
} as const
