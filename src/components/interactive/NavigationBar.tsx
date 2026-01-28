/**
 * Navigation Bar - Bottom bar with home button and language toggle
 */

import { useKioskStore } from '../../store/kioskStore'

interface NavigationBarProps {
  frameWidth: number
}

export function NavigationBar({ frameWidth }: NavigationBarProps) {
  const { 
    language, 
    toggleLanguage, 
    navigateToOverview,
    selectedEquipmentId,
    isTransitioning
  } = useKioskStore()
  
  return (
    <div 
      className="absolute z-30 flex items-center justify-between px-6"
      style={{
        left: frameWidth,
        right: frameWidth,
        bottom: frameWidth,
        height: 60,
        background: 'linear-gradient(to top, rgba(26, 26, 26, 0.95), rgba(26, 26, 26, 0.8))'
      }}
    >
      {/* Home button */}
      <button
        onClick={navigateToOverview}
        disabled={isTransitioning || !selectedEquipmentId}
        className={`
          flex items-center gap-3 px-5 py-3 rounded-lg transition-all touch-manipulation
          ${selectedEquipmentId && !isTransitioning
            ? 'bg-museum-accent/20 hover:bg-museum-accent/30 text-museum-stone'
            : 'bg-transparent text-museum-warm/30 cursor-default'
          }
        `}
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
          />
        </svg>
        <span className="text-kiosk-base font-body">
          {language === 'en' ? 'Overview' : 'Vue d\'ensemble'}
        </span>
      </button>
      
      {/* Center: Title/Breadcrumb */}
      <div className="text-museum-warm text-kiosk-base font-display">
        Kingston Dry Dock Pump Room
      </div>
      
      {/* Language toggle */}
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-2 px-5 py-3 rounded-lg 
                   bg-museum-accent/20 hover:bg-museum-accent/30 
                   text-museum-stone text-kiosk-base font-body
                   transition-colors touch-manipulation"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" 
          />
        </svg>
        <span className="font-semibold">
          {language === 'en' ? 'FR' : 'EN'}
        </span>
      </button>
    </div>
  )
}
