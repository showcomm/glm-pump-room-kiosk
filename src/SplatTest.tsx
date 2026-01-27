/**
 * Minimal PlayCanvas React Gaussian Splat Test
 * 
 * This is a clean-room implementation to verify splat loading works
 * before integrating into the full kiosk application.
 * 
 * Usage:
 * 1. Place your .ply file in /public (e.g., /public/pump-room.ply)
 * 2. Update SPLAT_URL below to match your filename
 * 3. In main.tsx, change `import App from './App'` to `import App from './SplatTest'`
 * 4. Run `npm run dev`
 */

import { useRef, useState } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat, Script } from '@playcanvas/react/components'
import { useSplat } from '@playcanvas/react/hooks'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'

// ============================================
// CONFIGURATION - Update this path to your .ply file
// ============================================
const SPLAT_URL = '/pump-room.ply'

// ============================================
// Splat Component
// ============================================
function PumpRoomSplat({ src }: { src: string }) {
  const { asset, loading, error } = useSplat(src)

  if (error) {
    console.error('Splat load error:', error)
    return null
  }

  if (loading || !asset) {
    return null // Loading state handled by parent
  }

  return (
    <Entity position={[0, 0, 0]}>
      <GSplat asset={asset} />
    </Entity>
  )
}

// ============================================
// Loading Overlay
// ============================================
function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
      <div className="text-white text-center">
        <div className="text-2xl mb-2">Loading Splat...</div>
        <div className="text-sm text-gray-400">{SPLAT_URL}</div>
      </div>
    </div>
  )
}

// ============================================
// Camera Info Panel (for development)
// ============================================
function CameraInfoPanel({ cameraRef }: { cameraRef: React.RefObject<any> }) {
  const [info, setInfo] = useState({ pos: [0, 0, 0], rot: [0, 0, 0] })

  const updateInfo = () => {
    if (cameraRef.current) {
      const pos = cameraRef.current.getPosition()
      const rot = cameraRef.current.getEulerAngles()
      setInfo({
        pos: [pos.x.toFixed(2), pos.y.toFixed(2), pos.z.toFixed(2)],
        rot: [rot.x.toFixed(1), rot.y.toFixed(1), rot.z.toFixed(1)]
      })
    }
  }

  return (
    <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg font-mono text-sm z-20">
      <div className="text-gray-400 mb-2">Camera (click to refresh)</div>
      <button 
        onClick={updateInfo}
        className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded mb-3 w-full"
      >
        Get Position
      </button>
      <div>Pos: [{info.pos.join(', ')}]</div>
      <div>Rot: [{info.rot.join(', ')}]</div>
    </div>
  )
}

// ============================================
// Main Test Component
// ============================================
export default function SplatTest() {
  const cameraRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)

  // Simple loading detection - hide after a delay
  // In production, use useSplat's loading state
  useState(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000)
    return () => clearTimeout(timer)
  })

  return (
    <div className="w-screen h-screen bg-black relative">
      {/* Loading overlay */}
      <LoadingOverlay visible={isLoading} />
      
      {/* Camera debug panel */}
      <CameraInfoPanel cameraRef={cameraRef} />

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white p-4 rounded-lg text-sm z-20">
        <div className="text-gray-400 mb-1">Controls:</div>
        <div>Left drag: Orbit</div>
        <div>Right drag: Pan</div>
        <div>Scroll: Zoom</div>
      </div>

      {/* PlayCanvas Application */}
      <Application
        graphicsDeviceOptions={{ antialias: false }}
      >
        {/* Camera with orbit controls */}
        <Entity 
          ref={cameraRef}
          name="camera" 
          position={[0, 2, 5]}
        >
          <Camera 
            clearColor="#1a1a2e"
            fov={60}
          />
          <Script script={CameraControls} />
        </Entity>

        {/* The splat model */}
        <PumpRoomSplat src={SPLAT_URL} />
      </Application>
    </div>
  )
}
