/**
 * Camera viewpoints for the interactive kiosk
 * 
 * Each viewpoint defines where the camera should position when viewing equipment.
 * The 'overview' viewpoint is the default/home position.
 * 
 * HOW TO CAPTURE REAL POSITIONS:
 * 1. Go to /admin/camera-capture
 * 2. Use orbit controls to navigate to a good viewpoint for each equipment
 * 3. Select equipment from dropdown, click "Save & Copy Code"
 * 4. Paste the values into this file
 */

export interface CameraViewpoint {
  id: string
  equipment_id: string | null  // null for overview
  position: [number, number, number]
  rotation: [number, number, number]
  fov?: number  // optional, defaults to 60
  label: {
    en: string
    fr: string
  }
}

// Known working overview position from your splat
const OVERVIEW_POSITION: [number, number, number] = [-0.005, -6.86, 0.296]
const OVERVIEW_ROTATION: [number, number, number] = [87.53, -0.96, 0]

export const viewpoints: CameraViewpoint[] = [
  {
    id: 'overview',
    equipment_id: null,
    position: OVERVIEW_POSITION,
    rotation: OVERVIEW_ROTATION,
    fov: 60,
    label: {
      en: 'Pump Room Overview',
      fr: 'Vue d\'ensemble de la salle des pompes'
    }
  },
  {
    id: 'main-pump-east-view',
    equipment_id: 'main-pump-east',
    // TEMP: Zoom in slightly (move Y closer, tighter FOV)
    position: [-0.005, -5.0, 0.296],
    rotation: [87.53, -0.96, 0],
    fov: 45,
    label: {
      en: 'East Centrifugal Pump',
      fr: 'Pompe centrifuge Est'
    }
  },
  {
    id: 'main-pump-west-view',
    equipment_id: 'main-pump-west',
    // TEMP: Zoom in slightly
    position: [-0.005, -4.5, 0.296],
    rotation: [87.53, -0.96, 0],
    fov: 42,
    label: {
      en: 'West Centrifugal Pump',
      fr: 'Pompe centrifuge Ouest'
    }
  },
  {
    id: 'main-engine-east-view',
    equipment_id: 'main-engine-east',
    // CAPTURED: Real viewpoint from admin tool
    position: [-0.208, -4.042, -4.125],
    rotation: [135.61, 2.89, 0.00],
    fov: 60,
    label: {
      en: 'Main Steam Engine (East)',
      fr: 'Moteur à vapeur principal (Est)'
    }
  },
  {
    id: 'main-engine-west-view',
    equipment_id: 'main-engine-west',
    // CAPTURED: Real viewpoint from admin tool
    position: [-0.450, -2.840, -2.840],
    rotation: [149.30, -0.97, 0.00],
    fov: 60,
    label: {
      en: 'Main Steam Engine (West)',
      fr: 'Moteur à vapeur principal (Ouest)'
    }
  },
  {
    id: 'auxiliary-pump-view',
    equipment_id: 'auxiliary-pump',
    // TEMP: Zoom in slightly
    position: [-0.005, -5.5, 0.296],
    rotation: [87.53, -0.96, 0],
    fov: 48,
    label: {
      en: 'Auxiliary Pump',
      fr: 'Pompe auxiliaire'
    }
  },
  {
    id: 'warm-water-tank-view',
    equipment_id: 'warm-water-tank',
    // TEMP: Zoom in slightly
    position: [-0.005, -5.2, 0.296],
    rotation: [87.53, -0.96, 0],
    fov: 50,
    label: {
      en: 'Warm Water Tank',
      fr: 'Réservoir d\'eau chaude'
    }
  },
  {
    id: 'steam-piping-view',
    equipment_id: 'steam-piping',
    // TEMP: Zoom in slightly
    position: [-0.005, -4.8, 0.296],
    rotation: [87.53, -0.96, 0],
    fov: 46,
    label: {
      en: 'Steam Supply Lines',
      fr: 'Conduites de vapeur'
    }
  },
  {
    id: 'discharge-piping-view',
    equipment_id: 'discharge-piping',
    // TEMP: Zoom in slightly
    position: [-0.005, -5.0, 0.296],
    rotation: [87.53, -0.96, 0],
    fov: 44,
    label: {
      en: 'Discharge Pipes',
      fr: 'Tuyaux de refoulement'
    }
  }
]

export const getViewpointById = (id: string): CameraViewpoint | undefined => {
  return viewpoints.find(v => v.id === id)
}

export const getViewpointForEquipment = (equipmentId: string): CameraViewpoint | undefined => {
  return viewpoints.find(v => v.equipment_id === equipmentId)
}

export const getOverviewViewpoint = (): CameraViewpoint => {
  return viewpoints.find(v => v.id === 'overview')!
}
