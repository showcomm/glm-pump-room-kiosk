/**
 * PlayCanvas React Gaussian Splat Viewer for Pump Room Kiosk
 * 
 * Features:
 * - Camera position/rotation capture from CameraControls
 * - Object position controls
 * - Live camera info display
 * 
 * Usage:
 * 1. Place your .ply file in /public (e.g., /public/pump-room.ply)
 * 2. Update SPLAT_URL below to match your filename
 * 3. Run `npm run dev`
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat, Script } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'
import type { Entity as PCEntity } from 'playcanvas'

// ============================================
// CONFIGURATION
// ============================================
const SPLAT_URL = '/pump-room.ply'

// Default camera settings
const DEFAULT_CAMERA = {
  position: [0, 2, 5] as [number, number, number],
  fov: 60,
  nearClip: 0.01,
  farClip: 1000
}

// Default object (splat) settings
const DEFAULT_OBJECT = {
  position: [0, 0, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number]
}

// ============================================
// Types
// ============================================
interface CameraData {
  position: [number, number, number]
  rotation: [number, number, number]
  focusPoint: [number, number, number]
  fov: number
}

interface ObjectSettings {
  position: [number, number, number]
  rotation: [number, number, number]
}

// ============================================
// Camera Capture Helper - reads actual camera data from CameraControls
// ============================================
interface CameraCaptureHelperProps {
  onCameraUpdate: (data: CameraData) => void
}

function CameraCaptureHelper({ onCameraUpdate }: CameraCaptureHelperProps) {
  const app = useApp()
  const animFrameRef = useRef<number>()
  
  useEffect(() => {
    if (!app) return
    
    console.log('✅ PlayCanvas app ready')
    
    const getCameraData = (): CameraData | null => {
      const cameraEntity = app.root.findByName('camera') as PCEntity | null
      if (!cameraEntity) return null
      
      // Get the actual world position of the camera entity
      const worldPos = cameraEntity.getPosition()
      const worldRot = cameraEntity.getEulerAngles()
      
      // Get FOV from camera component
      const cameraComponent = cameraEntity.camera
      const fov = cameraComponent?.fov ?? DEFAULT_CAMERA.fov
      
      // Try to get the script instance to read focusPoint
      const scripts = cameraEntity.script
      let focusPoint: [number, number, number] = [0, 0, 0]
      
      if (scripts) {
        const scriptInstances = (scripts as any)._scripts
        if (scriptInstances && scriptInstances.length > 0) {
          const controlScript = scriptInstances[0]
          if (controlScript && controlScript.focusPoint) {
            const fp = controlScript.focusPoint
            focusPoint = [fp.x, fp.y, fp.z]
          }
        }
      }
      
      return {
        position: [worldPos.x, worldPos.y, worldPos.z],
        rotation: [worldRot.x, worldRot.y, worldRot.z],
        focusPoint,
        fov
      }
    }
    
    // Capture function for button/console use
    const captureCamera = () => {
      const data = getCameraData()
      if (data) {
        console.log('📷 Camera captured:', {
          position: data.position.map(v => v.toFixed(3)),
          rotation: data.rotation.map(v => v.toFixed(1)),
          focusPoint: data.focusPoint.map(v => v.toFixed(3)),
          fov: data.fov.toFixed(1)
        })
        window.dispatchEvent(new CustomEvent('camera-captured', { detail: data }))
      }
      return data
    }
    
    // Expose to window for console access
    ;(window as any).captureCamera = captureCamera
    ;(window as any).getCameraData = getCameraData
    
    // Update loop for live display
    const updateLoop = () => {
      const data = getCameraData()
      if (data) {
        onCameraUpdate(data)
      }
      animFrameRef.current = requestAnimationFrame(updateLoop)
    }
    
    // Start the update loop
    animFrameRef.current = requestAnimationFrame(updateLoop)
    
    return () => {
      delete (window as any).captureCamera
      delete (window as any).getCameraData
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [app, onCameraUpdate])
  
  return null
}

// ============================================
// Splat Component with position/rotation props
// ============================================
interface PumpRoomSplatProps {
  src: string
  position: [number, number, number]
  rotation: [number, number, number]
}

function PumpRoomSplat({ src, position, rotation }: PumpRoomSplatProps) {
  const { asset, loading, error } = useSplat(src)
  
  useEffect(() => {
    if (loading) console.log('🔄 Splat loading...')
    if (error) console.error('❌ Splat error:', error)
    if (asset) console.log('✅ Splat loaded:', asset)
  }, [loading, error, asset])
  
  if (error) {
    return null
  }

  if (loading || !asset) {
    return null
  }

  return (
    <Entity position={position} rotation={rotation}>
      <GSplat asset={asset} />
    </Entity>
  )
}

// ============================================
// UI Components
// ============================================

// Camera Info Panel with live data
interface CameraInfoPanelProps {
  cameraData: CameraData
}

function CameraInfoPanel({ cameraData }: CameraInfoPanelProps) {
  const [capturedData, setCapturedData] = useState<CameraData | null>(null)
  
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setCapturedData(e.detail)
    }
    window.addEventListener('camera-captured', handler as EventListener)
    return () => window.removeEventListener('camera-captured', handler as EventListener)
  }, [])
  
  const handleCapture = () => {
    if ((window as any).captureCamera) {
      (window as any).captureCamera()
    }
  }
  
  const handleCopy = () => {
    const data = capturedData || cameraData
    const json = JSON.stringify({
      position: data.position.map(v => Number(v.toFixed(3))),
      rotation: data.rotation.map(v => Number(v.toFixed(1))),
      focusPoint: data.focusPoint.map(v => Number(v.toFixed(3))),
      fov: Number(data.fov.toFixed(1))
    }, null, 2)
    navigator.clipboard.writeText(json)
    console.log('📋 Copied to clipboard:', json)
  }

  return (
    <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg font-mono text-xs z-20 min-w-[240px]">
      <div className="text-gray-400 mb-2 text-sm font-bold">Camera (Live)</div>
      
      <div className="space-y-1 mb-3">
        <div>
          <span className="text-gray-500">Position:</span>
          <span className="ml-2">[{cameraData.position.map(v => v.toFixed(2)).join(', ')}]</span>
        </div>
        <div>
          <span className="text-gray-500">Rotation:</span>
          <span className="ml-2">[{cameraData.rotation.map(v => v.toFixed(1)).join(', ')}]</span>
        </div>
        <div>
          <span className="text-gray-500">Focus:</span>
          <span className="ml-2">[{cameraData.focusPoint.map(v => v.toFixed(2)).join(', ')}]</span>
        </div>
        <div>
          <span className="text-gray-500">FOV:</span>
          <span className="ml-2">{cameraData.fov.toFixed(1)}°</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={handleCapture}
          className="flex-1 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-xs"
        >
          Capture
        </button>
        <button 
          onClick={handleCopy}
          className="flex-1 bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded text-xs"
        >
          Copy JSON
        </button>
      </div>
      
      {capturedData && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-green-400 text-xs mb-1">✓ Last Captured</div>
          <div className="text-gray-400 text-[10px]">
            [{capturedData.position.map(v => v.toFixed(2)).join(', ')}]
          </div>
        </div>
      )}
      
      <div className="text-gray-500 text-[10px] mt-3">
        Console: captureCamera()
      </div>
    </div>
  )
}

// Object Position Controls
interface ObjectControlsProps {
  settings: ObjectSettings
  onChange: (settings: ObjectSettings) => void
}

function ObjectControls({ settings, onChange }: ObjectControlsProps) {
  const updatePosition = (axis: 0 | 1 | 2, value: number) => {
    const newPos = [...settings.position] as [number, number, number]
    newPos[axis] = value
    onChange({ ...settings, position: newPos })
  }
  
  const updateRotation = (axis: 0 | 1 | 2, value: number) => {
    const newRot = [...settings.rotation] as [number, number, number]
    newRot[axis] = value
    onChange({ ...settings, rotation: newRot })
  }
  
  const resetToDefault = () => {
    onChange(DEFAULT_OBJECT)
  }
  
  const axes = ['X', 'Y', 'Z'] as const
  
  return (
    <div className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg font-mono text-xs z-20 min-w-[200px]">
      <div className="text-gray-400 mb-2 text-sm font-bold">Object Position</div>
      
      <div className="space-y-2 mb-3">
        {axes.map((axis, i) => (
          <div key={`pos-${axis}`} className="flex items-center gap-2">
            <span className="text-gray-500 w-6">{axis}:</span>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={settings.position[i]}
              onChange={(e) => updatePosition(i as 0 | 1 | 2, parseFloat(e.target.value))}
              className="flex-1 h-1"
            />
            <input
              type="number"
              value={settings.position[i].toFixed(1)}
              onChange={(e) => updatePosition(i as 0 | 1 | 2, parseFloat(e.target.value) || 0)}
              className="w-16 bg-gray-800 px-2 py-0.5 rounded text-right"
              step="0.1"
            />
          </div>
        ))}
      </div>
      
      <div className="text-gray-400 mb-2 text-sm font-bold">Object Rotation</div>
      
      <div className="space-y-2 mb-3">
        {axes.map((axis, i) => (
          <div key={`rot-${axis}`} className="flex items-center gap-2">
            <span className="text-gray-500 w-6">{axis}:</span>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={settings.rotation[i]}
              onChange={(e) => updateRotation(i as 0 | 1 | 2, parseFloat(e.target.value))}
              className="flex-1 h-1"
            />
            <input
              type="number"
              value={settings.rotation[i].toFixed(0)}
              onChange={(e) => updateRotation(i as 0 | 1 | 2, parseFloat(e.target.value) || 0)}
              className="w-16 bg-gray-800 px-2 py-0.5 rounded text-right"
              step="1"
            />
          </div>
        ))}
      </div>
      
      <button 
        onClick={resetToDefault}
        className="w-full bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded text-xs"
      >
        Reset to Default
      </button>
    </div>
  )
}

// Controls Help Panel
function ControlsHelp() {
  return (
    <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs z-20">
      <div className="text-gray-400 mb-1 font-bold">Controls</div>
      <div className="space-y-0.5 text-gray-300">
        <div>Left drag: Orbit</div>
        <div>Right drag: Pan</div>
        <div>Middle drag: Pan</div>
        <div>Scroll: Zoom</div>
      </div>
    </div>
  )
}

// ============================================
// Main Test Component
// ============================================
export default function SplatTest() {
  const [cameraData, setCameraData] = useState<CameraData>({
    position: DEFAULT_CAMERA.position,
    rotation: [0, 0, 0],
    focusPoint: [0, 0, 0],
    fov: DEFAULT_CAMERA.fov
  })
  
  const [objectSettings, setObjectSettings] = useState<ObjectSettings>(DEFAULT_OBJECT)
  
  const handleCameraUpdate = useCallback((data: CameraData) => {
    setCameraData(data)
  }, [])

  return (
    <div className="relative w-screen h-screen">
      {/* UI Overlays */}
      <CameraInfoPanel cameraData={cameraData} />
      <ObjectControls settings={objectSettings} onChange={setObjectSettings} />
      <ControlsHelp />

      {/* PlayCanvas Application - uses fillWindow to fill viewport */}
      <Application
        fillWindow
        graphicsDeviceOptions={{ antialias: true }}
      >
        {/* Camera with CameraControls script */}
        <Entity 
          name="camera" 
          position={DEFAULT_CAMERA.position}
        >
          <Camera 
            clearColor="#1a1a2e"
            fov={DEFAULT_CAMERA.fov}
            farClip={DEFAULT_CAMERA.farClip}
            nearClip={DEFAULT_CAMERA.nearClip}
          />
          <Script 
            script={CameraControls}
            sceneSize={10}
            focusDamping={0.1}
            moveDamping={0.9}
            rotateDamping={0.9}
            zoomDamping={0.9}
            zoomMin={0.5}
            zoomMax={50}
            pitchRange={[-90, 90]}
          />
        </Entity>

        {/* The splat model */}
        <PumpRoomSplat 
          src={SPLAT_URL} 
          position={objectSettings.position}
          rotation={objectSettings.rotation}
        />
        
        {/* Helper to read camera data */}
        <CameraCaptureHelper onCameraUpdate={handleCameraUpdate} />
      </Application>
    </div>
  )
}
