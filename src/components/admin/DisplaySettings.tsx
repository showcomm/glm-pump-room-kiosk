/**
 * Display Settings - Foundational Kiosk Configuration
 * 
 * ARCHITECTURE:
 * - Main component is STATELESS (PlayCanvas requirement)
 * - Splat renders at full container size
 * - Frame overlay shows the target aspect ratio viewport
 * - Communication via window events
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat, Script } from '@playcanvas/react/components'
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

// Default target (will be loaded from config)
const DEFAULT_TARGET_WIDTH = 1920
const DEFAULT_TARGET_HEIGHT = 1080

// Global state for camera sync (module level, not React state)
let pauseCameraSync = false
let currentPosition: [number, number, number] = [...INITIAL.position]
let currentRotation: [number, number, number] = [...INITIAL.rotation]

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
// Camera Controller - handles two-way sync
// ============================================
function CameraController() {
  const app = useApp()
  const frameRef = useRef<number>()
  
  useEffect(() => {
    if (!app) return
    
    // Handle commands from Sidebar to set camera position
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
      
      // Update module-level state
      currentPosition = [...position]
      currentRotation = [...rotation]
      
      // Re-enable orbit after a moment
      setTimeout(() => {
        if (cameraEntity?.script?.cameraControls) {
          cameraEntity.script.cameraControls.enabled = true
        }
      }, 100)
    }
    
    window.addEventListener('set-camera-transform', handleSetTransform as EventListener)
    
    // Broadcast camera position to Sidebar continuously
    const broadcastPosition = () => {
      if (!pauseCameraSync) {
        const cameraEntity = app.root.findByName('camera')
        if (cameraEntity) {
          const pos = cameraEntity.getPosition()
          const rot = cameraEntity.getEulerAngles()
          currentPosition = [pos.x, pos.y, pos.z]
          currentRotation = [rot.x, rot.y, rot.z]
          window.dispatchEvent(new CustomEvent('camera-position-update', {
            detail: { position: currentPosition, rotation: currentRotation }
          }))
        }
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
// Splat Viewer - STATELESS, renders immediately
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
// Aspect Ratio Frame Overlay
// ============================================
interface FrameOverlayProps {
  targetWidth: number
  targetHeight: number
}

function FrameOverlay({ targetWidth, targetHeight }: FrameOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState({ left: 0, top: 0, width: 0, height: 0 })
  
  useEffect(() => {
    const updateBounds = () => {
      if (!containerRef.current) return
      
      const container = containerRef.current
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      
      const targetAspect = targetWidth / targetHeight
      const containerAspect = containerWidth / containerHeight
      
      let frameWidth: number
      let frameHeight: number
      
      if (containerAspect > targetAspect) {
        // Container is wider - fit to height
        frameHeight = containerHeight
        frameWidth = frameHeight * targetAspect
      } else {
        // Container is taller - fit to width
        frameWidth = containerWidth
        frameHeight = frameWidth / targetAspect
      }
      
      const left = (containerWidth - frameWidth) / 2
      const top = (containerHeight - frameHeight) / 2
      
      setBounds({ left, top, width: frameWidth, height: frameHeight })
    }
    
    updateBounds()
    
    const observer = new ResizeObserver(updateBounds)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    
    return () => observer.disconnect()
  }, [targetWidth, targetHeight])
  
  const frameColor = 'rgba(139, 115, 71, 0.6)'
  
  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {bounds.width > 0 && (
        <>
          {/* Darkened areas outside the frame */}
          {bounds.top > 0 && (
            <>
              <div className="absolute left-0 right-0 top-0 bg-black/50" style={{ height: bounds.top }} />
              <div className="absolute left-0 right-0 bottom-0 bg-black/50" style={{ height: bounds.top }} />
            </>
          )}
          {bounds.left > 0 && (
            <>
              <div className="absolute left-0 bg-black/50" style={{ top: bounds.top, width: bounds.left, height: bounds.height }} />
              <div className="absolute right-0 bg-black/50" style={{ top: bounds.top, width: bounds.left, height: bounds.height }} />
            </>
          )}
          
          {/* Frame border */}
          <div
            className="absolute border-2"
            style={{
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height,
              borderColor: frameColor,
            }}
          />
          
          {/* Corner markers */}
          {[
            { left: bounds.left - 4, top: bounds.top - 4 },
            { left: bounds.left + bounds.width - 4, top: bounds.top - 4 },
            { left: bounds.left - 4, top: bounds.top + bounds.height - 4 },
            { left: bounds.left + bounds.width - 4, top: bounds.top + bounds.height - 4 },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{ left: pos.left, top: pos.top, backgroundColor: frameColor }}
            />
          ))}
          
          {/* Aspect ratio label */}
          <div 
            className="absolute text-xs px-2 py-0.5 rounded"
            style={{ 
              left: bounds.left + 8, 
              top: bounds.top + 8,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: frameColor
            }}
          >
            {targetWidth}×{targetHeight}
          </div>
        </>
      )}
    </div>
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
// Sidebar - ALL STATE LIVES HERE
// ============================================
function Sidebar({ onResolutionChange }: { onResolutionChange: (w: number, h: number) => void }) {
  const { config, loading, error } = useSplatData()
  
  // Local state for editing
  const [targetWidth, setTargetWidth] = useState(DEFAULT_TARGET_WIDTH)
  const [targetHeight, setTargetHeight] = useState(DEFAULT_TARGET_HEIGHT)
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>(INITIAL.position)
  const [cameraRotation, setCameraRotation] = useState<[number, number, number]>(INITIAL.rotation)
  const [cameraFov, setCameraFov] = useState(INITIAL.fov || 60)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  
  // Track if we've initialized from config
  const hasInitializedFromConfig = useRef(false)
  
  // Load config values and set camera position via window event
  useEffect(() => {
    if (config && !hasInitializedFromConfig.current) {
      const w = config.target_width || DEFAULT_TARGET_WIDTH
      const h = config.target_height || DEFAULT_TARGET_HEIGHT
      setTargetWidth(w)
      setTargetHeight(h)
      onResolutionChange(w, h)
      
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
      
      hasInitializedFromConfig.current = true
    }
  }, [config, onResolutionChange])
  
  // Listen for camera updates from the viewer
  useEffect(() => {
    const handleCameraUpdate = (e: CustomEvent) => {
      const { position, rotation } = e.detail
      setCameraPosition([position[0], position[1], position[2]])
      setCameraRotation([rotation[0], rotation[1], rotation[2]])
      
      // Only mark dirty after initial load
      if (hasInitializedFromConfig.current) {
        setDirty(true)
        setSaved(false)
      }
    }
    
    window.addEventListener('camera-position-update', handleCameraUpdate as EventListener)
    return () => window.removeEventListener('camera-position-update', handleCameraUpdate as EventListener)
  }, [])
  
  const handleResolutionChange = (w: number, h: number) => {
    setTargetWidth(w)
    setTargetHeight(h)
    onResolutionChange(w, h)
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
      const w = config.target_width || DEFAULT_TARGET_WIDTH
      const h = config.target_height || DEFAULT_TARGET_HEIGHT
      
      setTargetWidth(w)
      setTargetHeight(h)
      onResolutionChange(w, h)
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
    <div className="w-80 bg-neutral-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-700">
        <Link to="/admin" className="text-amber-600 hover:text-amber-500 text-xs">
          ← Admin
        </Link>
        <h1 className="text-lg font-medium text-neutral-200 mt-1">Display Settings</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Configure target resolution and overview camera.
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
          Navigate to the default "home" view. Frame shows target viewport.
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
          Changes affect all editors and the deployed kiosk.
        </div>
      </div>
    </div>
  )
}

// ============================================
// Editor Panel - manages frame overlay state
// ============================================
function EditorPanel() {
  const [targetWidth, setTargetWidth] = useState(DEFAULT_TARGET_WIDTH)
  const [targetHeight, setTargetHeight] = useState(DEFAULT_TARGET_HEIGHT)
  
  const handleResolutionChange = useCallback((w: number, h: number) => {
    setTargetWidth(w)
    setTargetHeight(h)
  }, [])
  
  return (
    <>
      {/* Frame overlay */}
      <FrameOverlay targetWidth={targetWidth} targetHeight={targetHeight} />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 bottom-0 z-20">
        <Sidebar onResolutionChange={handleResolutionChange} />
      </div>
    </>
  )
}

// ============================================
// Main Component - STATELESS
// ============================================
export default function DisplaySettings() {
  return (
    <div className="w-screen h-screen bg-black relative">
      {/* Splat fills entire area */}
      <SplatViewer />
      {/* Editor panel overlays on top */}
      <EditorPanel />
    </div>
  )
}
