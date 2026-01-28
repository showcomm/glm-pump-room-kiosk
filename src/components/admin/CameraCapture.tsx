/**
 * Camera Capture Page - Transform Editor
 * 
 * Two-way control:
 * 1. Mouse orbit/zoom to roughly position camera
 * 2. Numeric inputs to fine-tune exact values
 * 
 * Camera position syncs both ways - orbit updates inputs, inputs update camera.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat, Script } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'
import { equipment } from '../../data/equipment'
import { getOverviewViewpoint } from '../../data/viewpoints'

// ============================================
// CONFIGURATION
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
// Camera Controller - two-way sync
// Broadcasts position to UI, receives position commands from UI
// ============================================
function CameraController() {
  const app = useApp()
  const frameRef = useRef<number>()
  const isSettingFromUI = useRef(false)
  
  useEffect(() => {
    if (!app) return
    
    // Handle commands from UI to set camera position
    const handleSetTransform = (e: CustomEvent) => {
      const cameraEntity = app.root.findByName('camera')
      if (!cameraEntity) return
      
      isSettingFromUI.current = true
      const { position, rotation } = e.detail
      cameraEntity.setPosition(position[0], position[1], position[2])
      cameraEntity.setEulerAngles(rotation[0], rotation[1], rotation[2])
      
      // Reset flag after a short delay
      setTimeout(() => { isSettingFromUI.current = false }, 50)
    }
    
    window.addEventListener('set-camera-transform', handleSetTransform as EventListener)
    
    // Broadcast camera position to UI continuously
    const broadcastPosition = () => {
      // Don't broadcast while UI is setting position (prevents feedback loop)
      if (!isSettingFromUI.current) {
        const cameraEntity = app.root.findByName('camera')
        if (cameraEntity) {
          const pos = cameraEntity.getPosition()
          const rot = cameraEntity.getEulerAngles()
          window.dispatchEvent(new CustomEvent('camera-position-update', {
            detail: {
              position: [pos.x, pos.y, pos.z],
              rotation: [rot.x, rot.y, rot.z]
            }
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
// Draggable Number Input with visible handle
// ============================================
interface DragInputProps {
  value: number
  onChange: (value: number) => void
  step?: number
  decimals?: number
}

function DragInput({ value, onChange, step = 0.1, decimals = 2 }: DragInputProps) {
  const [localValue, setLocalValue] = useState(value.toFixed(decimals))
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragStartX = useRef(0)
  const dragStartValue = useRef(0)
  
  // Sync from prop when not dragging
  useEffect(() => {
    if (!isDragging && document.activeElement !== inputRef.current) {
      setLocalValue(value.toFixed(decimals))
    }
  }, [value, decimals, isDragging])
  
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartValue.current = value
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = (e.clientX - dragStartX.current) * step * 0.5
      const newValue = dragStartValue.current + delta
      onChange(Number(newValue.toFixed(decimals)))
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }
  
  const handleBlur = () => {
    const parsed = parseFloat(localValue)
    if (!isNaN(parsed)) {
      onChange(Number(parsed.toFixed(decimals)))
    }
    setLocalValue(value.toFixed(decimals))
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
      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        className={`absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center 
                    cursor-ew-resize rounded-l border-r border-neutral-600
                    transition-colors ${isHovering || isDragging ? 'bg-amber-800' : 'bg-neutral-700'}`}
        title="Drag to adjust"
      >
        <span className="text-[8px] text-neutral-400">⋮</span>
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-[70px] pl-4 pr-1 py-1 bg-neutral-800 border border-neutral-600 rounded 
                   text-xs text-white text-right font-mono
                   focus:border-amber-600 focus:outline-none"
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
  const [position, setPosition] = useState<[number, number, number]>([...INITIAL.position])
  const [rotation, setRotation] = useState<[number, number, number]>([...INITIAL.rotation])
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
  const [savedViewpoints, setSavedViewpoints] = useState<Record<string, any>>({})
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  
  // Listen for camera position updates from the 3D viewer
  useEffect(() => {
    const handleCameraUpdate = (e: CustomEvent) => {
      const { position: pos, rotation: rot } = e.detail
      setPosition([pos[0], pos[1], pos[2]])
      setRotation([rot[0], rot[1], rot[2]])
    }
    
    window.addEventListener('camera-position-update', handleCameraUpdate as EventListener)
    return () => window.removeEventListener('camera-position-update', handleCameraUpdate as EventListener)
  }, [])
  
  // Send transform command to camera
  const updateCamera = useCallback((pos: [number, number, number], rot: [number, number, number]) => {
    window.dispatchEvent(new CustomEvent('set-camera-transform', {
      detail: { position: pos, rotation: rot }
    }))
  }, [])
  
  const handlePositionChange = (axis: 0 | 1 | 2, value: number) => {
    const newPos: [number, number, number] = [...position]
    newPos[axis] = value
    setPosition(newPos)
    updateCamera(newPos, rotation)
  }
  
  const handleRotationChange = (axis: 0 | 1 | 2, value: number) => {
    const newRot: [number, number, number] = [...rotation]
    newRot[axis] = value
    setRotation(newRot)
    updateCamera(position, newRot)
  }
  
  const handleReset = () => {
    const newPos: [number, number, number] = [...INITIAL.position]
    const newRot: [number, number, number] = [...INITIAL.rotation]
    setPosition(newPos)
    setRotation(newRot)
    updateCamera(newPos, newRot)
  }
  
  const handleLoadViewpoint = (id: string) => {
    const vp = savedViewpoints[id]
    if (vp) {
      setPosition([...vp.position])
      setRotation([...vp.rotation])
      updateCamera(vp.position, vp.rotation)
      setSelectedEquipment(id)
    }
  }
  
  const generateCode = (equipmentId: string, pos: number[], rot: number[]) => {
    const item = equipment.find(e => e.id === equipmentId)
    return `{
  id: '${equipmentId}-view',
  equipment_id: '${equipmentId}',
  position: [${pos.map(v => v.toFixed(3)).join(', ')}],
  rotation: [${rot.map(v => v.toFixed(2)).join(', ')}],
  fov: 60,
  label: { en: '${item?.name.en || ''}', fr: '${item?.name.fr || ''}' }
},`
  }
  
  const handleSave = () => {
    if (!selectedEquipment) return
    
    const viewpoint = {
      equipment_id: selectedEquipment,
      position: [...position],
      rotation: [...rotation],
    }
    
    setSavedViewpoints(prev => ({ ...prev, [selectedEquipment]: viewpoint }))
    
    const code = generateCode(selectedEquipment, position, rotation)
    navigator.clipboard.writeText(code)
    setCopyFeedback('Copied!')
    setTimeout(() => setCopyFeedback(null), 1500)
  }
  
  const handleCopyAll = () => {
    const allCode = Object.values(savedViewpoints)
      .map(vp => generateCode(vp.equipment_id, vp.position, vp.rotation))
      .join('\n')
    navigator.clipboard.writeText(allCode)
    setCopyFeedback('All copied!')
    setTimeout(() => setCopyFeedback(null), 1500)
  }
  
  return (
    <div className="w-96 bg-neutral-900 text-white text-sm flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-neutral-700">
        <Link to="/admin" className="text-amber-600 hover:text-amber-500 text-xs">
          ← Back to Admin
        </Link>
        <h1 className="text-base font-medium text-neutral-200 mt-1">Camera Viewpoints</h1>
      </div>
      
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
        </div>
        <p className="text-[10px] text-neutral-600 mt-2">
          Orbit/zoom with mouse, fine-tune by dragging handle or typing
        </p>
      </div>
      
      {/* Equipment Selection */}
      <div className="p-3 border-b border-neutral-700">
        <label className="text-xs text-neutral-400 block mb-1">Equipment</label>
        <select
          value={selectedEquipment || ''}
          onChange={(e) => setSelectedEquipment(e.target.value || null)}
          className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-xs"
        >
          <option value="">Select equipment...</option>
          {equipment.map(e => (
            <option key={e.id} value={e.id}>
              {e.name.en} {savedViewpoints[e.id] ? '✓' : ''}
            </option>
          ))}
        </select>
        
        <button
          onClick={handleSave}
          disabled={!selectedEquipment}
          className="w-full mt-2 bg-amber-800 hover:bg-amber-700 disabled:bg-neutral-700 
                     disabled:text-neutral-500 py-1.5 rounded text-xs font-medium transition-colors"
        >
          {copyFeedback || 'Save & Copy Code'}
        </button>
      </div>
      
      {/* Saved Viewpoints */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-400">
            Saved ({Object.keys(savedViewpoints).length})
          </span>
          {Object.keys(savedViewpoints).length > 0 && (
            <button onClick={handleCopyAll} className="text-xs text-amber-600 hover:text-amber-500">
              Copy All
            </button>
          )}
        </div>
        
        <div className="space-y-1">
          {Object.entries(savedViewpoints).map(([id, vp]) => (
            <button
              key={id}
              onClick={() => handleLoadViewpoint(id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors
                ${selectedEquipment === id 
                  ? 'bg-amber-900/50 border border-amber-700' 
                  : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'}`}
            >
              <div className="text-neutral-200">{equipment.find(e => e.id === id)?.name.en}</div>
              <div className="text-neutral-500 font-mono text-[10px]">
                [{vp.position.map((v: number) => v.toFixed(1)).join(', ')}]
              </div>
            </button>
          ))}
        </div>
        
        {Object.keys(savedViewpoints).length === 0 && (
          <p className="text-neutral-600 text-xs text-center py-4">No viewpoints saved</p>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-neutral-700 text-[10px] text-neutral-600">
        <strong>Controls:</strong> Left-drag orbit, scroll zoom<br/>
        Code copies to clipboard → paste into <code className="text-neutral-500">viewpoints.ts</code>
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
          <Camera clearColor="#1a1a2e" fov={60} farClip={1000} nearClip={0.01} />
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
