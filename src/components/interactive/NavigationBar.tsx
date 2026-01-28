/**
 * Navigation Bar - Bottom bar with home button, language toggle, and admin link
 * 
 * Accepts optional viewportBounds for constrained viewport positioning.
 */

import { Link } from 'react-router-dom'
import { useKioskStore } from '../../store/kioskStore'

interface ViewportBounds {
  left: number
  top: number
  width: number
  height: number
}

interface NavigationBarProps {
  frameWidth: number
  viewportBounds?: ViewportBounds
}

export function NavigationBar({ frameWidth, viewportBounds }: NavigationBarProps) {
  const { 
    language, 
    toggleLanguage, 
    navigateToOverview,
    selectedEquipmentId,
    isTransitioning
  } = useKioskStore()
  
  // Calculate position based on viewport bounds if provided
  const left = viewportBounds ? viewportBounds.left : 0
  const width = viewportBounds ? viewportBounds.width : undefined
  const bottom = viewportBounds 
    ? (window.innerHeight - viewportBounds.top - viewportBounds.height)
    : 0
  
  return (
    <div 
      className="absolute z-30 flex items-center justify-between px-6"
      style={{
        left: left + frameWidth,
        right: viewportBounds 
          ? (window.innerWidth - viewportBounds.left - viewportBounds.width) + frameWidth 
          : frameWidth,
        bottom: bottom + frameWidth,
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
      
      {/* Right side buttons */}
      <div className="flex items-center gap-3">
        {/* Admin button */}
        <Link
          to="/admin"
          className="flex items-center gap-2 px-4 py-3 rounded-lg 
                     bg-museum-brown/30 hover:bg-museum-brown/50 
                     text-museum-warm/70 hover:text-museum-warm text-sm font-body
                     transition-colors touch-manipulation"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
            />
          </svg>
          Admin
        </Link>
        
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
    </div>
  )
}
