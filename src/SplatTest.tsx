/**
 * Minimal PlayCanvas React Gaussian Splat Test
 * 
 * Usage:
 * 1. Place your .ply file in /public (e.g., /public/pump-room.ply)
 * 2. Update SPLAT_URL below to match your filename
 * 3. Run `npm run dev`
 */

import { useRef, useState, useCallback } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { OrbitControls } from '@playcanvas/react/scripts'
import { useSplat, useApp } from '@playcanvas/react/hooks'

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
// Camera Info Component - lives inside Application to access entities
// ============================================
function CameraInfo({ onCameraData }: { onCameraData: (data: { pos: number[], rot: number[] }) => void }) {
  const app = useApp()
  
  const captureCamera = useCallback(() => {
    if (!app) {
      console.log('No app')
      return
    }
    
    // Find camera entity by name
    const cameraEntity = app.root.findByName('camera')
    if (!cameraEntity) {
      console.log('Camera entity not found')
      return
    }
    
    const pos = cameraEntity.getPosition()
    const rot = cameraEntity.getEulerAngles()
    
    console.log('Camera position:', pos.x, pos.y, pos.z)
    console.log('Camera rotation:', rot.x, rot.y, rot.z)
    
    onCameraData({
      pos: [pos.x, pos.y, pos.z],
      rot: [rot.x, rot.y, rot.z]
    })
  }, [app, onCameraData])
  
  // Expose capture function via window for debugging
  if (typeof window !== 'undefined') {
    (window as any).captureCamera = captureCamera
  }
  
  return null
}

// ============================================
// Camera Info Panel UI (outside Application)
// ============================================
function CameraInfoPanel({ cameraData, onCapture }: { 
  cameraData: { pos: number[], rot: number[] }
  onCapture: () => void 
}) {
  return (
    <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg font-mono text-sm z-20">
      <div className="text-gray-400 mb-2">Camera</div>
      <button 
        onClick={onCapture}
        className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded mb-3 w-full"
      >
        Capture Position
      </button>
      <div>Pos: [{cameraData.pos.map(v => v.toFixed(2)).join(', ')}]</div>
      <div>Rot: [{cameraData.rot.map(v => v.toFixed(1)).join(', ')}]</div>
    </div>
  )
}

// ============================================
// Main Test Component
// ============================================
export default function SplatTest() {
  const [cameraData, setCameraData] = useState({ pos: [0, 2, 5], rot: [0, 0, 0] })
  const captureRef = useRef<(() => void) | null>(null)

  return (
    <div className="w-screen h-screen bg-black relative">
      {/* Camera debug panel */}
      <CameraInfoPanel 
        cameraData={cameraData} 
        onCapture={() => captureRef.current?.()}
      />

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
          name="camera" 
          position={[0, 2, 5]}
        >
          <Camera 
            clearColor="#1a1a2e"
            fov={60}
          />
          <OrbitControls />
        </Entity>

        {/* The splat model */}
        <PumpRoomSplat src={SPLAT_URL} />
        
        {/* Camera info helper - inside Application to access useApp */}
        <CameraInfo 
          onCameraData={(data) => {
            setCameraData(data)
            captureRef.current = () => {
              // This will be called from the panel
            }
          }}
        />
      </Application>
    </div>
  )
}
