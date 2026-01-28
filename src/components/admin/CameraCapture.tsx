/**
 * Camera Capture Page - Transform Editor
 * 
 * Two-way control:
 * 1. Mouse orbit/zoom to roughly position camera
 * 2. Numeric inputs to fine-tune exact values
 * 
 * When using numeric inputs, orbit controls are temporarily disabled
 * so they don't fight with manual positioning.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat, Script } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'
import { useSplatData } from '../../hooks/useSplatData'
import { getOverviewViewpoint } from '../../data/viewpoints'

// ============================================
// CONFIGURATION
// ============================================
const SPLAT_URL = '/pump-room.ply'
const INITIAL = getOverviewViewpoint()

// Global state for camera sync control
let pauseCameraSync = false
let currentPosition: [number, number, number] = [...INITIAL.position]
let currentRotation: [number, number, number] = [...INITIAL.rotation]
let currentFov: number = INITIAL.fov || 60

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
// Camera Controller - two-way sync
// ============================================
function CameraController() {
  const app = useApp()
  const frameRef = useRef<number>()
  
  useEffect(() => {
    if (!app) return
    
    // Handle commands from UI to set camera position
    const handleSetTransform = (e: CustomEvent) => {
      const cameraEntity = app.root.findByName('camera')
      if (!cameraEntity) return
      
      const { position, rotation, fov } = e.detail
      
      // Disable CameraControls script while setting position manually
      if (cameraEntity.script?.cameraControls) {
        cameraEntity.script.cameraControls.enabled = false
      }
      
      cameraEntity.setPosition(position[0], position[1], position[2])
      cameraEntity.setEulerAngles(rotation[0], rotation[1], rotation[2])
      
      if (fov && cameraEntity.camera) {
        cameraEntity.camera.fov = fov
      }
    }
    
    // Handle re-enabling orbit controls
    const handleEnableOrbit = () => {
      const cameraEntity = app.root.findByName('camera')
      if (cameraEntity?.script?.cameraControls) {
        cameraEntity.script.cameraControls.enabled = true
      }
    }
    
    window.addEventListener('set-camera-transform', handleSetTransform as EventListener)
    window.addEventListener('enable-orbit-controls', handleEnableOrbit)
    
    // Broadcast camera position to UI continuously
    const broadcastPosition = () => {
      if (!pauseCameraSync) {
        const cameraEntity = app.root.findByName('camera')
        if (cameraEntity) {
          const pos = cameraEntity.getPosition()
          const rot = cameraEntity.getEulerAngles()
          const fov = cameraEntity.camera?.fov || 60
          currentPosition = [pos.x, pos.y, pos.z]
          currentRotation = [rot.x, rot.y, rot.z]
          currentFov = fov
          window.dispatchEvent(new CustomEvent('camera-position-update', {
            detail: { position: currentPosition, rotation: currentRotation, fov: currentFov }
          }))
        }
      }
      frameRef.current = requestAnimationFrame(broadcastPosition)
    }
    
    frameRef.current = requestAnimationFrame(broadcastPosition)
    
    return () => {
      window.removeEventListener('set-camera-transform', handleSetTransform as EventListener)
      window.removeEventListener('enable-orbit-controls', handleEnableOrbit)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [app])
  
  return null
}

// ============================================
// Draggable Number Input with visible handle
// ============================================
interface DragInputProps {
  value: number
  onChange: (value: number) => void
  step?: number
  decimals?: number
  width?: string
}

function DragInput({ value, onChange, step = 0.1, decimals = 2, width = 'w-[72px]' }: DragInputProps) {
  const [localValue, setLocalValue] = useState(value.toFixed(decimals))
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragStartX = useRef(0)
  const dragStartValue = useRef(0)
  
  // Sync from prop when not dragging and not focused
  useEffect(() => {
    if (!isDragging && !isFocused) {
      setLocalValue(value.toFixed(decimals))
    }
  }, [value, decimals, isDragging, isFocused])
  
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    pauseCameraSync = true
    setIsDragging(true)
    
    dragStartX.current = e.clientX
    dragStartValue.current = value
    
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current
      const delta = deltaX * step * 0.5
      const newValue = Number((dragStartValue.current + delta).toFixed(decimals))
      
      setLocalValue(newValue.toFixed(decimals))
      onChange(newValue)
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      setTimeout(() => { pauseCameraSync = false }, 150)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [value, step, decimals, onChange])
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }
  
  const handleFocus = () => {
    setIsFocused(true)
    pauseCameraSync = true
  }
  
  const handleBlur = () => {
    setIsFocused(false)
    const parsed = parseFloat(localValue)
    if (!isNaN(parsed)) {
      onChange(Number(parsed.toFixed(decimals)))
    }
    setLocalValue(value.toFixed(decimals))
    setTimeout(() => { pauseCameraSync = false }, 150)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') inputRef.current?.blur()
  }
  
  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        onMouseDown={handleDragStart}
        className={`absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center 
                    cursor-ew-resize rounded-l border-r border-neutral-600 z-10
                    transition-colors ${isHovering || isDragging ? 'bg-amber-700' : 'bg-neutral-700'}`}
        title="Drag left/right to adjust"
      >
        <span className={`text-[10px] ${isHovering || isDragging ? 'text-white' : 'text-neutral-500'}`}>⇔</span>
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${width} pl-5 pr-1 py-1 bg-neutral-800 border border-neutral-600 rounded 
                   text-xs text-white text-right font-mono
                   focus:border-amber-600 focus:outline-none`}
      />
    </div>
  )
}

// ============================================
// Transform Row
// ============================================
interface TransformRowProps {
  label: string
  values: [number, number, number]
  onChange: (axis: 0 | 1 | 2, value: number) => void
  step?: number
  decimals?: number
}

function TransformRow({ label, values, onChange, step = 0.1, decimals = 2 }: TransformRowProps) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-neutral-400 w-12">{label}</span>
      <span className="text-red-400 text-[10px]">X</span>
      <DragInput value={values[0]} onChange={(v) => onChange(0, v)} step={step} decimals={decimals} />
      <span className="text-green-400 text-[10px]">Y</span>
      <DragInput value={values[1]} onChange={(v) => onChange(1, v)} step={step} decimals={decimals} />
      <span className="text-blue-400 text-[10px]">Z</span>
      <DragInput value={values[2]} onChange={(v) => onChange(2, v)} step={step} decimals={decimals} />
    </div>
  )
}

// ============================================
// Sidebar
// ============================================
function Sidebar() {
  const { hotspots, loading, error, saveHotspotViewpoint } = useSplatData()
  
  const [position, setPosition] = useState<[number, number, number]>([...INITIAL.position])
  const [rotation, setRotation] = useState<[number, number, number]>([...INITIAL.rotation])
  const [fov, setFov] = useState<number>(INITIAL.fov || 60)
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Listen for camera position updates from the 3D viewer
  useEffect(() => {
    const handleCameraUpdate = (e: CustomEvent) => {
      const { position: pos, rotation: rot, fov: f } = e.detail
      setPosition([pos[0], pos[1], pos[2]])
      setRotation([rot[0], rot[1], rot[2]])
      if (f) setFov(f)
    }
    
    window.addEventListener('camera-position-update', handleCameraUpdate as EventListener)
    return () => window.removeEventListener('camera-position-update', handleCameraUpdate as EventListener)
  }, [])
  
  // Send transform command to camera
  const updateCamera = useCallback((pos: [number, number, number], rot: [number, number, number], f: number) => {
    setOrbitEnabled(false)
    window.dispatchEvent(new CustomEvent('set-camera-transform', {
      detail: { position: pos, rotation: rot, fov: f }
    }))
  }, [])
  
  const handlePositionChange = useCallback((axis: 0 | 1 | 2, value: number) => {
    const newPos: [number, number, number] = [...currentPosition]
    newPos[axis] = value
    currentPosition = newPos
    setPosition(newPos)
    updateCamera(newPos, currentRotation, currentFov)
  }, [updateCamera])
  
  const handleRotationChange = useCallback((axis: 0 | 1 | 2, value: number) => {
    const newRot: [number, number, number] = [...currentRotation]
    newRot[axis] = value
    currentRotation = newRot
    setRotation(newRot)
    updateCamera(currentPosition, newRot, currentFov)
  }, [updateCamera])
  
  const handleFovChange = useCallback((value: number) => {
    currentFov = value
    setFov(value)
    updateCamera(currentPosition, currentRotation, value)
  }, [updateCamera])
  
  const handleEnableOrbit = () => {
    setOrbitEnabled(true)
    window.dispatchEvent(new CustomEvent('enable-orbit-controls'))
  }
  
  const handleReset = () => {
    const newPos: [number, number, number] = [...INITIAL.position]
    const newRot: [number, number, number] = [...INITIAL.rotation]
    const newFov = INITIAL.fov || 60
    currentPosition = newPos
    currentRotation = newRot
    currentFov = newFov
    setPosition(newPos)
    setRotation(newRot)
    setFov(newFov)
    updateCamera(newPos, newRot, newFov)
  }
  
  const handleLoadViewpoint = (id: string) => {
    const hotspot = hotspots?.find(h => h.id === id)
    if (hotspot && hotspot.viewpoint_position && hotspot.viewpoint_rotation) {
      const pos: [number, number, number] = [
        Number(hotspot.viewpoint_position[0]),
        Number(hotspot.viewpoint_position[1]),
        Number(hotspot.viewpoint_position[2])
      ]
      const rot: [number, number, number] = [
        Number(hotspot.viewpoint_rotation[0]),
        Number(hotspot.viewpoint_rotation[1]),
        Number(hotspot.viewpoint_rotation[2])
      ]
      const f = Number(hotspot.viewpoint_fov || 60)
      
      currentPosition = pos
      currentRotation = rot
      currentFov = f
      setPosition(pos)
      setRotation(rot)
      setFov(f)
      updateCamera(pos, rot, f)
      setSelectedHotspotId(id)
    }
  }
  
  const handleSave = async () => {
    if (!selectedHotspotId) return
    
    setIsSaving(true)
    setSaveFeedback('Saving...')
    
    const success = await saveHotspotViewpoint(
      selectedHotspotId,
      position,
      rotation,
      fov
    )
    
    if (success) {
      setSaveFeedback('✓ Saved to database!')
      setTimeout(() => setSaveFeedback(null), 2000)
    } else {
      setSaveFeedback('✗ Save failed')
      setTimeout(() => setSaveFeedback(null), 2000)
    }
    
    setIsSaving(false)
  }
  
  // Get hotspots with viewpoints (has position set)
  const hotspotsWithViewpoints = hotspots?.filter(h => 
    h.viewpoint_position && h.viewpoint_position.length === 3
  ) || []
  
  // Get hotspots without viewpoints
  const hotspotsWithoutViewpoints = hotspots?.filter(h => 
    !h.viewpoint_position || h.viewpoint_position.length !== 3
  ) || []
  
  return (
    <div className="w-96 bg-neutral-900 text-white text-sm flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-neutral-700">
        <Link to="/admin" className="text-amber-600 hover:text-amber-500 text-xs">
          ← Back to Admin
        </Link>
        <h1 className="text-base font-medium text-neutral-200 mt-1">Camera Viewpoints</h1>
      </div>
      
      {loading && (
        <div className="p-3 bg-neutral-800 text-neutral-400 text-xs">
          Loading hotspots from database...
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-900/30 text-red-400 text-xs">
          Error: {error}
        </div>
      )}
      
      {/* Transform */}
      <div className="p-3 border-b border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-neutral-300 uppercase tracking-wide">Transform</span>
          <button onClick={handleReset} className="text-xs text-neutral-500 hover:text-neutral-300">
            Reset
          </button>
        </div>
        <div className="space-y-2">
          <TransformRow label="Position" values={position} onChange={handlePositionChange} step={0.05} decimals={2} />
          <TransformRow label="Rotation" values={rotation} onChange={handleRotationChange} step={0.5} decimals={1} />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-neutral-400 w-12">FOV</span>
            <DragInput value={fov} onChange={handleFovChange} step={1} decimals={0} width="w-[60px]" />
            <span className="text-neutral-500 text-[10px] ml-1">degrees</span>
          </div>
        </div>
        
        {/* Orbit mode toggle */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px] text-neutral-600">
            {orbitEnabled ? 'Orbit/zoom with mouse' : 'Orbit disabled (manual mode)'}
          </p>
          {!orbitEnabled && (
            <button 
              onClick={handleEnableOrbit}
              className="text-[10px] text-amber-600 hover:text-amber-500"
            >
              Re-enable orbit
            </button>
          )}
        </div>
      </div>
      
      {/* Hotspot Selection */}
      <div className="p-3 border-b border-neutral-700">
        <label className="text-xs text-neutral-400 block mb-1">Select Hotspot</label>
        <select
          value={selectedHotspotId || ''}
          onChange={(e) => setSelectedHotspotId(e.target.value || null)}
          className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-xs"
          disabled={loading}
        >
          <option value="">Select hotspot...</option>
          {hotspotsWithViewpoints.length > 0 && (
            <optgroup label="Has Viewpoint">
              {hotspotsWithViewpoints.map(h => (
                <option key={h.id} value={h.id}>
                  ✓ {h.name_en}
                </option>
              ))}
            </optgroup>
          )}
          {hotspotsWithoutViewpoints.length > 0 && (
            <optgroup label="No Viewpoint Yet">
              {hotspotsWithoutViewpoints.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name_en}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        
        <button
          onClick={handleSave}
          disabled={!selectedHotspotId || isSaving}
          className="w-full mt-2 bg-amber-800 hover:bg-amber-700 disabled:bg-neutral-700 
                     disabled:text-neutral-500 py-1.5 rounded text-xs font-medium transition-colors"
        >
          {saveFeedback || 'Save Viewpoint to Database'}
        </button>
        
        <p className="text-[10px] text-neutral-600 mt-2">
          Position the camera, select a hotspot, and click Save to store the viewpoint.
        </p>
      </div>
      
      {/* Saved Viewpoints List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-400">
            Hotspots with Viewpoints ({hotspotsWithViewpoints.length})
          </span>
        </div>
        
        <div className="space-y-1">
          {hotspotsWithViewpoints.map((h) => (
            <button
              key={h.id}
              onClick={() => handleLoadViewpoint(h.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors
                ${selectedHotspotId === h.id 
                  ? 'bg-amber-900/50 border border-amber-700' 
                  : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'}`}
            >
              <div className="text-neutral-200">{h.name_en}</div>
              <div className="text-neutral-500 font-mono text-[10px]">
                pos: [{h.viewpoint_position?.map((v: unknown) => Number(v).toFixed(1)).join(', ')}] • fov: {h.viewpoint_fov || 60}
              </div>
              <div className="text-neutral-500 font-mono text-[10px]">
                rot: [{h.viewpoint_rotation?.map((v: unknown) => Number(v).toFixed(1)).join(', ')}]
              </div>
            </button>
          ))}
        </div>
        
        {hotspotsWithViewpoints.length === 0 && !loading && (
          <p className="text-neutral-600 text-xs text-center py-4">
            No viewpoints saved yet. Select a hotspot above and save a viewpoint.
          </p>
        )}
        
        {hotspotsWithoutViewpoints.length > 0 && (
          <>
            <div className="mt-4 mb-2">
              <span className="text-xs text-neutral-600">
                Hotspots without Viewpoints ({hotspotsWithoutViewpoints.length})
              </span>
            </div>
            <div className="space-y-0.5">
              {hotspotsWithoutViewpoints.map((h) => (
                <div key={h.id} className="text-neutral-600 text-[10px] px-2 py-1">
                  {h.name_en}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-neutral-700 text-[10px] text-neutral-600">
        Viewpoints saved to <code className="text-neutral-500">splat_hotspots</code> table
      </div>
    </div>
  )
}

// ============================================
// Viewer with orbit/zoom controls
// ============================================
function SplatViewer() {
  return (
    <div className="flex-1">
      <Application graphicsDeviceOptions={{ antialias: false }}>
        <Entity name="camera" position={INITIAL.position} rotation={INITIAL.rotation}>
          <Camera clearColor="#1a1a2e" fov={INITIAL.fov || 60} farClip={1000} nearClip={0.01} />
          <Script script={CameraControls} />
        </Entity>
        <PumpRoomSplat src={SPLAT_URL} />
        <CameraController />
      </Application>
    </div>
  )
}

// ============================================
// Main
// ============================================
export default function CameraCapture() {
  return (
    <div className="w-screen h-screen bg-black flex">
      <SplatViewer />
      <Sidebar />
    </div>
  )
}
