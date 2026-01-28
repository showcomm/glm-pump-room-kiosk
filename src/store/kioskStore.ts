/**
 * Zustand store for kiosk state management
 * 
 * Updated to use database hotspots instead of hardcoded equipment/viewpoints
 */

import { create } from 'zustand'
import { getOverviewViewpoint, CameraViewpoint } from '../data/viewpoints'
import type { ParsedSplatHotspot } from '../lib/database.types'

type Language = 'en' | 'fr'

interface KioskStore {
  // Hotspot data from database
  hotspots: ParsedSplatHotspot[]
  setHotspots: (hotspots: ParsedSplatHotspot[]) => void
  
  // Language
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  
  // Navigation state
  currentViewpoint: CameraViewpoint
  targetViewpoint: CameraViewpoint | null
  isTransitioning: boolean
  
  // Selected hotspot
  selectedHotspotSlug: string | null
  selectedHotspot: ParsedSplatHotspot | null
  
  // Actions
  navigateToEquipment: (hotspotSlug: string) => void
  navigateToOverview: () => void
  clearSelection: () => void
  completeTransition: () => void
  
  // Idle management
  lastInteractionTime: number
  isIdle: boolean
  recordInteraction: () => void
  setIdle: (idle: boolean) => void
  
  // Admin mode (for camera capture)
  isAdminMode: boolean
  setAdminMode: (enabled: boolean) => void
}

const IDLE_TIMEOUT_MS = 60000 // 60 seconds

// Helper to convert hotspot viewpoint to CameraViewpoint format
function hotspotToViewpoint(hotspot: ParsedSplatHotspot): CameraViewpoint | null {
  if (!hotspot.viewpoint_position || hotspot.viewpoint_position.length !== 3) {
    console.warn(`Hotspot ${hotspot.slug} has no viewpoint set`)
    return null
  }
  
  if (!hotspot.viewpoint_rotation || hotspot.viewpoint_rotation.length !== 3) {
    console.warn(`Hotspot ${hotspot.slug} has no rotation set`)
    return null
  }
  
  return {
    id: `${hotspot.slug}-view`,
    equipment_id: hotspot.slug,
    position: [
      Number(hotspot.viewpoint_position[0]),
      Number(hotspot.viewpoint_position[1]),
      Number(hotspot.viewpoint_position[2])
    ],
    rotation: [
      Number(hotspot.viewpoint_rotation[0]),
      Number(hotspot.viewpoint_rotation[1]),
      Number(hotspot.viewpoint_rotation[2])
    ],
    fov: Number(hotspot.viewpoint_fov || 60),
    label: {
      en: hotspot.name_en,
      fr: hotspot.name_fr || hotspot.name_en
    }
  }
}

export const useKioskStore = create<KioskStore>((set, get) => ({
  // Hotspot data
  hotspots: [],
  setHotspots: (hotspots) => set({ hotspots }),
  
  // Language
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
  toggleLanguage: () => set((state) => ({ 
    language: state.language === 'en' ? 'fr' : 'en' 
  })),
  
  // Navigation state
  currentViewpoint: getOverviewViewpoint(),
  targetViewpoint: null,
  isTransitioning: false,
  
  // Selected hotspot
  selectedHotspotSlug: null,
  selectedHotspot: null,
  
  // Actions
  navigateToEquipment: (hotspotSlug) => {
    const { hotspots } = get()
    const hotspot = hotspots.find(h => h.slug === hotspotSlug)
    
    if (!hotspot) {
      console.error(`Hotspot not found: ${hotspotSlug}`)
      return
    }
    
    const viewpoint = hotspotToViewpoint(hotspot)
    
    if (!viewpoint) {
      console.error(`Hotspot ${hotspotSlug} has no valid viewpoint data`)
      return
    }
    
    set({
      targetViewpoint: viewpoint,
      isTransitioning: true,
      selectedHotspotSlug: hotspotSlug,
      selectedHotspot: hotspot,
      lastInteractionTime: Date.now(),
      isIdle: false
    })
  },
  
  navigateToOverview: () => {
    const overview = getOverviewViewpoint()
    set({
      targetViewpoint: overview,
      isTransitioning: true,
      selectedHotspotSlug: null,
      selectedHotspot: null,
      lastInteractionTime: Date.now(),
      isIdle: false
    })
  },
  
  clearSelection: () => set({
    selectedHotspotSlug: null,
    selectedHotspot: null
  }),
  
  completeTransition: () => {
    const { targetViewpoint } = get()
    if (targetViewpoint) {
      set({
        currentViewpoint: targetViewpoint,
        targetViewpoint: null,
        isTransitioning: false
      })
    }
  },
  
  // Idle management
  lastInteractionTime: Date.now(),
  isIdle: false,
  recordInteraction: () => set({ 
    lastInteractionTime: Date.now(),
    isIdle: false
  }),
  setIdle: (idle) => set({ isIdle: idle }),
  
  // Admin mode
  isAdminMode: false,
  setAdminMode: (enabled) => set({ isAdminMode: enabled })
}))

// Idle timer check (call this from a useEffect)
export const checkIdleTimeout = () => {
  const { lastInteractionTime, isIdle, setIdle, navigateToOverview } = useKioskStore.getState()
  const now = Date.now()
  
  if (!isIdle && (now - lastInteractionTime) > IDLE_TIMEOUT_MS) {
    setIdle(true)
    navigateToOverview()
  }
}
