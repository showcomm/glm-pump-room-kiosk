/**
 * Display Settings - Foundational Kiosk Configuration
 * 
 * Configure:
 * - Target kiosk display resolution (determines aspect ratio for all editors)
 * - Overview camera position (the "home" view visitors see)
 * 
 * CRITICAL: Follows the same pattern as CameraCapture.tsx
 * - Application renders immediately with module-level constants
 * - Window events used to control camera, not props
 * - No conditional rendering of PlayCanvas
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { Script } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'
import { useSplatData } from '../../hooks/useSplatData'
import { updateSplatConfig } from '../../lib/api/splat'
import { RESOLUTION_PRESETS } from '../../lib/database.types'
import { getOverviewViewpoint } from '../../data/viewpoints'

// ============================================
// CONFIGURATION - Module level constants
// ============================================
const SPLAT_URL = '/pump-room.ply'
const INITIAL = getOverviewViewpoint()

// ============================================
// Splat Component
// ============================================
function PumpRoomSplat({ src }: { src: string }) {
  const { asset, loading, error } = useSplat(src)
  if (error || loading || !asset) return null
  return (
    <Entity position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <GSplat asset={asset} />
    </Entity>
  )
}

// ============================================
// Camera Controller - listens to window events
// ============================================
function CameraController() {
  const app = useApp()
  const frameRef = useRef<number>()
  const hasInitializedFromConfig = useRef(false)
  
  useEffect(() => {
    if (!app) return
    
    // Handle command to set camera position (from config load or sidebar)
    const handleSetTransform = (e: CustomEvent) => {
      const cameraEntity = app.root.findByName('camera')
      if (!cameraEntity) return
      
      const { position, rotation } = e.detail
      
      // Disable CameraControls while setting position manually
      if (cameraEntity.script?.cameraControls) {
        cameraEntity.script.cameraControls.enabled = false
      }
      
      cameraEntity.setLocalPosition(position[0], position[1], position[2])
      cameraEntity.setLocalEulerAngles(rotation[0], rotation[1], rotation[2])
      
      // Re-enable after a moment
      setTimeout(() => {
        if (cameraEntity.script?.cameraControls) {
          cameraEntity.script.cameraControls.enabled = true
        }
      }, 100)
    }
    
    window.addEventListener('set-camera-transform', handleSetTransform as EventListener)
    
    // Broadcast camera position to UI continuously
    const broadcastPosition = () => {
      const cameraEntity = app.root.findByName('camera')
      if (cameraEntity) {
        const pos = cameraEntity.getPosition()
        const rot = cameraEntity.getEulerAngles()
        window.dispatchEvent(new CustomEvent('camera-update', {
          detail: {
            position: [pos.x, pos.y, pos.z],
            rotation: [rot.x, rot.y, rot.z]
          }
        }))
      }
      frameRef.current = requestAnimationFrame(broadcastPosition)
    }
    
    frameRef.current = requestAnimationFrame(broadcastPosition)
    
    return () => {
      window.removeEventListener('set-camera-transform', handleSetTransform as EventListener)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [app])
  
  return null
}

// ============================================
// Splat Viewer - renders immediately, no props
// ============================================
function SplatViewer() {
  return (
    <Application graphicsDeviceOptions={{ antialias: false }}>
      <Entity name="camera" position={INITIAL.position} rotation={INITIAL.rotation}>
        <Camera clearColor="#1a1a2e" fov={INITIAL.fov || 60} farClip={1000} nearClip={0.01} />
        <Script script={CameraControls} />
      </Entity>
      <PumpRoomSplat src={SPLAT_URL} />
      <CameraController />
    </Application>
  )
}

// ============================================
// Resolution Selector
// ============================================
interface ResolutionSelectorProps {
  width: number
  height: number
  onChange: (width: number, height: number) => void
}

function ResolutionSelector({ width, height, onChange }: ResolutionSelectorProps) {
  const [customMode, setCustomMode] = useState(false)
  
  const currentPreset = RESOLUTION_PRESETS.find(
    p => p.width === width && p.height === height
  )
  
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === 'custom') {
      setCustomMode(true)
    } else {
      setCustomMode(false)
      const preset = RESOLUTION_PRESETS.find(p => p.label === value)
      if (preset) {
        onChange(preset.width, preset.height)
      }
    }
  }
  
  const handleSwap = () => {
    onChange(height, width)
  }
  
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-neutral-500 mb-1">Preset</label>
        <select
          value={customMode ? 'custom' : (currentPreset?.label || 'custom')}
          onChange={handlePresetChange}
          className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        >
          {RESOLUTION_PRESETS.map(p => (
            <option key={p.label} value={p.label}>{p.label}</option>
          ))}
          <option value="custom">Custom...</option>
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="block text-xs text-neutral-500 mb-1">Width</label>
          <input
            type="number"
            value={width}
            onChange={(e) => onChange(Number(e.target.value), height)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        
        <button
          onClick={handleSwap}
          className="mt-5 px-2 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-neutral-400 hover:text-white"
          title="Swap width/height"
        >
          ⇄
        </button>
        
        <div className="flex-1">
          <label className="block text-xs text-neutral-500 mb-1">Height</label>
          <input
            type="number"
            value={height}
            onChange={(e) => onChange(width, Number(e.target.value))}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>
      
      <div className="text-xs text-neutral-600">
        Aspect ratio: {(width / height).toFixed(3)} ({width > height ? 'landscape' : 'portrait'})
      </div>
    </div>
  )
}

// ============================================
// Camera Position Display
// ============================================
interface CameraDisplayProps {
  position: [number, number, number]
  rotation: [number, number, number]
  fov: number
  onFovChange: (fov: number) => void
}

function CameraDisplay({ position, rotation, fov, onFovChange }: CameraDisplayProps) {
  const formatNum = (n: number) => n.toFixed(3)
  
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-neutral-500 mb-1">Position (X, Y, Z)</label>
        <div className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 font-mono text-sm text-amber-400">
          [{formatNum(position[0])}, {formatNum(position[1])}, {formatNum(position[2])}]
        </div>
      </div>
      
      <div>
        <label className="block text-xs text-neutral-500 mb-1">Rotation (Pitch, Yaw, Roll)</label>
        <div className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2 font-mono text-sm text-amber-400">
          [{formatNum(rotation[0])}, {formatNum(rotation[1])}, {formatNum(rotation[2])}]
        </div>
      </div>
      
      <div>
        <label className="block text-xs text-neutral-500 mb-1">Field of View</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="30"
            max="120"
            value={fov}
            onChange={(e) => onFovChange(Number(e.target.value))}
            className="flex-1 h-2 accent-amber-600"
          />
          <span className="text-sm text-amber-400 w-10 text-right">{fov}°</span>
        </div>
      </div>
      
      <p className="text-[10px] text-neutral-600">
        Orbit: left-drag • Zoom: scroll • Pan: middle-drag
      </p>
    </div>
  )
}

// ============================================
// Main Component
// ============================================
export default function DisplaySettings() {
  const { config, loading, error } = useSplatData()
  
  // Local state for editing
  const [targetWidth, setTargetWidth] = useState(1920)
  const [targetHeight, setTargetHeight] = useState(1080)
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>(INITIAL.position)
  const [cameraRotation, setCameraRotation] = useState<[number, number, number]>(INITIAL.rotation)
  const [cameraFov, setCameraFov] = useState(INITIAL.fov || 60)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  
  // Track if we've initialized camera from config
  const hasInitializedCamera = useRef(false)
  
  // Load config values and set camera position via window event
  useEffect(() => {
    if (config && !hasInitializedCamera.current) {
      setTargetWidth(config.target_width || 1920)
      setTargetHeight(config.target_height || 1080)
      
      const pos = config.overview_position as [number, number, number]
      const rot = config.overview_rotation as [number, number, number]
      const fov = config.overview_fov || 60
      
      setCameraPosition(pos)
      setCameraRotation(rot)
      setCameraFov(fov)
      
      // Set camera position via window event (not props!)
      window.dispatchEvent(new CustomEvent('set-camera-transform', {
        detail: { position: pos, rotation: rot }
      }))
      
      hasInitializedCamera.current = true
    }
  }, [config])
  
  // Listen for camera updates from the viewer
  useEffect(() => {
    const handleCameraUpdate = (e: CustomEvent) => {
      const { position, rotation } = e.detail
      setCameraPosition([position[0], position[1], position[2]])
      setCameraRotation([rotation[0], rotation[1], rotation[2]])
      
      // Only mark dirty after initial load
      if (hasInitializedCamera.current) {
        setDirty(true)
        setSaved(false)
      }
    }
    
    window.addEventListener('camera-update', handleCameraUpdate as EventListener)
    return () => window.removeEventListener('camera-update', handleCameraUpdate as EventListener)
  }, [])
  
  const handleResolutionChange = (w: number, h: number) => {
    setTargetWidth(w)
    setTargetHeight(h)
    setDirty(true)
    setSaved(false)
  }
  
  const handleFovChange = (fov: number) => {
    setCameraFov(fov)
    setDirty(true)
    setSaved(false)
  }
  
  const handleSave = async () => {
    if (!config) return
    
    setSaving(true)
    const success = await updateSplatConfig(config.id, {
      target_width: targetWidth,
      target_height: targetHeight,
      overview_position: cameraPosition,
      overview_rotation: cameraRotation,
      overview_fov: cameraFov,
    })
    
    setSaving(false)
    if (success) {
      setSaved(true)
      setDirty(false)
    }
  }
  
  const handleReset = () => {
    if (config) {
      const pos = config.overview_position as [number, number, number]
      const rot = config.overview_rotation as [number, number, number]
      
      setTargetWidth(config.target_width || 1920)
      setTargetHeight(config.target_height || 1080)
      setCameraPosition(pos)
      setCameraRotation(rot)
      setCameraFov(config.overview_fov || 60)
      
      // Reset camera via window event
      window.dispatchEvent(new CustomEvent('set-camera-transform', {
        detail: { position: pos, rotation: rot }
      }))
      
      setDirty(false)
      setSaved(false)
    }
  }
  
  return (
    <div className="w-screen h-screen bg-black flex">
      {/* Viewer area - NO conditional rendering, NO AspectRatioContainer */}
      <div className="flex-1 relative bg-neutral-950">
        <SplatViewer />
        {/* Resolution indicator overlay */}
        <div className="absolute top-4 left-4 bg-black/70 text-amber-500 text-xs px-2 py-1 rounded z-10">
          Target: {targetWidth}×{targetHeight}
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="w-80 bg-neutral-900 text-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-700">
          <Link to="/admin" className="text-amber-600 hover:text-amber-500 text-xs">
            ← Admin
          </Link>
          <h1 className="text-lg font-medium text-neutral-200 mt-1">Display Settings</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Configure target resolution and overview camera for this kiosk.
          </p>
        </div>
        
        {loading && (
          <div className="p-4 bg-neutral-800 text-neutral-400 text-sm">Loading config...</div>
        )}
        {error && (
          <div className="p-4 bg-red-900/30 text-red-400 text-sm">{error}</div>
        )}
        
        {/* Resolution Section */}
        <div className="p-4 border-b border-neutral-700">
          <h2 className="text-sm font-medium text-neutral-300 mb-3">Target Display</h2>
          <ResolutionSelector
            width={targetWidth}
            height={targetHeight}
            onChange={handleResolutionChange}
          />
        </div>
        
        {/* Camera Section */}
        <div className="p-4 border-b border-neutral-700 flex-1">
          <h2 className="text-sm font-medium text-neutral-300 mb-3">Overview Camera</h2>
          <CameraDisplay
            position={cameraPosition}
            rotation={cameraRotation}
            fov={cameraFov}
            onFovChange={handleFovChange}
          />
          <p className="text-[10px] text-neutral-600 mt-3">
            Navigate to the default "home" view visitors will see when the kiosk starts or resets.
          </p>
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t border-neutral-800 space-y-2">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`w-full py-2 rounded text-sm font-medium transition-colors ${
              dirty 
                ? 'bg-amber-700 hover:bg-amber-600 text-white' 
                : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
          </button>
          
          {dirty && (
            <button
              onClick={handleReset}
              className="w-full py-2 rounded text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
            >
              Reset to Saved
            </button>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 text-[10px] text-neutral-700">
          <div>{config?.id ? `Config: ${config.id.slice(0,8)}` : 'No config loaded'}</div>
          <div className="mt-1">
            Changes here affect all admin editors (hotspots, camera capture) and the deployed kiosk.
          </div>
        </div>
      </div>
    </div>
  )
}
