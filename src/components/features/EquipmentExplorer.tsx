import { useState } from 'react'
import { BackButton } from '../shared/BackButton'
import { useLanguage } from '../../i18n/LanguageContext'
import { equipment, getEquipmentById } from '../../data/equipment'
import { Equipment } from '../../data/types'
import { ui } from '../../i18n/strings'

interface EquipmentExplorerProps {
  onBack: () => void
}

export function EquipmentExplorer({ onBack }: EquipmentExplorerProps) {
  const { t } = useLanguage()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  const selectedEquipment = selectedId ? getEquipmentById(selectedId) : null

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center justify-between px-8 py-4">
        <BackButton onBack={onBack} />
        <h2 className="text-kiosk-xl font-display text-museum-dark">
          {t(ui.featureExplore)}
        </h2>
        <div className="w-32" /> {/* Spacer for centering */}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex mx-8 mb-8 gap-6">
        {/* Equipment image with hotspots */}
        <div className="flex-1 relative bg-museum-warm rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-museum-accent">
            [Interactive Pump Room View]
          </div>
          
          {/* Render hotspots */}
          {equipment.map((eq) => (
            <HotspotMarker
              key={eq.id}
              equipment={eq}
              isSelected={selectedId === eq.id}
              onClick={() => setSelectedId(eq.id)}
            />
          ))}
        </div>

        {/* Detail panel */}
        {selectedEquipment && (
          <EquipmentDetail 
            equipment={selectedEquipment} 
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}

interface HotspotMarkerProps {
  equipment: Equipment
  isSelected: boolean
  onClick: () => void
}

function HotspotMarker({ equipment, isSelected, onClick }: HotspotMarkerProps) {
  const { t } = useLanguage()
  const { hotspot, color_category } = equipment
  
  const colorClass = {
    pump: 'bg-equipment-pump',
    steam: 'bg-equipment-steam',
    discharge: 'bg-equipment-discharge',
    water: 'bg-equipment-water',
    auxiliary: 'bg-museum-accent'
  }[color_category]

  const coords = hotspot.coordinates
  const x = coords.type === 'circle' ? coords.center_x : 
            coords.type === 'rectangle' ? coords.x + coords.width/2 : 50
  const y = coords.type === 'circle' ? coords.center_y :
            coords.type === 'rectangle' ? coords.y + coords.height/2 : 50

  return (
    <button
      onClick={onClick}
      className={`absolute w-8 h-8 rounded-full border-4 border-white shadow-lg transition-transform touch-target
        ${colorClass} ${isSelected ? 'scale-125 ring-4 ring-museum-highlight' : ''}
        ${hotspot.pulse_animation && !isSelected ? 'hotspot-pulse' : ''}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)'
      }}
      title={t(equipment.name)}
    />
  )
}

interface EquipmentDetailProps {
  equipment: Equipment
  onClose: () => void
}

function EquipmentDetail({ equipment, onClose }: EquipmentDetailProps) {
  const { t } = useLanguage()

  return (
    <div className="w-96 bg-white rounded-lg shadow-xl p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-kiosk-lg font-display text-museum-dark">
          {t(equipment.name)}
        </h3>
        <button 
          onClick={onClose}
          className="text-museum-accent hover:text-museum-dark p-2 touch-target"
        >
          ✕
        </button>
      </div>
      
      <p className="text-kiosk-base text-museum-dark mb-4">
        {t(equipment.description)}
      </p>
      
      <div className="mb-4">
        <h4 className="text-kiosk-sm font-semibold text-museum-accent mb-1">
          {t(ui.function)}
        </h4>
        <p className="text-kiosk-sm text-museum-dark">
          {t(equipment.function)}
        </p>
      </div>
      
      {equipment.specifications && (
        <div className="mb-4">
          <h4 className="text-kiosk-sm font-semibold text-museum-accent mb-1">
            {t(ui.specifications)}
          </h4>
          <p className="text-kiosk-sm text-museum-dark font-mono">
            {t(equipment.specifications)}
          </p>
        </div>
      )}
      
      <div className="mt-auto pt-4 border-t border-museum-warm flex gap-4 text-kiosk-sm text-museum-accent">
        {equipment.year_installed && (
          <span>{t(ui.yearInstalled)}: {equipment.year_installed}</span>
        )}
        {equipment.manufacturer && (
          <span>{equipment.manufacturer}</span>
        )}
      </div>
    </div>
  )
}
