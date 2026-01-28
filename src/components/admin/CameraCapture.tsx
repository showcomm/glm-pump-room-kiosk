/**
 * Camera Capture Page
 * 
 * Admin tool for capturing camera viewpoints for equipment hotspots.
 * 
 * CRITICAL: The Application component must be isolated from React state changes.
 * All UI state lives in the Sidebar component, outside the Application.
 */

import { useState, useEffect, useRef } from 'react'
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
// Camera Helper - broadcasts position via window events
// Also adds WASD keyboard controls for panning
// ============================================
function CameraHelper() {
  const app = useApp()
  const frameRef = useRef<number>()
  const keysPressed = useRef<Set<string>>(new Set())
  
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
    
    ;(window as any).captureCamera = getCameraData
    
    // Keyboard controls for panning
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase())
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    const PAN_SPEED = 0.05
    
    const updateLoop = () => {
      const cameraEntity = app.root.findByName('camera')
      
      // Handle WASD panning
      if (cameraEntity && keysPressed.current.size > 0) {
        const pos = cameraEntity.getPosition()
        let dx = 0, dy = 0, dz = 0
        
        if (keysPressed.current.has('w')) dz -= PAN_SPEED
        if (keysPressed.current.has('s')) dz += PAN_SPEED
        if (keysPressed.current.has('a')) dx -= PAN_SPEED
        if (keysPressed.current.has('d')) dx += PAN_SPEED
        if (keysPressed.current.has('q')) dy -= PAN_SPEED
        if (keysPressed.current.has('e')) dy += PAN_SPEED
        
        if (dx !== 0 || dy !== 0 || dz !== 0) {
          cameraEntity.setPosition(pos.x + dx, pos.y + dy, pos.z + dz)
        }
      }
      
      // Broadcast position
      const data = getCameraData()
      if (data) {
        window.dispatchEvent(new CustomEvent('camera-update', { detail: data }))
      }
      frameRef.current = requestAnimationFrame(updateLoop)
    }
    frameRef.current = requestAnimationFrame(updateLoop)
    
    return () => {
      delete (window as any).captureCamera
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [app])
  
  return null
}

