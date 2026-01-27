/**
 * Minimal PlayCanvas React Gaussian Splat Test
 * Stripped down to debug rendering issue
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat, Script } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'
import type { Entity as PCEntity } from 'playcanvas'

const SPLAT_URL = '/pump-room.ply'

// ============================================
// Minimal Splat Component - hardcoded position
// ============================================
function PumpRoomSplat() {
  const { asset, loading, error } = useSplat(SPLAT_URL)
  
  useEffect(() => {
    if (loading) console.log('🔄 Splat loading...')
    if (error) console.error('❌ Splat error:', error)
    if (asset) console.log('✅ Splat loaded:', asset)
  }, [loading, error, asset])
  
  if (error || loading || !asset) {
    return null
  }

  // Hardcoded position like the original
  return (
    <Entity position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <GSplat asset={asset} />
    </Entity>
  )
}

// ============================================
// Camera Data Helper
// ============================================
interface CameraData {
  position: [number, number, number]
  rotation: [number, number, number]
}

function CameraHelper({ onUpdate }: { onUpdate: (data: CameraData) => void }) {
  const app = useApp()
  const frameRef = useRef<number>()
  
  useEffect(() => {
    if (!app) return
    console.log('✅ App ready')
    
    const update = () => {
      const cam = app.root.findByName('camera') as PCEntity | null
      if (cam) {
        const p = cam.getPosition()
        const r = cam.getEulerAngles()
        onUpdate({
          position: [p.x, p.y, p.z],
          rotation: [r.x, r.y, r.z]
        })
      }
      frameRef.current = requestAnimationFrame(update)
    }
    frameRef.current = requestAnimationFrame(update)
    
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [app, onUpdate])
  
  return null
}

// ============================================
// Main Component
// ============================================
export default function SplatTest() {
  const [cam, setCam] = useState<CameraData>({ position: [0, 2, 5], rotation: [0, 0, 0] })
  
  const handleUpdate = useCallback((data: CameraData) => setCam(data), [])

  return (
    <div className="w-screen h-screen relative">
      {/* Debug Panel */}
      <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg font-mono text-xs z-50">
        <div className="text-gray-400 mb-2">Camera (Live)</div>
        <div>Pos: [{cam.position.map(v => v.toFixed(2)).join(', ')}]</div>
        <div>Rot: [{cam.rotation.map(v => v.toFixed(1)).join(', ')}]</div>
      </div>

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50">
        <div>Left drag: Orbit</div>
        <div>Scroll: Zoom</div>
      </div>

      {/* PlayCanvas - exactly like the original that worked */}
      <Application graphicsDeviceOptions={{ antialias: false }}>
        <Entity name="camera" position={[0, 2, 5]}>
          <Camera 
            clearColor="#1a1a2e"
            fov={60}
            farClip={1000}
            nearClip={0.01}
          />
          <Script script={CameraControls} />
        </Entity>

        <PumpRoomSplat />
        <CameraHelper onUpdate={handleUpdate} />
      </Application>
    </div>
  )
}
