/**
 * React hook for loading splat config and hotspots from Supabase
 */

import { useState, useEffect, useCallback } from 'react'
import type { SplatConfig, ParsedSplatHotspot } from '../lib/database.types'
import {
  getActiveSplatConfigWithHotspots,
  getSplatConfigWithHotspots,
  updateHotspotViewpoint,
  updateHotspotBounds,
  updateSplatConfigOverview,
  updateSplatConfigSettings,
  type HotspotBounds,
} from '../lib/api/splat'

interface UseSplatDataOptions {
  /** Specific config ID to load (optional - defaults to active config) */
  configId?: string
  /** Auto-load on mount (default: true) */
  autoLoad?: boolean
}

interface UseSplatDataReturn {
  /** The loaded splat config */
  config: SplatConfig | null
  /** The loaded hotspots */
  hotspots: ParsedSplatHotspot[]
  /** Whether data is currently loading */
  loading: boolean
  /** Any error that occurred */
  error: string | null
  /** Manually trigger a reload */
  reload: () => Promise<void>
  /** Update a hotspot's viewpoint and refresh local state */
  saveHotspotViewpoint: (
    hotspotId: string,
    position: [number, number, number],
    rotation: [number, number, number],
    fov: number
  ) => Promise<boolean>
  /** Update a hotspot's bounds and refresh local state */
  saveHotspotBounds: (
    hotspotId: string,
    shape: 'polygon' | 'rectangle' | 'circle',
    bounds: HotspotBounds
  ) => Promise<boolean>
  /** Update the overview viewpoint and refresh local state */
  saveOverviewViewpoint: (
    position: [number, number, number],
    rotation: [number, number, number],
    fov: number
  ) => Promise<boolean>
  /** Update config settings and refresh local state */
  saveConfigSettings: (
    settingsUpdate: Record<string, unknown>
  ) => Promise<boolean>
}

export function useSplatData(options: UseSplatDataOptions = {}): UseSplatDataReturn {
  const { configId, autoLoad = true } = options

  const [config, setConfig] = useState<SplatConfig | null>(null)
  const [hotspots, setHotspots] = useState<ParsedSplatHotspot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = configId
        ? await getSplatConfigWithHotspots(configId)
        : await getActiveSplatConfigWithHotspots()

      if (!result.config) {
        setError('No splat configuration found')
        setConfig(null)
        setHotspots([])
      } else {
        setConfig(result.config)
        setHotspots(result.hotspots)
      }
    } catch (err) {
      console.error('Error loading splat data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setConfig(null)
      setHotspots([])
    } finally {
      setLoading(false)
    }
  }, [configId])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadData()
    }
  }, [autoLoad, loadData])

  // Save hotspot viewpoint and update local state
  const saveHotspotViewpoint = useCallback(
    async (
      hotspotId: string,
      position: [number, number, number],
      rotation: [number, number, number],
      fov: number
    ): Promise<boolean> => {
      const success = await updateHotspotViewpoint(hotspotId, position, rotation, fov)

      if (success) {
        // Update local state immediately
        setHotspots((prev) =>
          prev.map((h) =>
            h.id === hotspotId
              ? {
                  ...h,
                  viewpoint_position: position,
                  viewpoint_rotation: rotation,
                  viewpoint_fov: fov,
                }
              : h
          )
        )
      }

      return success
    },
    []
  )

  // Save hotspot bounds and update local state
  const saveHotspotBounds = useCallback(
    async (
      hotspotId: string,
      shape: 'polygon' | 'rectangle' | 'circle',
      bounds: HotspotBounds
    ): Promise<boolean> => {
      const success = await updateHotspotBounds(hotspotId, shape, bounds)

      if (success) {
        // Update local state immediately
        setHotspots((prev) =>
          prev.map((h) =>
            h.id === hotspotId
              ? {
                  ...h,
                  shape,
                  bounds,
                }
              : h
          )
        )
      }

      return success
    },
    []
  )

  // Save overview viewpoint and update local state
  const saveOverviewViewpoint = useCallback(
    async (
      position: [number, number, number],
      rotation: [number, number, number],
      fov: number
    ): Promise<boolean> => {
      if (!config) return false

      const success = await updateSplatConfigOverview(config.id, position, rotation, fov)

      if (success) {
        // Update local state immediately
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                overview_position: position,
                overview_rotation: rotation,
                overview_fov: fov,
              }
            : null
        )
      }

      return success
    },
    [config]
  )

  // Save config settings and update local state
  const saveConfigSettings = useCallback(
    async (settingsUpdate: Record<string, unknown>): Promise<boolean> => {
      if (!config) return false

      const success = await updateSplatConfigSettings(config.id, settingsUpdate)

      if (success) {
        // Update local state immediately
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                settings: {
                  ...((prev.settings as Record<string, unknown>) || {}),
                  ...settingsUpdate,
                },
              }
            : null
        )
      }

      return success
    },
    [config]
  )

  return {
    config,
    hotspots,
    loading,
    error,
    reload: loadData,
    saveHotspotViewpoint,
    saveHotspotBounds,
    saveOverviewViewpoint,
    saveConfigSettings,
  }
}
