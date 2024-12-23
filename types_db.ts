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
          donation_interval: Database["public"]["Enums"]["pricing_plan_interval"]
          donation_status: Database["public"]["Enums"]["donation_status_enum"]
          donation_type: Database["public"]["Enums"]["pricing_type"]
          donor_id: string
          goods_or_services_provided: boolean | null
          goods_services_description: string | null
          goods_services_estimate: number | null
          id: string
          intangible_benefits: boolean | null
          is_anonymous: boolean
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
          donation_interval: Database["public"]["Enums"]["pricing_plan_interval"]
          donation_status?: Database["public"]["Enums"]["donation_status_enum"]
          donation_type: Database["public"]["Enums"]["pricing_type"]
          donor_id: string
          goods_or_services_provided?: boolean | null
          goods_services_description?: string | null
          goods_services_estimate?: number | null
          id?: string
          intangible_benefits?: boolean | null
          is_anonymous: boolean
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
          donation_interval?: Database["public"]["Enums"]["pricing_plan_interval"]
          donation_status?: Database["public"]["Enums"]["donation_status_enum"]
          donation_type?: Database["public"]["Enums"]["pricing_type"]
          donor_id?: string
          goods_or_services_provided?: boolean | null
          goods_services_description?: string | null
          goods_services_estimate?: number | null
          id?: string
          intangible_benefits?: boolean | null
          is_anonymous?: boolean
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          currency: string | null
          date: string
          description: string | null
          id: string
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
          payee?: string | null
          payment_method?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      donation_status_enum: "pending" | "completed" | "failed" | "refunded"
      donor_type_enum: "individual" | "organization"
      membershiptypes: "Individual" | "Family"
      payment_method_enum:
        | "card"
        | "zelle"
        | "check"
        | "cash"
        | "us_bank_account"
        | "external"
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      purpose_enum:
        | "general-purpose"
        | "funeral-and-burial"
        | "new-member-support"
        | "youth-programs"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
