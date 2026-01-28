/**
 * Supabase database types
 * Generated from supabase-kiosk project schema
 * 
 * Only includes splat_* tables used by this kiosk.
 * Run `supabase gen types typescript` to regenerate full types.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      splat_configs: {
        Row: {
          id: string
          kiosk_id: string | null
          name: string
          description: string | null
          splat_url: string
          overview_position: number[]
          overview_rotation: number[]
          overview_fov: number
          frame_width: number | null
          background_color: string | null
          idle_timeout_seconds: number | null
          settings: Json | null
          active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          kiosk_id?: string | null
          name: string
          description?: string | null
          splat_url: string
          overview_position?: number[]
          overview_rotation?: number[]
          overview_fov?: number
          frame_width?: number | null
          background_color?: string | null
          idle_timeout_seconds?: number | null
          settings?: Json | null
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          kiosk_id?: string | null
          name?: string
          description?: string | null
          splat_url?: string
          overview_position?: number[]
          overview_rotation?: number[]
          overview_fov?: number
          frame_width?: number | null
          background_color?: string | null
          idle_timeout_seconds?: number | null
          settings?: Json | null
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      splat_hotspots: {
        Row: {
          id: string
          splat_config_id: string
          slug: string
          name_en: string
          name_fr: string | null
          shape: string
          bounds: Json
          viewpoint_position: number[] | null
          viewpoint_rotation: number[] | null
          viewpoint_fov: number | null
          visual_config: Json | null
          description_en: string | null
          description_fr: string | null
          function_en: string | null
          function_fr: string | null
          specifications_en: string | null
          specifications_fr: string | null
          year_installed: number | null
          manufacturer: string | null
          content: Json | null
          order_index: number | null
          active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          splat_config_id: string
          slug: string
          name_en: string
          name_fr?: string | null
          shape?: string
          bounds?: Json
          viewpoint_position?: number[] | null
          viewpoint_rotation?: number[] | null
          viewpoint_fov?: number | null
          visual_config?: Json | null
          description_en?: string | null
          description_fr?: string | null
          function_en?: string | null
          function_fr?: string | null
          specifications_en?: string | null
          specifications_fr?: string | null
          year_installed?: number | null
          manufacturer?: string | null
          content?: Json | null
          order_index?: number | null
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          splat_config_id?: string
          slug?: string
          name_en?: string
          name_fr?: string | null
          shape?: string
          bounds?: Json
          viewpoint_position?: number[] | null
          viewpoint_rotation?: number[] | null
          viewpoint_fov?: number | null
          visual_config?: Json | null
          description_en?: string | null
          description_fr?: string | null
          function_en?: string | null
          function_fr?: string | null
          specifications_en?: string | null
          specifications_fr?: string | null
          year_installed?: number | null
          manufacturer?: string | null
          content?: Json | null
          order_index?: number | null
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type SplatConfig = Database['public']['Tables']['splat_configs']['Row']
export type SplatConfigInsert = Database['public']['Tables']['splat_configs']['Insert']
export type SplatConfigUpdate = Database['public']['Tables']['splat_configs']['Update']

export type SplatHotspot = Database['public']['Tables']['splat_hotspots']['Row']
export type SplatHotspotInsert = Database['public']['Tables']['splat_hotspots']['Insert']
export type SplatHotspotUpdate = Database['public']['Tables']['splat_hotspots']['Update']

// Parsed types with proper shapes for bounds and visual config
export interface PolygonBounds {
  points: Array<{ x: number; y: number }>
}

export interface RectangleBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface CircleBounds {
  cx: number
  cy: number
  r: number
}

export type HotspotBounds = PolygonBounds | RectangleBounds | CircleBounds

export interface HotspotVisualConfig {
  fillColor?: string
  fillColorHover?: string
  strokeColor?: string
  strokeColorHover?: string
  strokeWidth?: number
  pulseAnimation?: boolean
}

// Parsed hotspot with typed bounds
export interface ParsedSplatHotspot extends Omit<SplatHotspot, 'bounds' | 'visual_config'> {
  bounds: HotspotBounds
  visual_config: HotspotVisualConfig | null
}
