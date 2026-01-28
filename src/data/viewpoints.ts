/**
 * Camera viewpoints for the interactive kiosk
 * 
 * Each viewpoint defines where the camera should position when viewing equipment.
 * The 'overview' viewpoint is the default/home position.
 * 
 * IMPORTANT: These are PLACEHOLDER values. You'll need to capture real positions
 * using the admin capture tool once it's working. For now, these provide structure
 * for testing the transition system.
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

export const viewpoints: CameraViewpoint[] = [
  {
    id: 'overview',
    equipment_id: null,
    position: [-0.005, -6.86, 0.296],
    rotation: [87.53, -0.96, 0],
    fov: 60,
    label: {
      en: 'Pump Room Overview',
      fr: 'Vue d\'ensemble de la salle des pompes'
    }
  },
  {
    id: 'main-pump-east-view',
    equipment_id: 'main-pump-east',
    // PLACEHOLDER - capture real position
    position: [-1.5, -4.0, 0.5],
    rotation: [75, -15, 0],
    fov: 55,
    label: {
      en: 'East Centrifugal Pump',
      fr: 'Pompe centrifuge Est'
    }
  },
  {
    id: 'main-pump-west-view',
    equipment_id: 'main-pump-west',
    // PLACEHOLDER - capture real position
    position: [1.5, -4.0, 0.5],
    rotation: [75, 15, 0],
    fov: 55,
    label: {
      en: 'West Centrifugal Pump',
      fr: 'Pompe centrifuge Ouest'
    }
  },
  {
    id: 'main-engine-east-view',
    equipment_id: 'main-engine-east',
    // PLACEHOLDER - capture real position
    position: [-2.0, -3.5, 1.0],
    rotation: [60, -20, 0],
    fov: 50,
    label: {
      en: 'East Steam Engine',
      fr: 'Moteur à vapeur Est'
    }
  },
  {
    id: 'main-engine-west-view',
    equipment_id: 'main-engine-west',
    // PLACEHOLDER - capture real position  
    position: [2.0, -3.5, 1.0],
    rotation: [60, 20, 0],
    fov: 50,
    label: {
      en: 'West Steam Engine',
      fr: 'Moteur à vapeur Ouest'
    }
  },
  {
    id: 'auxiliary-pump-view',
    equipment_id: 'auxiliary-pump',
    // PLACEHOLDER - capture real position
    position: [-3.0, -2.5, 0.8],
    rotation: [50, -30, 0],
    fov: 55,
    label: {
      en: 'Auxiliary Pump',
      fr: 'Pompe auxiliaire'
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
