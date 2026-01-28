/**
 * Camera Capture Page - Transform Editor Approach
 * 
 * Like SuperSplat/Blender transform controls:
 * - Direct numeric input for position X/Y/Z and rotation X/Y/Z
 * - Drag sliders for fine adjustment
 * - Camera updates in real-time as values change
 * - Save viewpoints to associate with equipment hotspots
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { equipment } from '../../data/equipment'
import { getOverviewViewpoint } from '../../data/viewpoints'

// ============================================
// CONFIGURATION
// ============================================
const SPLAT_URL = '/pump-room.ply'
const INITIAL = getOverviewViewpoint()

// ============================================
// Splat Component - static, no state
// ============================================
function PumpRoomSplat({ src }: { src: string }) {
  const { asset, loading, error } = useSplat(src)
  
  if (error) {
    console.error('Splat load error:', error)
    return null
  }

  if (loading || !asset) {
    return null
  }
  
  return (
    <Entity position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <GSplat asset={asset} />
    </Entity>
  )
}

// ============================================
// Camera Controller - receives transform commands via window events
// ============================================
function CameraController() {
  const app = useApp()
  
  useEffect(() => {
    if (!app) return
    
    const handleSetTransform = (e: CustomEvent) => {
      const cameraEntity = app.root.findByName('camera')
      if (!cameraEntity) return
      
      const { position, rotation } = e.detail
      cameraEntity.setPosition(position[0], position[1], position[2])
      cameraEntity.setEulerAngles(rotation[0], rotation[1], rotation[2])
    }
    
    window.addEventListener('set-camera-transform', handleSetTransform as EventListener)
    
    return () => {
      window.removeEventListener('set-camera-transform', handleSetTransform as EventListener)
    }
  }, [app])
  
  return null
}

// ============================================
// Number Input with drag-to-adjust
// ============================================
interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  decimals?: number
}

function NumberInput({ label, value, onChange, step = 0.1, min = -1000, max = 1000, decimals = 2 }: NumberInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [localValue, setLocalValue] = useState(value.toFixed(decimals))
  const dragStartX = useRef(0)
  const dragStartValue = useRef(0)
  
  // Sync local value when prop changes (from reset, etc)
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value.toFixed(decimals))
    }
  }, [value, decimals, isDragging])
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartValue.current = value
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = (e.clientX - dragStartX.current) * step * 0.5
      const newValue = Math.max(min, Math.min(max, dragStartValue.current + delta))
      onChange(Number(newValue.toFixed(decimals)))
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }
  
  const handleInputBlur = () => {
    const parsed = parseFloat(localValue)
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed))
      onChange(Number(clamped.toFixed(decimals)))
      setLocalValue(clamped.toFixed(decimals))
    } else {
      setLocalValue(value.toFixed(decimals))
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur()
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      <span 
        className="text-gray-400 text-xs w-4 cursor-ew-resize select-none hover:text-white"
        onMouseDown={handleMouseDown}
        title="Drag to adjust"
      >
        {label}
      </span>
      <input
        type="text"
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-20 text-sm text-white text-right font-mono
                   focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}

// ============================================
// Transform Panel - Position and Rotation controls
// ============================================
interface TransformPanelProps {
  position: [number, number, number]
  rotation: [number, number, number]
  onPositionChange: (axis: 0 | 1 | 2, value: number) => void
  onRotationChange: (axis: 0 | 1 | 2, value: number) => void
  onReset: () => void
}

function TransformPanel({ position, rotation, onPositionChange, onRotationChange, onReset }: TransformPanelProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-300 flex items-center gap-2">
          <span className="text-orange-500">⊕</span> TRANSFORM
        </h2>
        <button
          onClick={onReset}
          className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
        >
          Reset
        </button>
      </div>
      
      {/* Position */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-gray-400 text-sm w-16">Position</span>
        <NumberInput 
          label="X" 
          value={position[0]} 
          onChange={(v) => onPositionChange(0, v)}
          step={0.1}
          decimals={2}
        />
        <NumberInput 
          label="Y" 
          value={position[1]} 
          onChange={(v) => onPositionChange(1, v)}
          step={0.1}
          decimals={2}
        />
        <NumberInput 
          label="Z" 
          value={position[2]} 
          onChange={(v) => onPositionChange(2, v)}
          step={0.1}
          decimals={2}
        />
      </div>
      
      {/* Rotation */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm w-16">Rotation</span>
        <NumberInput 
          label="X" 
          value={rotation[0]} 
          onChange={(v) => onRotationChange(0, v)}
          step={1}
          min={-180}
          max={180}
          decimals={1}
        />
        <NumberInput 
          label="Y" 
          value={rotation[1]} 
          onChange={(v) => onRotationChange(1, v)}
          step={1}
          min={-180}
          max={180}
          decimals={1}
        />
        <NumberInput 
          label="Z" 
          value={rotation[2]} 
          onChange={(v) => onRotationChange(2, v)}
          step={1}
          min={-180}
          max={180}
          decimals={1}
        />
      </div>
    </div>
  )
}

