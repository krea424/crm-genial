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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          company_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          tax_code: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          tax_code?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          tax_code?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          pratica_id: string
          preventivo_id: string | null
          received_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          step_label: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          pratica_id: string
          preventivo_id?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          step_label: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          pratica_id?: string
          preventivo_id?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          step_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_pratica_id_fkey"
            columns: ["pratica_id"]
            isOneToOne: false
            referencedRelation: "pratiche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_preventivo_id_fkey"
            columns: ["preventivo_id"]
            isOneToOne: false
            referencedRelation: "preventivi"
            referencedColumns: ["id"]
          },
        ]
      }
      pratica_phases: {
        Row: {
          created_at: string
          duration_hours: number | null
          ended_at: string | null
          id: string
          notes: string | null
          phase_code: string
          phase_label: string
          pratica_id: string
          responsible_id: string
          sla_breached: boolean
          sla_hours: number
          started_at: string
        }
        Insert: {
          created_at?: string
          duration_hours?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          phase_code: string
          phase_label: string
          pratica_id: string
          responsible_id: string
          sla_breached?: boolean
          sla_hours?: number
          started_at?: string
        }
        Update: {
          created_at?: string
          duration_hours?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          phase_code?: string
          phase_label?: string
          pratica_id?: string
          responsible_id?: string
          sla_breached?: boolean
          sla_hours?: number
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pratica_phases_pratica_id_fkey"
            columns: ["pratica_id"]
            isOneToOne: false
            referencedRelation: "pratiche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pratica_phases_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pratica_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
        }
        Relationships: []
      }
      pratiche: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          current_phase_code: string | null
          current_responsible: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          id: string
          notes: string | null
          opened_at: string
          practice_code: string | null
          pratica_type_id: string
          site_address: string | null
          site_city: string | null
          status: Database["public"]["Enums"]["pratica_status"]
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_phase_code?: string | null
          current_responsible?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          practice_code?: string | null
          pratica_type_id: string
          site_address?: string | null
          site_city?: string | null
          status?: Database["public"]["Enums"]["pratica_status"]
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_phase_code?: string | null
          current_responsible?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          id?: string
          notes?: string | null
          opened_at?: string
          practice_code?: string | null
          pratica_type_id?: string
          site_address?: string | null
          site_city?: string | null
          status?: Database["public"]["Enums"]["pratica_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pratiche_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pratiche_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pratiche_current_responsible_fkey"
            columns: ["current_responsible"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pratiche_pratica_type_id_fkey"
            columns: ["pratica_type_id"]
            isOneToOne: false
            referencedRelation: "pratica_types"
            referencedColumns: ["id"]
          },
        ]
      }
      preventivi: {
        Row: {
          accepted_at: string | null
          apply_withholding: boolean
          created_at: string
          created_by: string
          expenses: number
          honorarium: number
          id: string
          notes: string | null
          pratica_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["preventivo_status"]
          taxable_amount: number
          total_gross: number
          total_net: number
          updated_at: string
          valid_until: string | null
          vat_amount: number
          vat_rate: number
          version_number: number
          withholding_tax: number
        }
        Insert: {
          accepted_at?: string | null
          apply_withholding?: boolean
          created_at?: string
          created_by: string
          expenses?: number
          honorarium?: number
          id?: string
          notes?: string | null
          pratica_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["preventivo_status"]
          taxable_amount: number
          total_gross: number
          total_net: number
          updated_at?: string
          valid_until?: string | null
          vat_amount: number
          vat_rate?: number
          version_number?: number
          withholding_tax: number
        }
        Update: {
          accepted_at?: string | null
          apply_withholding?: boolean
          created_at?: string
          created_by?: string
          expenses?: number
          honorarium?: number
          id?: string
          notes?: string | null
          pratica_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["preventivo_status"]
          taxable_amount?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          valid_until?: string | null
          vat_amount?: number
          vat_rate?: number
          version_number?: number
          withholding_tax?: number
        }
        Relationships: [
          {
            foreignKeyName: "preventivi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivi_pratica_id_fkey"
            columns: ["pratica_id"]
            isOneToOne: false
            referencedRelation: "pratiche"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          weekly_hours: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          weekly_hours?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          weekly_hours?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          estimated_hours: number | null
          id: string
          phase_code: string
          pratica_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          phase_code: string
          pratica_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          phase_code?: string
          pratica_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_pratica_id_fkey"
            columns: ["pratica_id"]
            isOneToOne: false
            referencedRelation: "pratiche"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string
          default_role: Database["public"]["Enums"]["user_role"]
          id: string
          is_final: boolean
          phase_code: string
          phase_label: string
          phase_order: number
          pratica_type_id: string
          required_docs: string[]
          sla_hours: number
        }
        Insert: {
          created_at?: string
          default_role: Database["public"]["Enums"]["user_role"]
          id?: string
          is_final?: boolean
          phase_code: string
          phase_label: string
          phase_order: number
          pratica_type_id: string
          required_docs?: string[]
          sla_hours?: number
        }
        Update: {
          created_at?: string
          default_role?: Database["public"]["Enums"]["user_role"]
          id?: string
          is_final?: boolean
          phase_code?: string
          phase_label?: string
          phase_order?: number
          pratica_type_id?: string
          required_docs?: string[]
          sla_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_pratica_type_id_fkey"
            columns: ["pratica_type_id"]
            isOneToOne: false
            referencedRelation: "pratica_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      client_type: "privato" | "azienda" | "ente_pubblico"
      notification_type:
        | "handoff"
        | "sla_warning"
        | "sla_breach"
        | "billing_ready"
        | "lead_pending"
        | "payment_overdue"
        | "preventivo_accettato"
      payment_status: "atteso" | "ricevuto" | "in_ritardo"
      pratica_status: "lead" | "attiva" | "sospesa" | "completata" | "annullata"
      preventivo_status:
        | "bozza"
        | "inviato"
        | "accettato"
        | "rifiutato"
        | "scaduto"
      user_role: "amministrativa" | "tecnico" | "titolare" | "admin"
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
      client_type: ["privato", "azienda", "ente_pubblico"],
      notification_type: [
        "handoff",
        "sla_warning",
        "sla_breach",
        "billing_ready",
        "lead_pending",
        "payment_overdue",
        "preventivo_accettato",
      ],
      payment_status: ["atteso", "ricevuto", "in_ritardo"],
      pratica_status: ["lead", "attiva", "sospesa", "completata", "annullata"],
      preventivo_status: [
        "bozza",
        "inviato",
        "accettato",
        "rifiutato",
        "scaduto",
      ],
      user_role: ["amministrativa", "tecnico", "titolare", "admin"],
    },
  },
} as const
