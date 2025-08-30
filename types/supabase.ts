export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          cnpj: string;
          excluido: boolean | null;
          nome_fantasia: string | null;
          razao_social: string;
        };
        Insert: {
          cnpj: string;
          excluido?: boolean | null;
          nome_fantasia?: string | null;
          razao_social: string;
        };
        Update: {
          cnpj?: string;
          excluido?: boolean | null;
          nome_fantasia?: string | null;
          razao_social?: string;
        };
        Relationships: [];
      };
      cupons: {
        Row: {
          cnpj: string;
          created_at: string;
          id: number;
          num_nota: string;
          sorteado_em: string | null;
        };
        Insert: {
          cnpj: string;
          created_at?: string;
          id?: number;
          num_nota: string;
          sorteado_em?: string | null;
        };
        Update: {
          cnpj?: string;
          created_at?: string;
          id?: number;
          num_nota?: string;
          sorteado_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cupons_cnpj_fkey";
            columns: ["cnpj"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["cnpj"];
          },
        ];
      };
      notas_fiscais: {
        Row: {
          cnpj: string;
          data_emissao: string | null;
          motivo: string | null;
          num_nota: string;
          qtd_fornecedores: number | null;
          utilizada_para_cupom: boolean;
          valida: boolean | null;
          valor: number | null;
          codfilial: string;
        };
        Insert: {
          cnpj: string;
          data_emissao?: string | null;
          motivo?: string | null;
          num_nota: string;
          qtd_fornecedores?: number | null;
          utilizada_para_cupom?: boolean;
          valida?: boolean | null;
          valor?: number | null;
          codfilial: string;
        };
        Update: {
          cnpj?: string;
          data_emissao?: string | null;
          motivo?: string | null;
          num_nota?: string;
          qtd_fornecedores?: number | null;
          utilizada_para_cupom?: boolean;
          valida?: boolean | null;
          valor?: number | null;
          codfilial?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_cnpj_fkey";
            columns: ["cnpj"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["cnpj"];
          },
        ];
      };
      sorteios: {
        Row: {
          admin_user_id: string;
          cupom_id: number;
          data_sorteio: string;
          id: number;
        };
        Insert: {
          admin_user_id: string;
          cupom_id: number;
          data_sorteio?: string;
          id?: number;
        };
        Update: {
          admin_user_id?: string;
          cupom_id?: number;
          data_sorteio?: string;
          id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sorteios_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sorteios_cupom_id_fkey";
            columns: ["cupom_id"];
            isOneToOne: false;
            referencedRelation: "cupons";
            referencedColumns: ["id"];
          },
        ];
      };
      usuarios: {
        Row: {
          cnpj: string | null;
          cpf: string | null;
          created_at: string;
          id: string;
          nome: string;
          role: string;
          whatsapp: string;
        };
        Insert: {
          cnpj?: string | null;
          cpf?: string | null;
          created_at?: string;
          id?: string;
          nome: string;
          role?: string;
          whatsapp: string;
        };
        Update: {
          cnpj?: string | null;
          cpf?: string | null;
          created_at?: string;
          id?: string;
          nome?: string;
          role?: string;
          whatsapp?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_clientes_by_cnpjs: {
        Args: { cnpjs_array: string[] };
        Returns: {
          cnpj_cliente: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
