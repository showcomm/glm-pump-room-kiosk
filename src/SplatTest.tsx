/**
 * Minimal PlayCanvas React Gaussian Splat Test
 * 
 * Usage:
 * 1. Place your .ply file in /public (e.g., /public/pump-room.ply)
 * 2. Update SPLAT_URL below to match your filename
 * 3. Run `npm run dev`
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
// Splat Component - kept simple, no callbacks
// ============================================
function PumpRoomSplat({ src }: { src: string }) {
  const { asset, loading, error } = useSplat(src)
  
  if (error) {
    console.error('Splat load error:', error)
    return null
  }

  if (loading) {
    console.log('Splat loading...')
    return null
  }
  
  if (!asset) {
    return null
  }

  console.log('Splat rendering with asset:', asset)
  
  return (
    <Entity position={[0, 0, 0]}>
      <GSplat asset={asset} />
    </Entity>
  )
}

// ============================================
// Camera Info Panel (for development)
// ============================================
function CameraInfoPanel({ cameraRef }: { cameraRef: React.RefObject<any> }) {
  const [info, setInfo] = useState({ pos: ['0', '0', '0'], rot: ['0', '0', '0'] })

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
// Main Test Component - NO state changes that could cause re-render
// ============================================
export default function SplatTest() {
  const cameraRef = useRef(null)

  return (
    <div className="w-screen h-screen bg-black relative">
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
