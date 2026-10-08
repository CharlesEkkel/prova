export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_info: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          key?: string;
          value?: string;
        };
        Relationships: [];
      };
      owner_emails: {
        Row: {
          email: string;
        };
        Insert: {
          email: string;
        };
        Update: {
          email?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission: Database['public']['Enums']['permission'];
          role_id: string;
        };
        Insert: {
          permission: Database['public']['Enums']['permission'];
          role_id: string;
        };
        Update: {
          permission?: Database['public']['Enums']['permission'];
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          builtin: string | null;
          id: string;
          is_builtin: boolean | null;
          name: string;
        };
        Insert: {
          builtin?: string | null;
          id?: string;
          is_builtin?: never;
          name: string;
        };
        Update: {
          builtin?: string | null;
          id?: string;
          is_builtin?: never;
          name?: string;
        };
        Relationships: [];
      };
      singer_roles: {
        Row: {
          role_id: string;
          singer_id: string;
        };
        Insert: {
          role_id: string;
          singer_id: string;
        };
        Update: {
          role_id?: string;
          singer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'singer_roles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'singer_roles_singer_id_fkey';
            columns: ['singer_id'];
            isOneToOne: false;
            referencedRelation: 'singers';
            referencedColumns: ['id'];
          },
        ];
      };
      singers: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          default_voice_part_id: string | null;
          display_name: string;
          email: string;
          email_verified: boolean;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          default_voice_part_id?: string | null;
          display_name: string;
          email: string;
          email_verified?: boolean;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          default_voice_part_id?: string | null;
          display_name?: string;
          email?: string;
          email_verified?: boolean;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'singers_default_voice_part_fk';
            columns: ['default_voice_part_id'];
            isOneToOne: false;
            referencedRelation: 'voice_parts';
            referencedColumns: ['id'];
          },
        ];
      };
      site_settings: {
        Row: {
          colour_theme: string;
        };
        Insert: {
          colour_theme?: string;
        };
        Update: {
          colour_theme?: string;
        };
        Relationships: [];
      };
      voice_parts: {
        Row: {
          id: string;
          name: string;
          position: number;
          short_label: string;
        };
        Insert: {
          id?: string;
          name: string;
          position: number;
          short_label: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: number;
          short_label?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_create_role: {
        Args: { perms: Database['public']['Enums']['permission'][]; role_name: string };
        Returns: string;
      };
      admin_delete_role: { Args: { target: string }; Returns: undefined };
      admin_remove_singer: { Args: { target: string }; Returns: undefined };
      admin_roles: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_set_singer_roles: { Args: { role_ids: string[]; target: string }; Returns: undefined };
      admin_singers: { Args: Record<PropertyKey, never>; Returns: Json };
      admin_update_role: {
        Args: {
          perms: Database['public']['Enums']['permission'][];
          role_name: string;
          target: string;
        };
        Returns: undefined;
      };
      check_role_definition: {
        Args: {
          except_role: string;
          perms: Database['public']['Enums']['permission'][];
          role_name: string;
        };
        Returns: undefined;
      };
      grant_admin_to_owners: { Args: Record<PropertyKey, never>; Returns: undefined };
      has_permission: {
        Args: { required: Database['public']['Enums']['permission'] };
        Returns: boolean;
      };
      is_owner: { Args: { singer: string }; Returns: boolean };
      my_default_voice_part: { Args: Record<PropertyKey, never>; Returns: Json };
      my_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['permission'][];
      };
      permissions_of: {
        Args: { singer: string };
        Returns: Database['public']['Enums']['permission'][];
      };
      require_manage_admins_if: { Args: { touches_manage_users: boolean }; Returns: undefined };
      require_permission: {
        Args: { required: Database['public']['Enums']['permission'] };
        Returns: undefined;
      };
      role_grants_manage_users: { Args: { role: string }; Returns: boolean };
      set_my_default_voice_part: { Args: { chosen: string }; Returns: undefined };
      set_owner_emails: { Args: { emails: string[] }; Returns: undefined };
    };
    Enums: {
      permission: 'read' | 'append' | 'update' | 'delete' | 'manage-users' | 'manage-admins';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      permission: ['read', 'append', 'update', 'delete', 'manage-users', 'manage-admins'],
    },
  },
} as const;
