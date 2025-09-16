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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      multi_produtos: {
        Row: {
          cap_max: number
          cap_nominal: number
          combinacoes: Json
          fabricante: string
          id: string
          max_evaps: number | null
          modelo: string
          nome: string
          tipo: string
        }
        Insert: {
          cap_max: number
          cap_nominal: number
          combinacoes: Json
          fabricante: string
          id?: string
          max_evaps?: number | null
          modelo: string
          nome: string
          tipo: string
        }
        Update: {
          cap_max?: number
          cap_nominal?: number
          combinacoes?: Json
          fabricante?: string
          id?: string
          max_evaps?: number | null
          modelo?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      simultaneidade: {
        Row: {
          id: number
          nome: string
          valor: number
        }
        Insert: {
          id?: number
          nome: string
          valor: number
        }
        Update: {
          id?: number
          nome?: string
          valor?: number
        }
        Relationships: []
      }
      simultaneidade_vrf: {
        Row: {
          id: number
          nome: string
          valor: number
        }
        Insert: {
          id?: number
          nome: string
          valor: number
        }
        Update: {
          id?: number
          nome?: string
          valor?: number
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ativo: boolean
          created_at: string
          departamento: string | null
          foto_url: string | null
          id: string
          nome_completo: string
          perfil_acesso: Database["public"]["Enums"]["user_profile"]
          senha: string
          updated_at: string
          usuario: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          departamento?: string | null
          foto_url?: string | null
          id?: string
          nome_completo: string
          perfil_acesso?: Database["public"]["Enums"]["user_profile"]
          senha: string
          updated_at?: string
          usuario: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          departamento?: string | null
          foto_url?: string | null
          id?: string
          nome_completo?: string
          perfil_acesso?: Database["public"]["Enums"]["user_profile"]
          senha?: string
          updated_at?: string
          usuario?: string
        }
        Relationships: []
      }
      vrf_cond_produtos: {
        Row: {
          hp: number
          id: number
          marca: string
          orientacao: string
          real: number
          tipo: string | null
          voltagem: string | null
        }
        Insert: {
          hp: number
          id?: number
          marca: string
          orientacao: string
          real: number
          tipo?: string | null
          voltagem?: string | null
        }
        Update: {
          hp?: number
          id?: number
          marca?: string
          orientacao?: string
          real?: number
          tipo?: string | null
          voltagem?: string | null
        }
        Relationships: []
      }
      vrf_evap_produtos: {
        Row: {
          id: number
          marca: string
          modelo: string | null
          nominal: number | null
          real: number
          tipo: string
        }
        Insert: {
          id?: number
          marca: string
          modelo?: string | null
          nominal?: number | null
          real: number
          tipo: string
        }
        Update: {
          id?: number
          marca?: string
          modelo?: string | null
          nominal?: number | null
          real?: number
          tipo?: string
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
      user_profile: "assistente" | "administrador"
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
      user_profile: ["assistente", "administrador"],
    },
  },
} as const
