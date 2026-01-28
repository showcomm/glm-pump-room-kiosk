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
          target_width: number
          target_height: number
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
          target_width?: number
          target_height?: number
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
          target_width?: number
          target_height?: number
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

// Common display resolution presets
export const RESOLUTION_PRESETS = [
  { label: '1920×1080 (16:9 Landscape)', width: 1920, height: 1080 },
  { label: '1080×1920 (9:16 Portrait)', width: 1080, height: 1920 },
  { label: '2560×1440 (16:9 QHD)', width: 2560, height: 1440 },
  { label: '1440×2560 (9:16 QHD Portrait)', width: 1440, height: 2560 },
  { label: '3840×2160 (16:9 4K)', width: 3840, height: 2160 },
  { label: '2160×3840 (9:16 4K Portrait)', width: 2160, height: 3840 },
  { label: '1280×720 (16:9 HD)', width: 1280, height: 720 },
  { label: '720×1280 (9:16 HD Portrait)', width: 720, height: 1280 },
] as const
