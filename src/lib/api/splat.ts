/**
 * API functions for splat_configs and splat_hotspots tables
 */

import { supabase } from '../supabase'
import type {
  SplatConfig,
  SplatConfigUpdate,
  SplatHotspot,
  SplatHotspotInsert,
  SplatHotspotUpdate,
  ParsedSplatHotspot,
  HotspotBounds,
  HotspotVisualConfig,
} from '../database.types'

// ============================================================================
// SPLAT CONFIGS
// ============================================================================

/**
 * Get a splat config by ID
 */
export async function getSplatConfig(id: string): Promise<SplatConfig | null> {
  const { data, error } = await supabase
    .from('splat_configs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching splat config:', error)
    return null
  }

  return data
}

/**
 * Get the first active splat config (for single-kiosk setups)
 */
export async function getActiveSplatConfig(): Promise<SplatConfig | null> {
  const { data, error } = await supabase
    .from('splat_configs')
    .select('*')
    .eq('active', true)
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching active splat config:', error)
    return null
  }

  return data
}

/**
 * Get all splat configs
 */
export async function getAllSplatConfigs(): Promise<SplatConfig[]> {
  const { data, error } = await supabase
    .from('splat_configs')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching splat configs:', error)
    return []
  }

  return data || []
}

/**
 * Update a splat config's overview viewpoint
 */
export async function updateSplatConfigOverview(
  id: string,
  position: [number, number, number],
  rotation: [number, number, number],
  fov: number
): Promise<boolean> {
  const { error } = await supabase
    .from('splat_configs')
    .update({
      overview_position: position,
      overview_rotation: rotation,
      overview_fov: fov,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating splat config overview:', error)
    return false
  }

  return true
}

/**
 * Update a splat config
 */
export async function updateSplatConfig(
  id: string,
  updates: SplatConfigUpdate
): Promise<boolean> {
  const { error } = await supabase
    .from('splat_configs')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating splat config:', error)
    return false
  }

  return true
}

// ============================================================================
// SPLAT HOTSPOTS
// ============================================================================

/**
 * Parse a raw hotspot from the database into typed form
 */
function parseHotspot(hotspot: SplatHotspot): ParsedSplatHotspot {
  return {
    ...hotspot,
    bounds: hotspot.bounds as HotspotBounds,
    visual_config: hotspot.visual_config as HotspotVisualConfig | null,
  }
}

/**
 * Get all hotspots for a splat config
 */
export async function getHotspotsForConfig(
  configId: string
): Promise<ParsedSplatHotspot[]> {
  const { data, error } = await supabase
    .from('splat_hotspots')
    .select('*')
    .eq('splat_config_id', configId)
    .eq('active', true)
    .order('order_index')

  if (error) {
    console.error('Error fetching hotspots:', error)
    return []
  }

  return (data || []).map(parseHotspot)
}

/**
 * Get all hotspots for a splat config (including inactive)
 */
export async function getAllHotspotsForConfig(
  configId: string
): Promise<ParsedSplatHotspot[]> {
  const { data, error } = await supabase
    .from('splat_hotspots')
    .select('*')
    .eq('splat_config_id', configId)
    .order('order_index')

  if (error) {
    console.error('Error fetching all hotspots:', error)
    return []
  }

  return (data || []).map(parseHotspot)
}

/**
 * Get a single hotspot by ID
 */
export async function getHotspot(id: string): Promise<ParsedSplatHotspot | null> {
  const { data, error } = await supabase
    .from('splat_hotspots')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching hotspot:', error)
    return null
  }

  return parseHotspot(data)
}

/**
 * Get a hotspot by slug
 */
export async function getHotspotBySlug(
  configId: string,
  slug: string
): Promise<ParsedSplatHotspot | null> {
  const { data, error } = await supabase
    .from('splat_hotspots')
    .select('*')
    .eq('splat_config_id', configId)
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching hotspot by slug:', error)
    return null
  }

  return parseHotspot(data)
}

/**
 * Create a new hotspot
 */
export async function createHotspot(
  hotspot: SplatHotspotInsert
): Promise<ParsedSplatHotspot | null> {
  const { data, error } = await supabase
    .from('splat_hotspots')
    .insert(hotspot)
    .select()
    .single()

  if (error) {
    console.error('Error creating hotspot:', error)
    return null
  }

  return parseHotspot(data)
}

/**
 * Update a hotspot
 */
export async function updateHotspot(
  id: string,
  updates: SplatHotspotUpdate
): Promise<boolean> {
  const { error } = await supabase
    .from('splat_hotspots')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating hotspot:', error)
    return false
  }

  return true
}

/**
 * Update a hotspot's viewpoint (camera position for this hotspot)
 */
export async function updateHotspotViewpoint(
  id: string,
  position: [number, number, number],
  rotation: [number, number, number],
  fov: number
): Promise<boolean> {
  const { error } = await supabase
    .from('splat_hotspots')
    .update({
      viewpoint_position: position,
      viewpoint_rotation: rotation,
      viewpoint_fov: fov,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating hotspot viewpoint:', error)
    return false
  }

  return true
}

/**
 * Update a hotspot's bounds (polygon/rectangle/circle coordinates)
 */
export async function updateHotspotBounds(
  id: string,
  shape: 'polygon' | 'rectangle' | 'circle',
  bounds: HotspotBounds
): Promise<boolean> {
  const { error } = await supabase
    .from('splat_hotspots')
    .update({
      shape,
      bounds,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating hotspot bounds:', error)
    return false
  }

  return true
}

/**
 * Update a hotspot's visual config (colors, animation, etc.)
 */
export async function updateHotspotVisualConfig(
  id: string,
  visualConfig: HotspotVisualConfig
): Promise<boolean> {
  const { error } = await supabase
    .from('splat_hotspots')
    .update({
      visual_config: visualConfig,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating hotspot visual config:', error)
    return false
  }

  return true
}

/**
 * Delete a hotspot
 */
export async function deleteHotspot(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('splat_hotspots')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting hotspot:', error)
    return false
  }

  return true
}

/**
 * Soft delete (deactivate) a hotspot
 */
export async function deactivateHotspot(id: string): Promise<boolean> {
  return updateHotspot(id, { active: false })
}

/**
 * Reactivate a hotspot
 */
export async function activateHotspot(id: string): Promise<boolean> {
  return updateHotspot(id, { active: true })
}

/**
 * Reorder hotspots
 */
export async function reorderHotspots(
  orderedIds: string[]
): Promise<boolean> {
  // Update each hotspot's order_index
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('splat_hotspots')
      .update({ order_index: index })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  const hasError = results.some((r) => r.error)

  if (hasError) {
    console.error('Error reordering hotspots')
    return false
  }

  return true
}

// ============================================================================
// COMBINED QUERIES
// ============================================================================

/**
 * Get a splat config with all its hotspots in one call
 */
export async function getSplatConfigWithHotspots(configId: string): Promise<{
  config: SplatConfig | null
  hotspots: ParsedSplatHotspot[]
}> {
  const [config, hotspots] = await Promise.all([
    getSplatConfig(configId),
    getHotspotsForConfig(configId),
  ])

  return { config, hotspots }
}

/**
 * Get the active splat config with all its hotspots
 * This is the main entry point for the visitor kiosk
 */
export async function getActiveSplatConfigWithHotspots(): Promise<{
  config: SplatConfig | null
  hotspots: ParsedSplatHotspot[]
}> {
  const config = await getActiveSplatConfig()
  
  if (!config) {
    return { config: null, hotspots: [] }
  }

  const hotspots = await getHotspotsForConfig(config.id)
  
  return { config, hotspots }
}
