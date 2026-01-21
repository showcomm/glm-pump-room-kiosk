import { ReactNode } from 'react'
import { LanguageToggle } from '../shared/LanguageToggle'

interface KioskShellProps {
  children: ReactNode
}

export function KioskShell({ children }: KioskShellProps) {
  return (
    <div className="w-screen h-screen bg-museum-stone overflow-hidden">
      {/* Fixed aspect ratio container for 4:3 iPad display */}
      <div className="w-full h-full flex items-center justify-center bg-museum-dark">
        <div 
          className="relative bg-museum-stone overflow-hidden"
          style={{
            aspectRatio: '4 / 3',
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: '100%'
          }}
        >
          {/* Language toggle - always visible */}
          <div className="absolute top-4 right-4 z-50">
            <LanguageToggle />
          </div>
          
          {/* Main content area */}
          <div className="w-full h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
