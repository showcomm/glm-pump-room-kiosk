/**
 * Zustand store for kiosk state management
 */

import { create } from 'zustand'
import { getOverviewViewpoint, getViewpointForEquipment, CameraViewpoint } from '../data/viewpoints'
import { equipment } from '../data/equipment'
import { Equipment } from '../data/types'

type Language = 'en' | 'fr'

interface KioskStore {
  // Language
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  
  // Navigation state
  currentViewpoint: CameraViewpoint
  targetViewpoint: CameraViewpoint | null
  isTransitioning: boolean
  
  // Selected equipment
  selectedEquipmentId: string | null
  selectedEquipment: Equipment | null
  
  // Actions
  navigateToEquipment: (equipmentId: string) => void
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

export const useKioskStore = create<KioskStore>((set, get) => ({
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
  
  // Selected equipment
  selectedEquipmentId: null,
  selectedEquipment: null,
  
  // Actions
  navigateToEquipment: (equipmentId) => {
    const viewpoint = getViewpointForEquipment(equipmentId)
    const equipmentData = equipment.find(e => e.id === equipmentId)
    
    if (viewpoint && equipmentData) {
      set({
        targetViewpoint: viewpoint,
        isTransitioning: true,
        selectedEquipmentId: equipmentId,
        selectedEquipment: equipmentData,
        lastInteractionTime: Date.now(),
        isIdle: false
      })
    }
  },
  
  navigateToOverview: () => {
    const overview = getOverviewViewpoint()
    set({
      targetViewpoint: overview,
      isTransitioning: true,
      selectedEquipmentId: null,
      selectedEquipment: null,
      lastInteractionTime: Date.now(),
      isIdle: false
    })
  },
  
  clearSelection: () => set({
    selectedEquipmentId: null,
    selectedEquipment: null
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