// ============================================
// Sidebar - ALL state lives here, outside Application
// ============================================
function Sidebar() {
  const [cameraData, setCameraData] = useState({ pos: [0, 0, 0], rot: [0, 0, 0] })
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null)
  const [capturedPositions, setCapturedPositions] = useState<Record<string, any>>({})
  
  useEffect(() => {
    const handler = (e: CustomEvent) => setCameraData(e.detail)
    window.addEventListener('camera-update', handler as EventListener)
    return () => window.removeEventListener('camera-update', handler as EventListener)
  }, [])
  
  const formatNum = (v: number, decimals: number = 3) => {
    const rounded = Number(v.toFixed(decimals))
    return Object.is(rounded, -0) ? '0' : rounded.toFixed(decimals)
  }
  
  const handleCapture = () => {
    if (!selectedEquipment) {
      alert('Select an equipment piece first')
      return
    }
    
    const captured = {
      equipment_id: selectedEquipment,
      position: cameraData.pos.map(v => Number(v.toFixed(3))),
      rotation: cameraData.rot.map(v => Number(v.toFixed(2))),
      captured_at: new Date().toISOString()
    }
    
    setCapturedPositions(prev => ({
      ...prev,
      [selectedEquipment]: captured
    }))
    
    const equipmentItem = equipment.find(e => e.id === selectedEquipment)
    const code = `{
  id: '${selectedEquipment}-view',
  equipment_id: '${selectedEquipment}',
  position: [${captured.position.join(', ')}],
  rotation: [${captured.rotation.join(', ')}],
  fov: 60,
  label: { en: '${equipmentItem?.name.en || ''}', fr: '${equipmentItem?.name.fr || ''}' }
},`
    
    navigator.clipboard.writeText(code)
    console.log('Captured and copied:', code)
  }
  
  const handleCopyAll = () => {
    const allCode = Object.values(capturedPositions)
      .map(p => {
        const equipmentItem = equipment.find(e => e.id === p.equipment_id)
        return `{
  id: '${p.equipment_id}-view',
  equipment_id: '${p.equipment_id}',
  position: [${p.position.join(', ')}],
  rotation: [${p.rotation.join(', ')}],
  fov: 60,
  label: { en: '${equipmentItem?.name.en || ''}', fr: '${equipmentItem?.name.fr || ''}' }
},`
      })
      .join('\n')
    
    navigator.clipboard.writeText(allCode)
    alert('All captured positions copied to clipboard!')
  }
  
  return (
    <div className="w-96 bg-museum-dark text-white p-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to="/admin" 
          className="text-museum-highlight hover:text-museum-accent text-sm mb-2 inline-block"
        >
          ← Back to Admin
        </Link>
        <h1 className="text-xl font-display text-museum-highlight">
          Camera Position Capture
        </h1>
      </div>
      
      {/* Current Position */}
      <div className="bg-black/50 rounded-lg p-4 mb-6 font-mono text-sm">
        <div className="text-gray-400 mb-2">Current Camera</div>
        <div>Pos: [{cameraData.pos.map(v => formatNum(v, 2)).join(', ')}]</div>
        <div>Rot: [{cameraData.rot.map(v => formatNum(v, 1)).join(', ')}]</div>
      </div>
      
      {/* Equipment Selection */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">
          Select Equipment to Capture
        </label>
        <select
          value={selectedEquipment || ''}
          onChange={(e) => setSelectedEquipment(e.target.value || null)}
          className="w-full bg-museum-brown/50 border border-museum-accent/30 rounded px-3 py-2 text-white"
        >
          <option value="">-- Select Equipment --</option>
          {equipment.map(e => (
            <option key={e.id} value={e.id}>
              {e.name.en}
              {capturedPositions[e.id] ? ' ✓' : ''}
            </option>
          ))}
        </select>
      </div>
      
      {/* Capture Button */}
      <button
        onClick={handleCapture}
        disabled={!selectedEquipment}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded font-bold mb-4"
      >
        Capture Position
      </button>
      
      {/* Captured Positions */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm text-gray-400">
            Captured ({Object.keys(capturedPositions).length})
          </h2>
          {Object.keys(capturedPositions).length > 0 && (
            <button
              onClick={handleCopyAll}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Copy All
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {Object.entries(capturedPositions).map(([id, data]) => (
            <div 
              key={id}
              className="bg-green-900/30 border border-green-700/50 rounded p-2 text-xs"
            >
              <div className="font-bold text-green-400">
                {equipment.find(e => e.id === id)?.name.en}
              </div>
              <div className="text-gray-400 font-mono">
                pos: [{data.position.map((v: number) => v.toFixed(2)).join(', ')}]
              </div>
              <div className="text-gray-400 font-mono">
                rot: [{data.rotation.map((v: number) => v.toFixed(1)).join(', ')}]
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
        <p className="mb-2"><strong>Controls:</strong></p>
        <ul className="space-y-1 mb-4">
          <li>• Left-drag: Orbit</li>
          <li>• Scroll: Zoom</li>
          <li>• WASD: Pan horizontally</li>
          <li>• Q/E: Pan up/down</li>
        </ul>
        <p className="mb-2"><strong>Workflow:</strong></p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Select equipment from dropdown</li>
          <li>Navigate camera to viewpoint</li>
          <li>Click "Capture Position"</li>
          <li>Code is copied to clipboard</li>
          <li>Paste into viewpoints.ts</li>
        </ol>
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
          <Script script={CameraControls} />
        </Entity>
        <PumpRoomSplat src={SPLAT_URL} />
        <CameraHelper />
      </Application>
      
      {/* Controls overlay */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded text-sm">
        Orbit: left-drag | Zoom: scroll | Pan: WASD + Q/E
      </div>
    </div>
  )
}

// ============================================
// Main Page - composes Viewer + Sidebar
// ============================================
export default function CameraCapture() {
  return (
    <div className="w-screen h-screen bg-black flex">
      <SplatViewer />
      <Sidebar />
    </div>
  )
}
