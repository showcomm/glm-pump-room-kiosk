/**
 * Minimal PlayCanvas React Gaussian Splat Test
 * 
 * Usage:
 * 1. Place your .ply file in /public (e.g., /public/pump-room.ply)
 * 2. Update SPLAT_URL below to match your filename
 * 3. Run `npm run dev`
 */

import { useState, useEffect } from 'react'
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
// Camera Capture Helper - exposes capture function to window
// ============================================
function CameraCaptureHelper() {
  const app = useApp()
  
  useEffect(() => {
    if (!app) return
    
    const captureCamera = () => {
      const cameraEntity = app.root.findByName('camera')
      if (!cameraEntity) {
        console.log('Camera entity not found')
        return null
      }
      
      const pos = cameraEntity.getPosition()
      const rot = cameraEntity.getEulerAngles()
      
      const data = {
        pos: [pos.x, pos.y, pos.z],
        rot: [rot.x, rot.y, rot.z]
      }
      
      console.log('Camera captured:', data)
      
      // Dispatch custom event with camera data
      window.dispatchEvent(new CustomEvent('camera-captured', { detail: data }))
      
      return data
    }
    
    // Expose to window for console debugging
    ;(window as any).captureCamera = captureCamera
    
    return () => {
      delete (window as any).captureCamera
    }
  }, [app])
  
  return null
}

// ============================================
// Camera Info Panel UI
// ============================================
function CameraInfoPanel() {
  const [cameraData, setCameraData] = useState({ pos: [0, 2, 5], rot: [0, 0, 0] })
  
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setCameraData(e.detail)
    }
    window.addEventListener('camera-captured', handler as EventListener)
    return () => window.removeEventListener('camera-captured', handler as EventListener)
  }, [])
  
  const handleCapture = () => {
    // Call the exposed window function
    if ((window as any).captureCamera) {
      (window as any).captureCamera()
    }
  }

  return (
    <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg font-mono text-sm z-20">
      <div className="text-gray-400 mb-2">Camera</div>
      <button 
        onClick={handleCapture}
        className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded mb-3 w-full"
      >
        Capture Position
      </button>
      <div>Pos: [{cameraData.pos.map(v => v.toFixed(2)).join(', ')}]</div>
      <div>Rot: [{cameraData.rot.map(v => v.toFixed(1)).join(', ')}]</div>
      <div className="text-gray-500 text-xs mt-2">Also: window.captureCamera()</div>
    </div>
  )
}

// ============================================
// Main Test Component
// ============================================
export default function SplatTest() {
  return (
    <div className="w-screen h-screen bg-black relative">
      {/* Camera debug panel - outside Application */}
      <CameraInfoPanel />

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
        
        {/* Helper to expose camera capture */}
        <CameraCaptureHelper />
      </Application>
    </div>
  )
}
