export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      candidates: {
        Row: {
          bio: string | null
          created_at: string | null
          election_id: string | null
          full_name: string
          id: string
          manifesto: string | null
          photo_url: string | null
          position: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          election_id?: string | null
          full_name: string
          id?: string
          manifesto?: string | null
          photo_url?: string | null
          position: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          election_id?: string | null
          full_name?: string
          id?: string
          manifesto?: string | null
          photo_url?: string | null
          position?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          currency: string | null
          donation_amount: number
          donation_date: string
          donation_description: string | null
          donation_interval:
            | Database["public"]["Enums"]["pricing_plan_interval"]
            | null
          donation_status: Database["public"]["Enums"]["donation_status_enum"]
          donation_type: Database["public"]["Enums"]["pricing_type"]
          donor_id: string
          goods_or_services_provided: boolean | null
          goods_services_description: string | null
          goods_services_estimate: number | null
          id: string
          intangible_benefits: boolean | null
          is_anonymous: boolean
          is_private: boolean | null
          non_cash_description: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          purpose: Database["public"]["Enums"]["purpose_enum"] | null
          stripe_customer_id: string | null
          stripe_payment_id: string | null
          tax_receipt_generated: boolean | null
        }
        Insert: {
          currency?: string | null
          donation_amount: number
          donation_date?: string
          donation_description?: string | null
          donation_interval?:
            | Database["public"]["Enums"]["pricing_plan_interval"]
            | null
          donation_status?: Database["public"]["Enums"]["donation_status_enum"]
          donation_type: Database["public"]["Enums"]["pricing_type"]
          donor_id: string
          goods_or_services_provided?: boolean | null
          goods_services_description?: string | null
          goods_services_estimate?: number | null
          id?: string
          intangible_benefits?: boolean | null
          is_anonymous: boolean
          is_private?: boolean | null
          non_cash_description?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          purpose?: Database["public"]["Enums"]["purpose_enum"] | null
          stripe_customer_id?: string | null
          stripe_payment_id?: string | null
          tax_receipt_generated?: boolean | null
        }
        Update: {
          currency?: string | null
          donation_amount?: number
          donation_date?: string
          donation_description?: string | null
          donation_interval?:
            | Database["public"]["Enums"]["pricing_plan_interval"]
            | null
          donation_status?: Database["public"]["Enums"]["donation_status_enum"]
          donation_type?: Database["public"]["Enums"]["pricing_type"]
          donor_id?: string
          goods_or_services_provided?: boolean | null
          goods_services_description?: string | null
          goods_services_estimate?: number | null
          id?: string
          intangible_benefits?: boolean | null
          is_anonymous?: boolean
          is_private?: boolean | null
          non_cash_description?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_enum"]
            | null
          purpose?: Database["public"]["Enums"]["purpose_enum"] | null
          stripe_customer_id?: string | null
          stripe_payment_id?: string | null
          tax_receipt_generated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          donor_type: Database["public"]["Enums"]["donor_type_enum"]
          email: string
          full_name: string | null
          id: string
          organization_name: string | null
          phone: string | null
          registration_date: string | null
          state: string | null
          stripe_customer_id: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          donor_type: Database["public"]["Enums"]["donor_type_enum"]
          email: string
          full_name?: string | null
          id?: string
          organization_name?: string | null
          phone?: string | null
          registration_date?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          donor_type?: Database["public"]["Enums"]["donor_type_enum"]
          email?: string
          full_name?: string | null
          id?: string
          organization_name?: string | null
          phone?: string | null
          registration_date?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      election_positions: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          election_type: string
          id: string
          position: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order: number
          election_type: string
          id?: string
          position: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          election_type?: string
          id?: string
          position?: string
        }
        Relationships: []
      }
      elections: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          nomination_end: string | null
          nomination_start: string | null
          settings: Json | null
          start_date: string
          status: Database["public"]["Enums"]["election_status"] | null
          title: string
          type: Database["public"]["Enums"]["election_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          nomination_end?: string | null
          nomination_start?: string | null
          settings?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["election_status"] | null
          title: string
          type?: Database["public"]["Enums"]["election_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          nomination_end?: string | null
          nomination_start?: string | null
          settings?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["election_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["election_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          id: string
          purpose: string | null
          recipient: string | null
          sent_at: string | null
          subject: string | null
        }
        Insert: {
          id?: string
          purpose?: string | null
          recipient?: string | null
          sent_at?: string | null
          subject?: string | null
        }
        Update: {
          id?: string
          purpose?: string | null
          recipient?: string | null
          sent_at?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          currency: string | null
          date: string
          description: string | null
          id: string
          is_private: boolean
          payee: string | null
          payment_method: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          currency?: string | null
          date: string
          description?: string | null
          id?: string
          is_private?: boolean
          payee?: string | null
          payment_method?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          id?: string
          is_private?: boolean
          payee?: string | null
          payment_method?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          enabled: boolean
          environment: string | null
          feature_name: string
          id: string
          updated_at: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          environment?: string | null
          feature_name: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          environment?: string | null
          feature_name?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      funds: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          date: string
          description: string | null
          id: string
          is_private: boolean
          payment_method: string | null
          source: string
          status: string | null
          stripe_fees: number | null
          stripe_payout_id: string | null
          stripe_status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          date: string
          description?: string | null
          id: string
          is_private?: boolean
          payment_method?: string | null
          source: string
          status?: string | null
          stripe_fees?: number | null
          stripe_payout_id?: string | null
          stripe_status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          id?: string
          is_private?: boolean
          payment_method?: string | null
          source?: string
          status?: string | null
          stripe_fees?: number | null
          stripe_payout_id?: string | null
          stripe_status?: string | null
        }
        Relationships: []
      }
      funeral_fund_interest: {
        Row: {
          additional_comments: string | null
          additional_services: string
          created_at: string | null
          email: string
          full_name: string
          id: number
          phone_number: string
        }
        Insert: {
          additional_comments?: string | null
          additional_services: string
          created_at?: string | null
          email: string
          full_name: string
          id?: number
          phone_number: string
        }
        Update: {
          additional_comments?: string | null
          additional_services?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: number
          phone_number?: string
        }
        Relationships: []
      }
      "funeral-burial-fund": {
        Row: {
          created_at: string
          full_name: string
          id: number
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: number
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: number
        }
        Relationships: []
      }
      initiatives: {
        Row: {
          additional_info_url: string | null
          ballot_order: number | null
          created_at: string | null
          description: string | null
          election_id: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          additional_info_url?: string | null
          ballot_order?: number | null
          created_at?: string | null
          description?: string | null
          election_id?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          additional_info_url?: string | null
          ballot_order?: number | null
          created_at?: string | null
          description?: string | null
          election_id?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          address2: string | null
          city: string | null
          created_at: string
          fullName: string | null
          id: string
          isApproved: boolean
          membershipType: Database["public"]["Enums"]["membershiptypes"] | null
          phone: string | null
          state: string | null
          status: string | null
          stripe_customer_id: string | null
          subscription_id: string | null
          terms: boolean | null
          totalMembersInFamily: number | null
          user_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          address2?: string | null
          city?: string | null
          created_at?: string
          fullName?: string | null
          id?: string
          isApproved?: boolean
          membershipType?: Database["public"]["Enums"]["membershiptypes"] | null
          phone?: string | null
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          terms?: boolean | null
          totalMembersInFamily?: number | null
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          address2?: string | null
          city?: string | null
          created_at?: string
          fullName?: string | null
          id?: string
          isApproved?: boolean
          membershipType?: Database["public"]["Enums"]["membershiptypes"] | null
          phone?: string | null
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          terms?: boolean | null
          totalMembersInFamily?: number | null
          user_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_stripe_customer_id_fkey"
            columns: ["stripe_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          ein: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          state: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          ein?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          ein?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          state?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          description: string | null
          id: string
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          trial_period_days: number | null
          type: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: Database["public"]["Enums"]["purpose_enum"]
          value: string
        }
        Insert: {
          active: boolean
          created_at?: string
          id?: string
          key: Database["public"]["Enums"]["purpose_enum"]
          value: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: Database["public"]["Enums"]["purpose_enum"]
          value?: string
        }
        Relationships: []
      }
      sms_notifications: {
        Row: {
          id: string
          month: number
          sent_at: string | null
          subscription_id: string
          year: number
        }
        Insert: {
          id?: string
          month: number
          sent_at?: string | null
          subscription_id: string
          year: number
        }
        Update: {
          id?: string
          month?: number
          sent_at?: string | null
          subscription_id?: string
          year?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          price_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          full_name: string | null
          id: string
          payment_method: Json | null
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id: string
          payment_method?: Json | null
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id?: string
          payment_method?: Json | null
        }
        Relationships: []
      }
      vote_confirmations: {
        Row: {
          confirmation_code: string
          confirmed_at: string | null
          election_id: string
          id: string
          session_type: Database["public"]["Enums"]["vote_session_type"] | null
          user_id: string
          votes_cast: number
        }
        Insert: {
          confirmation_code: string
          confirmed_at?: string | null
          election_id: string
          id?: string
          session_type?: Database["public"]["Enums"]["vote_session_type"] | null
          user_id: string
          votes_cast: number
        }
        Update: {
          confirmation_code?: string
          confirmed_at?: string | null
          election_id?: string
          id?: string
          session_type?: Database["public"]["Enums"]["vote_session_type"] | null
          user_id?: string
          votes_cast?: number
        }
        Relationships: [
          {
            foreignKeyName: "vote_confirmations_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_sessions: {
        Row: {
          completed_at: string | null
          confirmation_code: string
          created_at: string | null
          election_id: string
          id: string
          session_type: Database["public"]["Enums"]["vote_session_type"]
          user_id: string
          votes_cast: number
        }
        Insert: {
          completed_at?: string | null
          confirmation_code: string
          created_at?: string | null
          election_id: string
          id?: string
          session_type: Database["public"]["Enums"]["vote_session_type"]
          user_id: string
          votes_cast?: number
        }
        Update: {
          completed_at?: string | null
          confirmation_code?: string
          created_at?: string | null
          election_id?: string
          id?: string
          session_type?: Database["public"]["Enums"]["vote_session_type"]
          user_id?: string
          votes_cast?: number
        }
        Relationships: [
          {
            foreignKeyName: "vote_sessions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          candidate_id: string | null
          created_at: string | null
          election_id: string
          id: string
          initiative_id: string | null
          ip_address: unknown | null
          session_id: string | null
          user_agent: string | null
          user_id: string
          vote_type: Database["public"]["Enums"]["vote_session_type"]
          vote_value: Database["public"]["Enums"]["vote_option"] | null
          voted_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string | null
          election_id: string
          id?: string
          initiative_id?: string | null
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
          vote_type: Database["public"]["Enums"]["vote_session_type"]
          vote_value?: Database["public"]["Enums"]["vote_option"] | null
          voted_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          created_at?: string | null
          election_id?: string
          id?: string
          initiative_id?: string | null
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
          vote_type?: Database["public"]["Enums"]["vote_session_type"]
          vote_value?: Database["public"]["Enums"]["vote_option"] | null
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "vote_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rls_enabled: {
        Args: { table_name: string }
        Returns: boolean
      }
      check_unique_constraints: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          constraint_name: string
          columns: string[]
        }[]
      }
      find_duplicate_votes: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          election_id: string
          duplicate_type: string
          count: number
        }[]
      }
      find_invalid_votes: {
        Args: Record<PropertyKey, never>
        Returns: {
          vote_id: string
          election_id: string
          user_id: string
          issue: string
        }[]
      }
      find_orphaned_votes: {
        Args: Record<PropertyKey, never>
        Returns: {
          vote_id: string
          election_id: string
          user_id: string
          issue: string
        }[]
      }
      get_election_vote_count: {
        Args: { election_uuid: string }
        Returns: {
          candidate_votes: number
          initiative_votes: number
          total_voters: number
        }[]
      }
      get_table_constraints: {
        Args: { table_name: string }
        Returns: {
          constraint_name: string
          constraint_type: string
          column_name: string
        }[]
      }
      get_user_feature_flags: {
        Args: {
          p_user_id: string
          p_user_role?: string
          p_environment?: string
        }
        Returns: {
          feature_name: string
          enabled: boolean
        }[]
      }
      get_user_voting_status: {
        Args: { user_uuid: string; election_uuid: string }
        Returns: {
          has_voted_candidates: boolean
          has_voted_initiatives: boolean
          candidate_session_id: string
          initiative_session_id: string
          candidate_confirmation_code: string
          initiative_confirmation_code: string
        }[]
      }
      get_voting_security_stats: {
        Args: { election_uuid: string }
        Returns: {
          total_votes: number
          unique_voters: number
          candidate_votes: number
          initiative_votes: number
          votes_per_user_avg: number
          suspicious_activity_count: number
        }[]
      }
      user_can_vote_in_session: {
        Args: {
          user_uuid: string
          election_uuid: string
          session_type_param: Database["public"]["Enums"]["vote_session_type"]
        }
        Returns: boolean
      }
      user_has_active_membership: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      user_has_completed_vote_session: {
        Args: {
          user_uuid: string
          election_uuid: string
          session_type_param: Database["public"]["Enums"]["vote_session_type"]
        }
        Returns: boolean
      }
      user_has_voted_in_election: {
        Args: { election_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      donation_status_enum: "pending" | "completed" | "failed" | "refunded"
      donor_type_enum: "individual" | "organization"
      election_status:
        | "draft"
        | "nominations_open"
        | "nominations_closed"
        | "voting_open"
        | "voting_closed"
        | "completed"
        | "cancelled"
      election_type: "leadership" | "initiative" | "board"
      membershiptypes: "Individual" | "Family"
      payment_method_enum:
        | "card"
        | "zelle"
        | "check"
        | "cash"
        | "us_bank_account"
        | "external"
      position_enum: "President" | "Vice President" | "Secretary" | "Treasurer"
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      purpose_enum:
        | "general-purpose"
        | "funeral-and-burial"
        | "new-member-support"
        | "youth-programs"
        | "social-events"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
      vote_option: "yes" | "no" | "abstain"
      vote_session_type: "candidates" | "initiatives" | "combined"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      donation_status_enum: ["pending", "completed", "failed", "refunded"],
      donor_type_enum: ["individual", "organization"],
      election_status: [
        "draft",
        "nominations_open",
        "nominations_closed",
        "voting_open",
        "voting_closed",
        "completed",
        "cancelled",
      ],
      election_type: ["leadership", "initiative", "board"],
      membershiptypes: ["Individual", "Family"],
      payment_method_enum: [
        "card",
        "zelle",
        "check",
        "cash",
        "us_bank_account",
        "external",
      ],
      position_enum: ["President", "Vice President", "Secretary", "Treasurer"],
      pricing_plan_interval: ["day", "week", "month", "year"],
      pricing_type: ["one_time", "recurring"],
      purpose_enum: [
        "general-purpose",
        "funeral-and-burial",
        "new-member-support",
        "youth-programs",
        "social-events",
      ],
      subscription_status: [
        "trialing",
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "unpaid",
        "paused",
      ],
      vote_option: ["yes", "no", "abstain"],
      vote_session_type: ["candidates", "initiatives", "combined"],
    },
  },
} as const

