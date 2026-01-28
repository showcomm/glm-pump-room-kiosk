/**
 * Idle Overlay - Attract screen shown after timeout
 * 
 * Displays a welcoming message to draw visitors to the kiosk.
 * Tapping anywhere dismisses it and returns to the overview.
 */

import { useKioskStore } from '../../store/kioskStore'

export function IdleOverlay() {
  const { language, recordInteraction } = useKioskStore()
  
  const handleTap = () => {
    recordInteraction()
  }
  
  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center cursor-pointer"
      onClick={handleTap}
      onTouchStart={handleTap}
      style={{
        background: 'radial-gradient(ellipse at center, rgba(26, 26, 26, 0.85) 0%, rgba(10, 10, 10, 0.95) 100%)'
      }}
    >
      <div className="text-center px-12 max-w-2xl">
        {/* Animated touch icon */}
        <div className="mb-8 animate-pulse">
          <svg 
            className="w-24 h-24 mx-auto text-museum-highlight" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" 
            />
          </svg>
        </div>
        
        {/* Title */}
        <h1 className="font-display text-kiosk-2xl text-museum-stone mb-6">
          {language === 'en' 
            ? 'Explore the Pump Room' 
            : 'Explorez la salle des pompes'
          }
        </h1>
        
        {/* Subtitle */}
        <p className="text-museum-warm text-kiosk-lg mb-8">
          {language === 'en'
            ? 'Touch anywhere to begin your journey through Victorian engineering'
            : 'Touchez n\'importe où pour commencer votre voyage à travers l\'ingénierie victorienne'
          }
        </p>
        
        {/* Hint */}
        <div className="text-museum-accent text-kiosk-base animate-bounce">
          {language === 'en' ? 'Tap to start' : 'Appuyez pour commencer'}
        </div>
      </div>
    </div>
  )
}
