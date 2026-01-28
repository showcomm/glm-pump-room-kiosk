/**
 * Admin Toggle - Hidden button to enter admin/capture mode
 * 
 * Triple-tap in the top-left corner to reveal admin controls.
 * This allows switching between visitor mode and camera capture mode.
 */

import { useState, useRef } from 'react'
import { useKioskStore } from '../../store/kioskStore'

interface AdminToggleProps {
  frameWidth: number
}

export function AdminToggle({ frameWidth }: AdminToggleProps) {
  const { isAdminMode, setAdminMode } = useKioskStore()
  const [tapCount, setTapCount] = useState(0)
  const tapTimeoutRef = useRef<NodeJS.Timeout>()
  
  const handleTap = () => {
    // Clear previous timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current)
    }
    
    const newCount = tapCount + 1
    setTapCount(newCount)
    
    // Triple tap detected
    if (newCount >= 3) {
      setAdminMode(!isAdminMode)
      setTapCount(0)
      return
    }
    
    // Reset after 500ms if not triple tap
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0)
    }, 500)
  }
  
  return (
    <>
      {/* Hidden tap zone in top-left corner */}
      <div
        className="absolute z-40 cursor-default"
        onClick={handleTap}
        style={{
          top: frameWidth,
          left: frameWidth,
          width: 60,
          height: 60,
        }}
      />
      
      {/* Admin mode indicator */}
      {isAdminMode && (
        <div 
          className="absolute z-40 bg-red-600 text-white px-3 py-1 text-sm font-bold rounded-br"
          style={{
            top: frameWidth,
            left: frameWidth,
          }}
        >
          ADMIN MODE
        </div>
      )}
    </>
  )
}
