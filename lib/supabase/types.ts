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
      attachment: {
        Row: {
          filename: string
          id: string
          item_id: string
          kind: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          filename: string
          id?: string
          item_id: string
          kind: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          filename?: string
          id?: string
          item_id?: string
          kind?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachment_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item"
            referencedColumns: ["id"]
          },
        ]
      }
      item: {
        Row: {
          address: string | null
          created_at: string
          details: Json
          end_time: string | null
          id: string
          kind: Database["public"]["Enums"]["item_kind"]
          lat: number | null
          lng: number | null
          mapbox_place_id: string | null
          opening_hours: Json | null
          photo_url: string | null
          scheduled_date: string | null
          sort_order: number
          start_time: string | null
          title: string
          trip_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          details?: Json
          end_time?: string | null
          id?: string
          kind: Database["public"]["Enums"]["item_kind"]
          lat?: number | null
          lng?: number | null
          mapbox_place_id?: string | null
          opening_hours?: Json | null
          photo_url?: string | null
          scheduled_date?: string | null
          sort_order?: number
          start_time?: string | null
          title: string
          trip_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          details?: Json
          end_time?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["item_kind"]
          lat?: number | null
          lng?: number | null
          mapbox_place_id?: string | null
          opening_hours?: Json | null
          photo_url?: string | null
          scheduled_date?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_time_cache: {
        Row: {
          cached_at: string
          duration_seconds: number
          from_lat: number
          from_lng: number
          mode: string
          to_lat: number
          to_lng: number
        }
        Insert: {
          cached_at?: string
          duration_seconds: number
          from_lat: number
          from_lng: number
          mode?: string
          to_lat: number
          to_lng: number
        }
        Update: {
          cached_at?: string
          duration_seconds?: number
          from_lat?: number
          from_lng?: number
          mode?: string
          to_lat?: number
          to_lng?: number
        }
        Relationships: []
      }
      trip: {
        Row: {
          created_at: string
          destinations: Json
          end_date: string
          home_timezone: string
          id: string
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          destinations?: Json
          end_date: string
          home_timezone?: string
          id?: string
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          destinations?: Json
          end_date?: string
          home_timezone?: string
          id?: string
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      trip_member: {
        Row: {
          created_at: string
          role: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_member_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trip"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_member_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_trip_member: {
        Args: {
          p_trip_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      item_kind: "flight" | "lodging" | "activity" | "food"
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
