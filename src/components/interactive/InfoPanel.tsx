/**
 * Info Panel - Slides in from right when equipment is selected
 * 
 * Displays equipment name, description, function, and specifications
 * with bilingual support.
 * 
 * Accepts optional viewportBounds for constrained viewport positioning.
 */

import { useKioskStore } from '../../store/kioskStore'

interface ViewportBounds {
  left: number
  top: number
  width: number
  height: number
}

interface InfoPanelProps {
  frameWidth: number
  viewportBounds?: ViewportBounds
}

export function InfoPanel({ frameWidth, viewportBounds }: InfoPanelProps) {
  const { 
    selectedHotspot, 
    language,
    navigateToOverview,
    isTransitioning
  } = useKioskStore()
  
  const isVisible = selectedHotspot && !isTransitioning
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pump': return 'bg-equipment-pump'
      case 'steam': return 'bg-equipment-steam'
      case 'discharge': return 'bg-equipment-discharge'
      case 'water': return 'bg-equipment-water'
      default: return 'bg-museum-accent'
    }
  }
  
  // Calculate position based on viewport bounds if provided
  const top = viewportBounds 
    ? viewportBounds.top + frameWidth + 20 
    : frameWidth + 20
  
  const right = viewportBounds 
    ? (window.innerWidth - viewportBounds.left - viewportBounds.width) + frameWidth + 20
    : frameWidth + 20
  
  const bottom = viewportBounds 
    ? (window.innerHeight - viewportBounds.top - viewportBounds.height) + frameWidth + 80
    : frameWidth + 80
  
  return (
    <div 
      className={`
        absolute z-30 transition-transform duration-500 ease-out
        ${isVisible ? 'translate-x-0' : 'translate-x-full'}
      `}
      style={{
        top,
        right,
        bottom,
        width: 'min(400px, 35vw)',
      }}
    >
      {selectedHotspot && (
        <div className="h-full bg-museum-dark/95 backdrop-blur-sm rounded-lg border border-museum-accent/30 flex flex-col overflow-hidden">
          {/* Header with category color bar */}
          <div className={`${getCategoryColor(selectedHotspot.category || 'default')} h-1`} />
          
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Equipment name */}
            <h2 className="font-display text-kiosk-xl text-museum-stone mb-4">
              {language === 'en' ? selectedHotspot.name_en : (selectedHotspot.name_fr || selectedHotspot.name_en)}
            </h2>
            
            {/* Year installed */}
            {selectedHotspot.year_installed && (
              <div className="text-museum-highlight text-kiosk-sm mb-4">
                {language === 'en' ? 'Installed' : 'Installé'}: {selectedHotspot.year_installed}
              </div>
            )}
            
            {/* Description */}
            {(selectedHotspot.description_en || selectedHotspot.description_fr) && (
              <div className="mb-6">
                <h3 className="text-museum-accent text-kiosk-base font-semibold mb-2">
                  {language === 'en' ? 'Description' : 'Description'}
                </h3>
                <p className="text-museum-warm text-kiosk-base leading-relaxed">
                  {language === 'en' ? selectedHotspot.description_en : (selectedHotspot.description_fr || selectedHotspot.description_en)}
                </p>
              </div>
            )}
            
            {/* Function */}
            {(selectedHotspot.function_en || selectedHotspot.function_fr) && (
              <div className="mb-6">
                <h3 className="text-museum-accent text-kiosk-base font-semibold mb-2">
                  {language === 'en' ? 'Function' : 'Fonction'}
                </h3>
                <p className="text-museum-warm text-kiosk-base leading-relaxed">
                  {language === 'en' ? selectedHotspot.function_en : (selectedHotspot.function_fr || selectedHotspot.function_en)}
                </p>
              </div>
            )}
            
            {/* Specifications */}
            {(selectedHotspot.specifications_en || selectedHotspot.specifications_fr) && (
              <div className="mb-6">
                <h3 className="text-museum-accent text-kiosk-base font-semibold mb-2">
                  {language === 'en' ? 'Specifications' : 'Spécifications'}
                </h3>
                <p className="text-museum-warm/80 text-kiosk-sm font-mono leading-relaxed">
                  {language === 'en' ? selectedHotspot.specifications_en : (selectedHotspot.specifications_fr || selectedHotspot.specifications_en)}
                </p>
              </div>
            )}
            
            {/* Manufacturer */}
            {selectedHotspot.manufacturer && (
              <div className="text-museum-warm/60 text-kiosk-sm">
                {language === 'en' ? 'Manufacturer' : 'Fabricant'}: {selectedHotspot.manufacturer}
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
