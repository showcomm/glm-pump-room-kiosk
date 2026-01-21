/**
 * Core data types for the pump room kiosk
 */

// Bilingual text content
export interface BilingualText {
  en: string
  fr: string
}

// Equipment item in the pump room
export interface Equipment {
  id: string
  name: BilingualText
  description: BilingualText
  function: BilingualText
  specifications?: BilingualText
  year_installed?: number
  manufacturer?: string
  color_category: 'pump' | 'steam' | 'discharge' | 'water' | 'auxiliary'
  hotspot: Hotspot
  images?: MediaItem[]
  engineering_drawings?: MediaItem[]
  related_equipment_ids?: string[]
}

// Hotspot definition for interactive areas
export interface Hotspot {
  id: string
  shape: 'circle' | 'rectangle' | 'polygon'
  coordinates: HotspotCoordinates
  label?: BilingualText
  pulse_animation?: boolean
}

export type HotspotCoordinates = 
  | { type: 'circle'; center_x: number; center_y: number; radius: number }
  | { type: 'rectangle'; x: number; y: number; width: number; height: number }
  | { type: 'polygon'; points: Array<{ x: number; y: number }> }

// Media items (images, drawings, etc.)
export interface MediaItem {
  id: string
  type: 'photo' | 'drawing' | 'diagram' | 'animation'
  url: string
  thumbnail_url?: string
  caption: BilingualText
  year?: number
  source?: string
  archival_reference?: string
}

// Quiz question
export interface QuizQuestion {
  id: string
  question: BilingualText
  correct_equipment_id: string
  hint?: BilingualText
  explanation: BilingualText
  difficulty: 'easy' | 'medium' | 'hard'
}

// Animation sequence step
export interface AnimationStep {
  id: string
  order: number
  title: BilingualText
  description: BilingualText
  duration_ms: number
  highlighted_equipment_ids: string[]
  flow_paths?: FlowPath[]
}

export interface FlowPath {
  id: string
  type: 'steam' | 'water' | 'coal'
  points: Array<{ x: number; y: number }>
  color: string
  animated: boolean
}

// Photo gallery item
export interface GalleryPhoto {
  id: string
  image_url: string
  thumbnail_url: string
  title: BilingualText
  description: BilingualText
  year?: number
  era: 'construction' | 'early_operation' | 'wwii' | 'postwar' | 'modern'
  source: string
  archival_reference?: string
  tags: string[]
}

// Building cutaway section
export interface CutawaySection {
  id: string
  name: BilingualText
  description: BilingualText
  bounds: { x: number; y: number; width: number; height: number }
  equipment_ids: string[]
}

// Application state
export interface KioskState {
  language: 'en' | 'fr'
  idle_timeout_ms: number
  last_interaction: number
  current_feature: string | null
  selected_equipment_id: string | null
}
