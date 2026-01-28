/**
 * Info Panel - Slides in from right when equipment is selected
 * 
 * Displays equipment name, description, function, and specifications
 * with bilingual support.
 */

import { useKioskStore } from '../../store/kioskStore'

interface InfoPanelProps {
  frameWidth: number
}

export function InfoPanel({ frameWidth }: InfoPanelProps) {
  const { 
    selectedEquipment, 
    language,
    navigateToOverview,
    isTransitioning
  } = useKioskStore()
  
  const isVisible = selectedEquipment && !isTransitioning
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pump': return 'bg-equipment-pump'
      case 'steam': return 'bg-equipment-steam'
      case 'discharge': return 'bg-equipment-discharge'
      case 'water': return 'bg-equipment-water'
      default: return 'bg-museum-accent'
    }
  }
  
  return (
    <div 
      className={`
        absolute z-30 transition-transform duration-500 ease-out
        ${isVisible ? 'translate-x-0' : 'translate-x-full'}
      `}
      style={{
        top: frameWidth + 20,
        right: frameWidth + 20,
        bottom: frameWidth + 80,
        width: 'min(400px, 35vw)',
      }}
    >
      {selectedEquipment && (
        <div className="h-full bg-museum-dark/95 backdrop-blur-sm rounded-lg border border-museum-accent/30 flex flex-col overflow-hidden">
          {/* Header with category color bar */}
          <div className={`${getCategoryColor(selectedEquipment.color_category)} h-1`} />
          
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Equipment name */}
            <h2 className="font-display text-kiosk-xl text-museum-stone mb-4">
              {selectedEquipment.name[language]}
            </h2>
            
            {/* Year installed */}
            {selectedEquipment.year_installed && (
              <div className="text-museum-highlight text-kiosk-sm mb-4">
                {language === 'en' ? 'Installed' : 'Installé'}: {selectedEquipment.year_installed}
              </div>
            )}
            
            {/* Description */}
            <div className="mb-6">
              <h3 className="text-museum-accent text-kiosk-base font-semibold mb-2">
                {language === 'en' ? 'Description' : 'Description'}
              </h3>
              <p className="text-museum-warm text-kiosk-base leading-relaxed">
                {selectedEquipment.description[language]}
              </p>
            </div>
            
            {/* Function */}
            <div className="mb-6">
              <h3 className="text-museum-accent text-kiosk-base font-semibold mb-2">
                {language === 'en' ? 'Function' : 'Fonction'}
              </h3>
              <p className="text-museum-warm text-kiosk-base leading-relaxed">
                {selectedEquipment.function[language]}
              </p>
            </div>
            
            {/* Specifications */}
            {selectedEquipment.specifications && (
              <div className="mb-6">
                <h3 className="text-museum-accent text-kiosk-base font-semibold mb-2">
                  {language === 'en' ? 'Specifications' : 'Spécifications'}
                </h3>
                <p className="text-museum-warm/80 text-kiosk-sm font-mono leading-relaxed">
                  {selectedEquipment.specifications[language]}
                </p>
              </div>
            )}
            
            {/* Manufacturer */}
            {selectedEquipment.manufacturer && (
              <div className="text-museum-warm/60 text-kiosk-sm">
                {language === 'en' ? 'Manufacturer' : 'Fabricant'}: {selectedEquipment.manufacturer}
              </div>
            )}
          </div>
          
          {/* Close button */}
          <div className="p-4 border-t border-museum-accent/20">
            <button
              onClick={navigateToOverview}
              className="w-full py-4 bg-museum-accent/20 hover:bg-museum-accent/30 
                         text-museum-stone text-kiosk-base rounded-lg 
                         transition-colors touch-manipulation"
            >
              {language === 'en' ? '← Back to Overview' : '← Retour à la vue d\'ensemble'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
