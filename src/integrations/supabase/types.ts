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
          team_id: string | null
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
          team_id?: string | null
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
          team_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
      billing_charges: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          due_date: string
          external_id: string | null
          id: string
          lead_id: string | null
          metadata: Json
          paid_at: string | null
          payment_url: string | null
          plan_id: string | null
          profile_id: string | null
          provider: string | null
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          due_date?: string
          external_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          paid_at?: string | null
          payment_url?: string | null
          plan_id?: string | null
          profile_id?: string | null
          provider?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          due_date?: string
          external_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          paid_at?: string | null
          payment_url?: string | null
          plan_id?: string | null
          profile_id?: string | null
          provider?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_charges_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_charges_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_charges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_charges_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "billing_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_discounts: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          id: string
          max_uses: number | null
          plan_id: string | null
          updated_at: string
          uses: number
          valid_until: string | null
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          id?: string
          max_uses?: number | null
          plan_id?: string | null
          updated_at?: string
          uses?: number
          valid_until?: string | null
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          id?: string
          max_uses?: number | null
          plan_id?: string | null
          updated_at?: string
          uses?: number
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_discounts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          active: boolean
          amount_cents: number
          audience: string
          billing_interval: string | null
          contract_template_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          installments: number | null
          name: string
          plan_type: string
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_cents?: number
          audience?: string
          billing_interval?: string | null
          contract_template_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          installments?: number | null
          name: string
          plan_type?: string
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          audience?: string
          billing_interval?: string | null
          contract_template_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          installments?: number | null
          name?: string
          plan_type?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plans_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_subscriptions: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          discount_id: string | null
          external_id: string | null
          id: string
          lead_id: string | null
          next_charge_date: string | null
          notes: string | null
          plan_id: string
          profile_id: string | null
          provider: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          discount_id?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          next_charge_date?: string | null
          notes?: string | null
          plan_id: string
          profile_id?: string | null
          provider?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          discount_id?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          next_charge_date?: string | null
          notes?: string | null
          plan_id?: string
          profile_id?: string | null
          provider?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "billing_discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscriptions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_cases: {
        Row: {
          business_deal_id: string | null
          case_type: string
          client_name: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          result: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_deal_id?: string | null
          case_type?: string
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          result?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_deal_id?: string | null
          case_type?: string
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          result?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_cases_business_deal_id_fkey"
            columns: ["business_deal_id"]
            isOneToOne: false
            referencedRelation: "business_deals"
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
      contract_template_versions: {
        Row: {
          body_html: string
          changed_by: string | null
          created_at: string
          id: string
          name: string
          template_id: string
          variables_schema: Json
          version: number
        }
        Insert: {
          body_html: string
          changed_by?: string | null
          created_at?: string
          id?: string
          name: string
          template_id: string
          variables_schema?: Json
          version: number
        }
        Update: {
          body_html?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          name?: string
          template_id?: string
          variables_schema?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          slug: string
          updated_at: string
          updated_by: string | null
          variables_schema: Json
          version: number
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          slug: string
          updated_at?: string
          updated_by?: string | null
          variables_schema?: Json
          version?: number
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
          variables_schema?: Json
          version?: number
        }
        Relationships: []
      }
      council_posts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          status: string
          team_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_posts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      council_replies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_best_answer: boolean | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_best_answer?: boolean | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_best_answer?: boolean | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "council_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_history: {
        Row: {
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["crm_lead_status"] | null
          id: string
          lead_id: string
          metadata: Json
          moved_by: string | null
          reason: string | null
          source_snapshot: Database["public"]["Enums"]["crm_lead_source"] | null
          to_status: Database["public"]["Enums"]["crm_lead_status"]
        }
        Insert: {
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["crm_lead_status"] | null
          id?: string
          lead_id: string
          metadata?: Json
          moved_by?: string | null
          reason?: string | null
          source_snapshot?:
            | Database["public"]["Enums"]["crm_lead_source"]
            | null
          to_status: Database["public"]["Enums"]["crm_lead_status"]
        }
        Update: {
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["crm_lead_status"] | null
          id?: string
          lead_id?: string
          metadata?: Json
          moved_by?: string | null
          reason?: string | null
          source_snapshot?:
            | Database["public"]["Enums"]["crm_lead_source"]
            | null
          to_status?: Database["public"]["Enums"]["crm_lead_status"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_pages: {
        Row: {
          created_at: string
          first_seen_at: string
          id: string
          last_seen_at: string
          leads_count: number
          page_key: string
          page_url: string | null
          source: Database["public"]["Enums"]["crm_lead_source"] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          leads_count?: number
          page_key: string
          page_url?: string | null
          source?: Database["public"]["Enums"]["crm_lead_source"] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          leads_count?: number
          page_key?: string
          page_url?: string | null
          source?: Database["public"]["Enums"]["crm_lead_source"] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          archived_at: string | null
          autentique_document_id: string | null
          business_segment: string | null
          company: string | null
          contract_sent_at: string | null
          contract_signed_at: string | null
          contract_signed_pdf_path: string | null
          contract_signing_url: string | null
          contract_status: string | null
          contract_template_id: string | null
          contract_template_version: number | null
          contract_variables: Json | null
          created_at: string
          efi_subscription_id: string | null
          email: string
          first_attendance_at: string | null
          id: string
          invitation_id: string | null
          invited_by: string | null
          is_hub: boolean | null
          meeting_attendance_count: number
          metadata: Json
          name: string
          notes: string | null
          payment_status: string | null
          phone: string | null
          profile_id: string | null
          source: Database["public"]["Enums"]["crm_lead_source"]
          source_detail: string | null
          stage_key: string | null
          status: Database["public"]["Enums"]["crm_lead_status"]
          target_team_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          autentique_document_id?: string | null
          business_segment?: string | null
          company?: string | null
          contract_sent_at?: string | null
          contract_signed_at?: string | null
          contract_signed_pdf_path?: string | null
          contract_signing_url?: string | null
          contract_status?: string | null
          contract_template_id?: string | null
          contract_template_version?: number | null
          contract_variables?: Json | null
          created_at?: string
          efi_subscription_id?: string | null
          email: string
          first_attendance_at?: string | null
          id?: string
          invitation_id?: string | null
          invited_by?: string | null
          is_hub?: boolean | null
          meeting_attendance_count?: number
          metadata?: Json
          name: string
          notes?: string | null
          payment_status?: string | null
          phone?: string | null
          profile_id?: string | null
          source?: Database["public"]["Enums"]["crm_lead_source"]
          source_detail?: string | null
          stage_key?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          target_team_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          autentique_document_id?: string | null
          business_segment?: string | null
          company?: string | null
          contract_sent_at?: string | null
          contract_signed_at?: string | null
          contract_signed_pdf_path?: string | null
          contract_signing_url?: string | null
          contract_status?: string | null
          contract_template_id?: string | null
          contract_template_version?: number | null
          contract_variables?: Json | null
          created_at?: string
          efi_subscription_id?: string | null
          email?: string
          first_attendance_at?: string | null
          id?: string
          invitation_id?: string | null
          invited_by?: string | null
          is_hub?: boolean | null
          meeting_attendance_count?: number
          metadata?: Json
          name?: string
          notes?: string | null
          payment_status?: string | null
          phone?: string | null
          profile_id?: string | null
          source?: Database["public"]["Enums"]["crm_lead_source"]
          source_detail?: string | null
          stage_key?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          target_team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_target_team_id_fkey"
            columns: ["target_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          active: boolean
          color: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          label: string
          notify_emails: string[]
          notify_on_enter: boolean
          position: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          label: string
          notify_emails?: string[]
          notify_on_enter?: boolean
          position?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          label?: string
          notify_emails?: string[]
          notify_on_enter?: boolean
          position?: number
          updated_at?: string
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
      hub_billing_events: {
        Row: {
          attempt: number
          created_at: string
          event_type: string
          id: string
          lead_id: string
          payload: Json
          status: string
          triggered_by: string | null
        }
        Insert: {
          attempt?: number
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          payload?: Json
          status?: string
          triggered_by?: string | null
        }
        Update: {
          attempt?: number
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          payload?: Json
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_billing_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_secret_audit: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          secret_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          secret_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          secret_name?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          category: string
          config: Json
          created_at: string
          environment: string
          id: string
          last_check_ok: boolean | null
          last_checked_at: string | null
          provider: string | null
          rate_limit_count: number | null
          rate_limit_window_hours: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          environment?: string
          id?: string
          last_check_ok?: boolean | null
          last_checked_at?: string | null
          provider?: string | null
          rate_limit_count?: number | null
          rate_limit_window_hours?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          environment?: string
          id?: string
          last_check_ok?: boolean | null
          last_checked_at?: string | null
          provider?: string | null
          rate_limit_count?: number | null
          rate_limit_window_hours?: number | null
          updated_at?: string
          updated_by?: string | null
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
          event_id: string | null
          expires_at: string
          id: string
          invite_purpose: string
          invite_target: string
          invited_by: string
          metadata: Json | null
          name: string | null
          status: string
          team_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          code: string
          created_at?: string
          email?: string | null
          event_id?: string | null
          expires_at?: string
          id?: string
          invite_purpose?: string
          invite_target?: string
          invited_by: string
          metadata?: Json | null
          name?: string | null
          status?: string
          team_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          code?: string
          created_at?: string
          email?: string | null
          event_id?: string | null
          expires_at?: string
          id?: string
          invite_purpose?: string
          invite_target?: string
          invited_by?: string
          metadata?: Json | null
          name?: string | null
          status?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaking_connections: {
        Row: {
          created_at: string
          description: string | null
          gente_em_acao_id: string | null
          id: string
          member_id: string
          target_id: string
          year_month: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gente_em_acao_id?: string | null
          id?: string
          member_id: string
          target_id: string
          year_month?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gente_em_acao_id?: string | null
          id?: string
          member_id?: string
          target_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaking_connections_gente_em_acao_id_fkey"
            columns: ["gente_em_acao_id"]
            isOneToOne: false
            referencedRelation: "gente_em_acao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaking_connections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaking_connections_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_lead_attendances: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          lead_id: string
          meeting_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          lead_id: string
          meeting_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_lead_attendances_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_lead_attendances_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_requests: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          location: string | null
          message: string | null
          proposed_start: string
          recipient_id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["meeting_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          message?: string | null
          proposed_start: string
          recipient_id: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["meeting_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          message?: string | null
          proposed_start?: string
          recipient_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["meeting_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_type: string
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
          event_type?: string
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
          event_type?: string
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
      monthly_points: {
        Row: {
          created_at: string | null
          id: string
          points: number
          rank: Database["public"]["Enums"]["member_rank"]
          team_id: string
          updated_at: string | null
          user_id: string
          year_month: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points?: number
          rank?: Database["public"]["Enums"]["member_rank"]
          team_id: string
          updated_at?: string | null
          user_id: string
          year_month: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number
          rank?: Database["public"]["Enums"]["member_rank"]
          team_id?: string
          updated_at?: string | null
          user_id?: string
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_points_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dispatch_log: {
        Row: {
          channel: string
          context: string | null
          created_at: string
          error: string | null
          id: string
          provider: string | null
          recipient: string
          reference_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          channel?: string
          context?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider?: string | null
          recipient: string
          reference_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          channel?: string
          context?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider?: string | null
          recipient?: string
          reference_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          team_id: string | null
          user_id: string
          year_month: string | null
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
          team_id?: string | null
          user_id: string
          year_month?: string | null
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
          team_id?: string | null
          user_id?: string
          year_month?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability_note: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          birthday: string | null
          business_segment: string | null
          company: string | null
          created_at: string | null
          deactivated_at: string | null
          deactivation_reason: string | null
          email: string | null
          email_notifications_enabled: boolean | null
          email_reports_enabled: boolean
          full_name: string
          how_to_refer_me: string | null
          id: string
          ideal_client: string | null
          instagram_url: string | null
          is_active: boolean
          linkedin_url: string | null
          notify_on_meeting: boolean | null
          notify_on_referral: boolean | null
          notify_on_testimonial: boolean | null
          phone: string | null
          points: number | null
          position: string | null
          public_profile_enabled: boolean
          rank: Database["public"]["Enums"]["member_rank"] | null
          rd_station_synced_at: string | null
          slug: string | null
          tags: string[] | null
          updated_at: string | null
          website_url: string | null
          what_i_do: string | null
        }
        Insert: {
          availability_note?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          birthday?: string | null
          business_segment?: string | null
          company?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          email_reports_enabled?: boolean
          full_name: string
          how_to_refer_me?: string | null
          id: string
          ideal_client?: string | null
          instagram_url?: string | null
          is_active?: boolean
          linkedin_url?: string | null
          notify_on_meeting?: boolean | null
          notify_on_referral?: boolean | null
          notify_on_testimonial?: boolean | null
          phone?: string | null
          points?: number | null
          position?: string | null
          public_profile_enabled?: boolean
          rank?: Database["public"]["Enums"]["member_rank"] | null
          rd_station_synced_at?: string | null
          slug?: string | null
          tags?: string[] | null
          updated_at?: string | null
          website_url?: string | null
          what_i_do?: string | null
        }
        Update: {
          availability_note?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          birthday?: string | null
          business_segment?: string | null
          company?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          email_reports_enabled?: boolean
          full_name?: string
          how_to_refer_me?: string | null
          id?: string
          ideal_client?: string | null
          instagram_url?: string | null
          is_active?: boolean
          linkedin_url?: string | null
          notify_on_meeting?: boolean | null
          notify_on_referral?: boolean | null
          notify_on_testimonial?: boolean | null
          phone?: string | null
          points?: number | null
          position?: string | null
          public_profile_enabled?: boolean
          rank?: Database["public"]["Enums"]["member_rank"] | null
          rd_station_synced_at?: string | null
          slug?: string | null
          tags?: string[] | null
          updated_at?: string | null
          website_url?: string | null
          what_i_do?: string | null
        }
        Relationships: []
      }
      referral_request_responses: {
        Row: {
          created_at: string
          id: string
          message: string
          referral_id: string | null
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          referral_id?: string | null
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          referral_id?: string | null
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_request_responses_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_request_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "referral_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          target_segment: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          target_segment?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          target_segment?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
          to_user_id?: string
        }
        Relationships: []
      }
      system_changelog: {
        Row: {
          category: string | null
          changes: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
          version: string
        }
        Insert: {
          category?: string | null
          changes?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          version: string
        }
        Update: {
          category?: string | null
          changes?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          version?: string
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
          is_hub: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_hub?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_hub?: boolean
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
      add_activity_feed:
        | {
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
        | {
            Args: {
              _activity_type: string
              _description?: string
              _metadata?: Json
              _reference_id?: string
              _team_id?: string
              _title: string
              _user_id: string
            }
            Returns: string
          }
      add_crm_lead_note: {
        Args: { _lead_id: string; _note: string }
        Returns: Json
      }
      are_same_team: {
        Args: { p_user_id1: string; p_user_id2: string }
        Returns: boolean
      }
      calculate_monthly_points_for_team: {
        Args: { _team_id: string; _user_id: string; _year_month: string }
        Returns: number
      }
      calculate_user_points: { Args: { _user_id: string }; Returns: number }
      create_matchmaking_check:
        | {
            Args: {
              _description?: string
              _meeting_date?: string
              _target_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _description?: string
              _image_url?: string
              _meeting_date?: string
              _target_id: string
            }
            Returns: Json
          }
      deactivate_member: {
        Args: { _member_id: string; _reason?: string }
        Returns: Json
      }
      delete_integration_secret: { Args: { _name: string }; Returns: Json }
      downgrade_member_to_guest: {
        Args: { _member_id: string; _reason?: string }
        Returns: Json
      }
      generate_slug: { Args: { name: string }; Returns: string }
      generate_unique_slug:
        | { Args: { name: string; user_id: string }; Returns: string }
        | { Args: { name: string; user_id: string }; Returns: string }
      get_current_year_month: { Args: never; Returns: string }
      get_group_members_for_notification: {
        Args: { _user_id: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_guests_directory: {
        Args: never
        Returns: {
          attendance_count: number
          avatar_url: string
          business_segment: string
          company: string
          email: string
          full_name: string
          id: string
          invited_at: string
          invited_by_id: string
          invited_by_name: string
          phone: string
          role_current: Database["public"]["Enums"]["app_role"]
          slug: string
          status: string
          team_color: string
          team_id: string
          team_name: string
        }[]
      }
      get_integration_secret: { Args: { _name: string }; Returns: string }
      get_invitation_by_code: {
        Args: { _code: string }
        Returns: {
          accepted_at: string
          accepted_by: string
          code: string
          email: string
          event_id: string
          expires_at: string
          id: string
          invite_purpose: string
          invite_target: string
          invited_by: string
          name: string
          status: string
          team_id: string
        }[]
      }
      get_members_health_scores: {
        Args: { _days?: number }
        Returns: {
          attendances_count: number
          avatar_url: string
          business_cases_count: number
          company: string
          council_count: number
          full_name: string
          health_level: string
          health_score: number
          last_activity_at: string
          meetings_count: number
          referrals_count: number
          team_id: string
          team_name: string
          testimonials_count: number
          user_id: string
        }[]
      }
      get_monthly_ranking: {
        Args: { _team_id?: string; _year_month?: string }
        Returns: {
          avatar_url: string
          company: string
          full_name: string
          member_position: string
          points: number
          position_rank: number
          rank: Database["public"]["Enums"]["member_rank"]
          team_id: string
          team_name: string
          user_id: string
        }[]
      }
      get_public_profile: {
        Args: { _slug: string }
        Returns: {
          avatar_url: string
          banner_url: string
          bio: string
          business_segment: string
          company: string
          full_name: string
          how_to_refer_me: string
          id: string
          ideal_client: string
          instagram_url: string
          linkedin_url: string
          position: string
          rank: string
          slug: string
          team_name: string
          website_url: string
          what_i_do: string
        }[]
      }
      get_public_profile_slugs: {
        Args: never
        Returns: {
          slug: string
        }[]
      }
      get_rank_from_points: {
        Args: { _points: number }
        Returns: Database["public"]["Enums"]["member_rank"]
      }
      get_user_monthly_points: {
        Args: { _team_id?: string; _user_id: string; _year_month?: string }
        Returns: {
          points: number
          rank: Database["public"]["Enums"]["member_rank"]
          team_id: string
          team_name: string
          year_month: string
        }[]
      }
      get_user_teams: {
        Args: { p_user_id: string }
        Returns: {
          team_id: string
        }[]
      }
      get_year_month_from_date: { Args: { d: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_member: { Args: { _user_id: string }; Returns: boolean }
      is_guest: { Args: { _user_id: string }; Returns: boolean }
      is_team_facilitator: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      list_integration_secrets: {
        Args: never
        Returns: {
          name: string
          updated_at: string
        }[]
      }
      move_guest_attendance: {
        Args: {
          _from_meeting_id: string
          _guest_id: string
          _to_meeting_id: string
        }
        Returns: Json
      }
      promote_crm_lead_to_member: {
        Args: {
          _lead_id: string
          _reason?: string
          _skip_contract?: boolean
          _skip_payment?: boolean
          _team_id: string
        }
        Returns: Json
      }
      promote_guest_to_member: {
        Args: {
          _guest_id: string
          _target_role?: Database["public"]["Enums"]["app_role"]
          _team_id?: string
        }
        Returns: Json
      }
      reactivate_member: { Args: { _member_id: string }; Returns: Json }
      reassign_contract_template: {
        Args: { _lead_ids: string[]; _template_id: string; _version: number }
        Returns: Json
      }
      recalculate_all_monthly_points: {
        Args: { _year_month?: string }
        Returns: number
      }
      recalculate_all_user_points: { Args: never; Returns: number }
      register_crm_lead_page: {
        Args: {
          _page_key: string
          _page_url: string
          _source: Database["public"]["Enums"]["crm_lead_source"]
          _title: string
        }
        Returns: string
      }
      set_integration_secret: {
        Args: { _name: string; _value: string }
        Returns: Json
      }
      transfer_guest_to_team: {
        Args: { _guest_id: string; _new_team_id: string }
        Returns: Json
      }
      update_all_monthly_points_for_user: {
        Args: { _user_id: string; _year_month?: string }
        Returns: undefined
      }
      update_monthly_points_for_team: {
        Args: { _team_id: string; _user_id: string; _year_month?: string }
        Returns: undefined
      }
      update_user_points_and_rank: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "facilitador" | "membro" | "convidado"
      crm_lead_source:
        | "lp_gentehub"
        | "lp_participe"
        | "lp_networking"
        | "site_elementor"
        | "convite_manual"
        | "api"
        | "convite_membro"
      crm_lead_status:
        | "novo"
        | "em_qualificacao"
        | "qualificado"
        | "hub_ativo"
        | "fechado"
        | "perdido"
      meeting_request_status: "pending" | "confirmed" | "declined" | "cancelled"
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
      crm_lead_source: [
        "lp_gentehub",
        "lp_participe",
        "lp_networking",
        "site_elementor",
        "convite_manual",
        "api",
        "convite_membro",
      ],
      crm_lead_status: [
        "novo",
        "em_qualificacao",
        "qualificado",
        "hub_ativo",
        "fechado",
        "perdido",
      ],
      meeting_request_status: ["pending", "confirmed", "declined", "cancelled"],
      member_rank: ["iniciante", "bronze", "prata", "ouro", "diamante"],
    },
  },
} as const
