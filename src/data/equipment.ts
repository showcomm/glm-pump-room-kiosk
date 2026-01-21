/**
 * Equipment data for the Kingston Dry Dock pump room
 * Based on the 1896 Perley engineering report and Donald Page's documentation
 */

import { Equipment } from './types'

export const equipment: Equipment[] = [
  {
    id: 'main-pump-east',
    name: {
      en: 'Main Centrifugal Pump (East)',
      fr: 'Pompe centrifuge principale (Est)'
    },
    description: {
      en: 'One of two identical 18-inch vertical centrifugal pumps with 4-foot 8-inch diameter discs. This right-handed pump sits in a deep well level with the dry dock floor.',
      fr: 'Une des deux pompes centrifuges verticales identiques de 18 pouces avec des disques de 4 pieds 8 pouces de diametre. Cette pompe droite se trouve dans un puits profond au niveau du plancher du bassin de radoub.'
    },
    function: {
      en: 'Draws water from the pump well beneath the dry dock floor and discharges it to the harbour. Operating at 175 RPM, each pump moves 14,000 gallons per minute.',
      fr: 'Aspire l\'eau du puits de pompe sous le plancher du bassin et la rejette dans le port. A 175 tr/min, chaque pompe deplace 14 000 gallons par minute.'
    },
    specifications: {
      en: 'Pump disc diameter: 4\' 8" | Suction pipe: 22" | Discharge pipe: 22" | Capacity: 14,000 gal/min | Manufacturer: John Inglis Co., Toronto',
      fr: 'Diametre du disque: 4\' 8" | Tuyau d\'aspiration: 22" | Tuyau de refoulement: 22" | Capacite: 14 000 gal/min | Fabricant: John Inglis Co., Toronto'
    },
    year_installed: 1892,
    manufacturer: 'John Inglis Co., Toronto',
    color_category: 'pump',
    hotspot: {
      id: 'hs-main-pump-east',
      shape: 'polygon',
      coordinates: {
        type: 'polygon',
        points: [
          { x: 45, y: 55 },
          { x: 55, y: 55 },
          { x: 55, y: 75 },
          { x: 45, y: 75 }
        ]
      },
      pulse_animation: true
    }
  },
  {
    id: 'main-pump-west',
    name: {
      en: 'Main Centrifugal Pump (West)',
      fr: 'Pompe centrifuge principale (Ouest)'
    },
    description: {
      en: 'The left-handed counterpart to the east pump. Together, these twin pumps could empty the dock\'s 2,100,000 gallons in just 75 minutes.',
      fr: 'L\'equivalent gauche de la pompe est. Ensemble, ces pompes jumelles pouvaient vider les 2 100 000 gallons du bassin en seulement 75 minutes.'
    },
    function: {
      en: 'Works in tandem with the east pump. Through an ingenious clutch system, either engine could drive both pumps, or one engine could drive the opposite pump.',
      fr: 'Fonctionne en tandem avec la pompe est. Grace a un ingenieux systeme d\'embrayage, chaque moteur pouvait entrainer les deux pompes.'
    },
    year_installed: 1892,
    manufacturer: 'John Inglis Co., Toronto',
    color_category: 'pump',
    hotspot: {
      id: 'hs-main-pump-west',
      shape: 'polygon',
      coordinates: {
        type: 'polygon',
        points: [
          { x: 55, y: 55 },
          { x: 65, y: 55 },
          { x: 65, y: 75 },
          { x: 55, y: 75 }
        ]
      },
      pulse_animation: true
    }
  },
  {
    id: 'main-engine-east',
    name: {
      en: 'Main Steam Engine (East)',
      fr: 'Moteur a vapeur principal (Est)'
    },
    description: {
      en: 'A vertical, high-pressure steam engine with 18-inch diameter cylinder and 18-inch stroke, directly coupled to its centrifugal pump.',
      fr: 'Un moteur a vapeur vertical a haute pression avec un cylindre de 18 pouces de diametre et une course de 18 pouces, directement couple a sa pompe centrifuge.'
    },
    function: {
      en: 'Converts steam power from the boilers into rotational energy to drive the pump at 175 revolutions per minute.',
      fr: 'Convertit la vapeur des chaudieres en energie rotative pour entrainer la pompe a 175 tours par minute.'
    },
    specifications: {
      en: 'Cylinder diameter: 18" | Stroke: 18" | Operating speed: 175 RPM | Type: Vertical high-pressure',
      fr: 'Diametre du cylindre: 18" | Course: 18" | Vitesse de fonctionnement: 175 tr/min | Type: Vertical haute pression'
    },
    year_installed: 1892,
    manufacturer: 'John Inglis Co., Toronto',
    color_category: 'steam',
    hotspot: {
      id: 'hs-main-engine-east',
      shape: 'rectangle',
      coordinates: {
        type: 'rectangle',
        x: 40,
        y: 35,
        width: 12,
        height: 18
      },
      pulse_animation: true
    }
  },
  {
    id: 'main-engine-west',
    name: {
      en: 'Main Steam Engine (West)',
      fr: 'Moteur a vapeur principal (Ouest)'
    },
    description: {
      en: 'The twin steam engine powering the west pump. These engines are in line and can be geared together through clutches.',
      fr: 'Le moteur a vapeur jumeau alimentant la pompe ouest. Ces moteurs sont alignes et peuvent etre couples par des embrayages.'
    },
    function: {
      en: 'Provides redundancy and flexibility. If one engine requires maintenance, the other can drive both pumps via the clutch mechanism.',
      fr: 'Assure la redondance et la flexibilite. Si un moteur necessite un entretien, l\'autre peut entrainer les deux pompes via le mecanisme d\'embrayage.'
    },
    year_installed: 1892,
    manufacturer: 'John Inglis Co., Toronto',
    color_category: 'steam',
    hotspot: {
      id: 'hs-main-engine-west',
      shape: 'rectangle',
      coordinates: {
        type: 'rectangle',
        x: 58,
        y: 35,
        width: 12,
        height: 18
      },
      pulse_animation: true
    }
  },
  {
    id: 'auxiliary-pump',
    name: {
      en: 'Auxiliary Pump',
      fr: 'Pompe auxiliaire'
    },
    description: {
      en: 'An 8-inch horizontal centrifugal pump with a maximum lift of 31 feet 6 inches, positioned on the upper floor of the engine room.',
      fr: 'Une pompe centrifuge horizontale de 8 pouces avec une hauteur de refoulement maximale de 31 pieds 6 pouces, positionnee sur le plancher superieur de la salle des machines.'
    },
    function: {
      en: 'Handles arterial drains collecting leakage from beneath the dock floor. Also serves as backup if main pumps are disabled.',
      fr: 'Gere les drains arteriels collectant les fuites sous le plancher du bassin. Sert egalement de secours si les pompes principales sont desactivees.'
    },
    year_installed: 1892,
    manufacturer: 'John Inglis Co., Toronto',
    color_category: 'auxiliary',
    hotspot: {
      id: 'hs-auxiliary-pump',
      shape: 'circle',
      coordinates: {
        type: 'circle',
        center_x: 25,
        center_y: 45,
        radius: 5
      },
      pulse_animation: true
    }
  },
  {
    id: 'warm-water-tank',
    name: {
      en: 'Warm Water Storage Tank',
      fr: 'Reservoir d\'eau chaude'
    },
    description: {
      en: 'An insulated tank storing warmed effluent cooling water from the air compressors, added in later years for winter operations.',
      fr: 'Un reservoir isole stockant l\'eau de refroidissement chaude des compresseurs d\'air, ajoute plus tard pour les operations hivernales.'
    },
    function: {
      en: 'Stores warm water that was pumped through ice-laden ships during winter drydocking operations, helping to de-ice vessels.',
      fr: 'Stocke l\'eau chaude qui etait pompee a travers les navires couverts de glace pendant les operations de mise en cale seche en hiver.'
    },
    year_installed: 1940,
    color_category: 'water',
    hotspot: {
      id: 'hs-warm-water-tank',
      shape: 'rectangle',
      coordinates: {
        type: 'rectangle',
        x: 70,
        y: 20,
        width: 15,
        height: 10
      },
      pulse_animation: true
    }
  },
  {
    id: 'steam-piping',
    name: {
      en: 'Main Steam Supply Lines',
      fr: 'Conduites d\'alimentation en vapeur principales'
    },
    description: {
      en: 'Red-painted pipes carrying high-pressure steam from the boiler room to the main engines.',
      fr: 'Tuyaux peints en rouge transportant la vapeur haute pression de la chaufferie aux moteurs principaux.'
    },
    function: {
      en: 'Delivers steam at 100 PSI working pressure from the boilers to power the pumping engines.',
      fr: 'Livre la vapeur a une pression de travail de 100 PSI des chaudieres pour alimenter les moteurs de pompage.'
    },
    color_category: 'steam',
    hotspot: {
      id: 'hs-steam-piping',
      shape: 'polygon',
      coordinates: {
        type: 'polygon',
        points: [
          { x: 30, y: 30 },
          { x: 35, y: 30 },
          { x: 35, y: 50 },
          { x: 30, y: 50 }
        ]
      },
      pulse_animation: false
    }
  },
  {
    id: 'discharge-piping',
    name: {
      en: 'Discharge Pipes',
      fr: 'Tuyaux de refoulement'
    },
    description: {
      en: 'Yellow-painted 22-inch pipes carrying pumped water from the pumps to discharge into the harbour.',
      fr: 'Tuyaux jaunes de 22 pouces transportant l\'eau pompee des pompes vers le port.'
    },
    function: {
      en: 'Discharges water at 2 feet 6 inches below zero level. Each pipe has a 22-inch valve to prevent backflow when pumps are idle.',
      fr: 'Rejette l\'eau a 2 pieds 6 pouces sous le niveau zero. Chaque tuyau a une vanne de 22 pouces pour empecher le refoulement.'
    },
    color_category: 'discharge',
    hotspot: {
      id: 'hs-discharge-piping',
      shape: 'polygon',
      coordinates: {
        type: 'polygon',
        points: [
          { x: 48, y: 70 },
          { x: 62, y: 70 },
          { x: 62, y: 75 },
          { x: 48, y: 75 }
        ]
      },
      pulse_animation: false
    }
  }
]

export const getEquipmentById = (id: string): Equipment | undefined => {
  return equipment.find(e => e.id === id)
}

export const getEquipmentByCategory = (category: Equipment['color_category']): Equipment[] => {
  return equipment.filter(e => e.color_category === category)
}