// ============================================
// Sidebar - Transform editor and viewpoint management
// ============================================
function Sidebar() {
  const [position, setPosition] = useState<[number, number, number]>([...INITIAL.position])
  const [rotation, setRotation] = useState<[number, number, number]>([...INITIAL.rotation])
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
  const [savedViewpoints, setSavedViewpoints] = useState<Record<string, any>>({})
  
  // Send transform to camera whenever values change
  const updateCamera = useCallback((pos: [number, number, number], rot: [number, number, number]) => {
    window.dispatchEvent(new CustomEvent('set-camera-transform', {
      detail: { position: pos, rotation: rot }
    }))
  }, [])
  
  // Update camera when position changes
  const handlePositionChange = (axis: 0 | 1 | 2, value: number) => {
    const newPos: [number, number, number] = [...position]
    newPos[axis] = value
    setPosition(newPos)
    updateCamera(newPos, rotation)
  }
  
  // Update camera when rotation changes
  const handleRotationChange = (axis: 0 | 1 | 2, value: number) => {
    const newRot: [number, number, number] = [...rotation]
    newRot[axis] = value
    setRotation(newRot)
    updateCamera(position, newRot)
  }
  
  // Reset to initial
  const handleReset = () => {
    const newPos: [number, number, number] = [...INITIAL.position]
    const newRot: [number, number, number] = [...INITIAL.rotation]
    setPosition(newPos)
    setRotation(newRot)
    updateCamera(newPos, newRot)
  }
  
  // Load a saved viewpoint
  const handleLoadViewpoint = (id: string) => {
    const vp = savedViewpoints[id]
    if (vp) {
      setPosition([...vp.position])
      setRotation([...vp.rotation])
      updateCamera(vp.position, vp.rotation)
      setSelectedEquipment(id)
    }
  }
  
  // Save current transform as viewpoint
  const handleSaveViewpoint = () => {
    if (!selectedEquipment) {
      alert('Select an equipment piece first')
      return
    }
    
    const viewpoint = {
      equipment_id: selectedEquipment,
      position: [...position],
      rotation: [...rotation],
      saved_at: new Date().toISOString()
    }
    
    setSavedViewpoints(prev => ({
      ...prev,
      [selectedEquipment]: viewpoint
    }))
    
    // Copy code to clipboard
    const equipmentItem = equipment.find(e => e.id === selectedEquipment)
    const code = `{
  id: '${selectedEquipment}-view',
  equipment_id: '${selectedEquipment}',
  position: [${position.map(v => v.toFixed(3)).join(', ')}],
  rotation: [${rotation.map(v => v.toFixed(2)).join(', ')}],
  fov: 60,
  label: { en: '${equipmentItem?.name.en || ''}', fr: '${equipmentItem?.name.fr || ''}' }
},`
    
    navigator.clipboard.writeText(code)
    console.log('Saved and copied:', code)
  }
  
  // Copy all saved viewpoints
  const handleCopyAll = () => {
    const allCode = Object.values(savedViewpoints)
      .map(vp => {
        const equipmentItem = equipment.find(e => e.id === vp.equipment_id)
        return `{
  id: '${vp.equipment_id}-view',
  equipment_id: '${vp.equipment_id}',
  position: [${vp.position.map((v: number) => v.toFixed(3)).join(', ')}],
  rotation: [${vp.rotation.map((v: number) => v.toFixed(2)).join(', ')}],
  fov: 60,
  label: { en: '${equipmentItem?.name.en || ''}', fr: '${equipmentItem?.name.fr || ''}' }
},`
      })
      .join('\n')
    
    navigator.clipboard.writeText(allCode)
    alert('All viewpoints copied to clipboard!')
  }
  
  // Initialize camera on mount
  useEffect(() => {
    updateCamera(position, rotation)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  return (
    <div className="w-[420px] bg-museum-dark text-white p-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to="/admin" 
          className="text-museum-highlight hover:text-museum-accent text-sm mb-2 inline-block"
        >
          ← Back to Admin
        </Link>
        <h1 className="text-xl font-display text-museum-highlight">
          Camera Viewpoints
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Adjust transform values to position camera, then save viewpoints for equipment.
        </p>
      </div>
      
      {/* Transform Panel */}
      <TransformPanel
        position={position}
        rotation={rotation}
        onPositionChange={handlePositionChange}
        onRotationChange={handleRotationChange}
        onReset={handleReset}
      />
      
      {/* Equipment Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Equipment / Hotspot
        </label>
        <select
          value={selectedEquipment || ''}
          onChange={(e) => setSelectedEquipment(e.target.value || null)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
        >
          <option value="">-- Select Equipment --</option>
          {equipment.map(e => (
            <option key={e.id} value={e.id}>
              {e.name.en}
              {savedViewpoints[e.id] ? ' ✓' : ''}
            </option>
          ))}
        </select>
      </div>
      
      {/* Save Button */}
      <button
        onClick={handleSaveViewpoint}
        disabled={!selectedEquipment}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 
                   py-3 rounded font-bold mb-6 transition-colors"
      >
        Save Viewpoint for Selected Equipment
      </button>
      
      {/* Saved Viewpoints */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-gray-300">
            Saved Viewpoints ({Object.keys(savedViewpoints).length})
          </h2>
          {Object.keys(savedViewpoints).length > 0 && (
            <button
              onClick={handleCopyAll}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Copy All Code
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {Object.entries(savedViewpoints).map(([id, vp]) => (
            <button
              key={id}
              onClick={() => handleLoadViewpoint(id)}
              className={`w-full text-left bg-gray-800 hover:bg-gray-700 border rounded p-3 transition-colors
                ${selectedEquipment === id ? 'border-blue-500' : 'border-gray-700'}`}
            >
              <div className="font-medium text-sm text-green-400">
                {equipment.find(e => e.id === id)?.name.en}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-1">
                pos: [{vp.position.map((v: number) => v.toFixed(2)).join(', ')}]
              </div>
              <div className="text-xs text-gray-500 font-mono">
                rot: [{vp.rotation.map((v: number) => v.toFixed(1)).join(', ')}]
              </div>
            </button>
          ))}
          
          {Object.keys(savedViewpoints).length === 0 && (
            <div className="text-gray-600 text-sm text-center py-4">
              No viewpoints saved yet
            </div>
          )}
        </div>
      </div>
      
      {/* Tips */}
      <div className="text-xs text-gray-600 border-t border-gray-700 pt-4">
        <p className="mb-2"><strong className="text-gray-500">Tips:</strong></p>
        <ul className="space-y-1">
          <li>• Drag the X/Y/Z labels to adjust values</li>
          <li>• Or type values directly in the input fields</li>
          <li>• Click saved viewpoints to load them</li>
          <li>• Viewpoint code is copied when you save</li>
        </ul>
      </div>
    </div>
  )
}

// ============================================
// PlayCanvas Viewer - completely isolated, no state
// ============================================
function SplatViewer() {
  return (
    <div className="flex-1 relative">
      <Application graphicsDeviceOptions={{ antialias: false }}>
        <Entity 
          name="camera" 
          position={INITIAL.position}
          rotation={INITIAL.rotation}
        >
          <Camera 
            clearColor="#1a1a2e"
            fov={60}
            farClip={1000}
            nearClip={0.01}
          />
        </Entity>
        <PumpRoomSplat src={SPLAT_URL} />
        <CameraController />
      </Application>
    </div>
  )
}

// ============================================
// Main Page
// ============================================
export default function CameraCapture() {
  return (
    <div className="w-screen h-screen bg-black flex">
      <SplatViewer />
      <Sidebar />
    </div>
  )
}
