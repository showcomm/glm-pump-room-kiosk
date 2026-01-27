/**
 * Minimal PlayCanvas React Gaussian Splat Test
 * 
 * Usage:
 * 1. Place your .ply file in /public (e.g., /public/pump-room.ply)
 * 2. Update SPLAT_URL below to match your filename
 * 3. Run `npm run dev`
 */

import { useState, useEffect, useRef } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat, Script } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'

// ============================================
// CONFIGURATION
// ============================================
const SPLAT_URL = '/pump-room.ply'

// Frame width in pixels (black border around viewport)
const FRAME_WIDTH = 24

// Initial camera position and rotation
const INITIAL_CAMERA = {
  position: [-0.005, -6.86, 0.296] as [number, number, number],
  rotation: [87.53, -0.96, 0] as [number, number, number]
}

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
    <Entity position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <GSplat asset={asset} />
    </Entity>
  )
}

// ============================================
// Camera Capture Helper - exposes capture function to window
// ============================================
function CameraCaptureHelper() {
  const app = useApp()
  const frameRef = useRef<number>()
  
  useEffect(() => {
    if (!app) return
    
    const getCameraData = () => {
      const cameraEntity = app.root.findByName('camera')
      if (!cameraEntity) return null
      
      const pos = cameraEntity.getPosition()
      const rot = cameraEntity.getEulerAngles()
      
      return {
        pos: [pos.x, pos.y, pos.z],
        rot: [rot.x, rot.y, rot.z]
      }
    }
    
    const captureCamera = () => {
      const data = getCameraData()
      if (data) {
        console.log('Camera captured:', data)
      }
      return data
    }
    
    const updateLoop = () => {
      const data = getCameraData()
      if (data) {
        window.dispatchEvent(new CustomEvent('camera-update', { detail: data }))
      }
      frameRef.current = requestAnimationFrame(updateLoop)
    }
    
    ;(window as any).captureCamera = captureCamera
    frameRef.current = requestAnimationFrame(updateLoop)
    
    return () => {
      delete (window as any).captureCamera
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
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
    window.addEventListener('camera-update', handler as EventListener)
    return () => window.removeEventListener('camera-update', handler as EventListener)
  }, [])
  
  const handleCapture = () => {
    if ((window as any).captureCamera) {
      const data = (window as any).captureCamera()
      if (data) {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        console.log('Copied to clipboard')
      }
    }
  }

  const formatNum = (v: number, decimals: number) => {
    const rounded = Number(v.toFixed(decimals))
    return Object.is(rounded, -0) ? '0' : rounded.toFixed(decimals)
  }

  return (
    <div 
      className="absolute bg-black/70 text-white p-4 rounded-lg font-mono text-sm z-30"
      style={{ top: FRAME_WIDTH + 16, left: FRAME_WIDTH + 16 }}
    >
      <div className="text-gray-400 mb-2">Camera (Live)</div>
      <button 
        onClick={handleCapture}
        className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded mb-3 w-full"
      >
        Copy to Clipboard
      </button>
      <div>Pos: [{cameraData.pos.map(v => formatNum(v, 2)).join(', ')}]</div>
      <div>Rot: [{cameraData.rot.map(v => formatNum(v, 1)).join(', ')}]</div>
      <div className="text-gray-500 text-xs mt-2">Console: captureCamera()</div>
    </div>
  )
}

// ============================================
// Frame Overlay - sits on top of canvas for depth effect
// Uses 4 separate edge pieces so center is transparent
// ============================================
function FrameOverlay() {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Top edge */}
      <div 
        className="absolute top-0 left-0 right-0"
        style={{
          height: FRAME_WIDTH,
          background: 'linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 60%, #0f0f0f 100%)',
          borderBottom: '1px solid #0a0a0a',
        }}
      />
      
      {/* Bottom edge */}
      <div 
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: FRAME_WIDTH,
          background: 'linear-gradient(to top, #1a1a1a 0%, #0f0f0f 60%, #0a0a0a 100%)',
          borderTop: '1px solid #252525',
        }}
      />
      
      {/* Left edge */}
      <div 
        className="absolute left-0"
        style={{
          top: FRAME_WIDTH,
          bottom: FRAME_WIDTH,
          width: FRAME_WIDTH,
          background: 'linear-gradient(to right, #252525 0%, #1a1a1a 60%, #0f0f0f 100%)',
          borderRight: '1px solid #0a0a0a',
        }}
      />
      
      {/* Right edge */}
      <div 
        className="absolute right-0"
        style={{
          top: FRAME_WIDTH,
          bottom: FRAME_WIDTH,
          width: FRAME_WIDTH,
          background: 'linear-gradient(to left, #1a1a1a 0%, #0f0f0f 60%, #0a0a0a 100%)',
          borderLeft: '1px solid #252525',
        }}
      />
      
      {/* Inner shadow overlay - transparent center with inset shadow */}
      <div 
        className="absolute"
        style={{
          top: FRAME_WIDTH,
          left: FRAME_WIDTH,
          right: FRAME_WIDTH,
          bottom: FRAME_WIDTH,
          boxShadow: `
            inset 0 6px 20px rgba(0, 0, 0, 0.7),
            inset 0 -2px 10px rgba(0, 0, 0, 0.3),
            inset 6px 0 20px rgba(0, 0, 0, 0.5),
            inset -6px 0 20px rgba(0, 0, 0, 0.5)
          `,
          borderRadius: '2px',
        }}
      />
    </div>
  )
}

// ============================================
// Main Test Component
// ============================================
export default function SplatTest() {
  return (
    <div className="w-screen h-screen bg-black relative">
      {/* PlayCanvas Application - inset from edges */}
      <div className="absolute" style={{ 
        top: FRAME_WIDTH, 
        left: FRAME_WIDTH, 
        right: FRAME_WIDTH, 
        bottom: FRAME_WIDTH 
      }}>
        <Application
          graphicsDeviceOptions={{ antialias: false }}
        >
          <Entity 
            name="camera" 
            position={INITIAL_CAMERA.position}
            rotation={INITIAL_CAMERA.rotation}
          >
            <Camera 
              clearColor="#1a1a2e"
              fov={60}
              farClip={1000}
              nearClip={0.01}
            />
            <Script script={CameraControls} />
          </Entity>

          <PumpRoomSplat src={SPLAT_URL} />
          <CameraCaptureHelper />
        </Application>
      </div>

      {/* Frame overlay - sits on top of canvas */}
      <FrameOverlay />

      {/* Camera debug panel */}
      <CameraInfoPanel />

      {/* Instructions */}
      <div 
        className="absolute bg-black/70 text-white p-4 rounded-lg text-sm z-30"
        style={{ bottom: FRAME_WIDTH + 16, right: FRAME_WIDTH + 16 }}
      >
        <div className="text-gray-400 mb-1">Controls:</div>
        <div>Left drag: Orbit</div>
        <div>Middle drag: Pan</div>
        <div>Scroll: Zoom</div>
      </div>
    </div>
  )
}
