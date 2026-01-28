/**
 * Hotspot Editor - Polygon Drawing Tool
 * 
 * CRITICAL: PlayCanvas Application must be COMPLETELY ISOLATED from React state.
 * The SplatScene component is memoized and has NO props that change.
 */

import React, { useState, useEffect, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { useSplat } from '@playcanvas/react/hooks'
import { useSplatData } from '../../hooks/useSplatData'
import type { ParsedSplatHotspot, PolygonBounds } from '../../lib/database.types'
import { createHotspot, deleteHotspot } from '../../lib/api/splat'

// ============================================
// CONFIGURATION
// ============================================
const SPLAT_URL = '/pump-room.ply'

const OVERVIEW = {
  position: [-0.005, -6.86, 0.296] as [number, number, number],
  rotation: [87.53, -0.96, 0] as [number, number, number],
  fov: 60
}

// Polygon visual styling
const STYLE = {
  // Unselected polygon
  fill: 'rgba(196, 165, 116, 0.12)',
  stroke: 'rgba(196, 165, 116, 0.5)',
  strokeWidth: 0.15,
  
  // Selected polygon
  selectedFill: 'rgba(245, 158, 11, 0.2)',
  selectedStroke: 'rgba(245, 158, 11, 0.8)',
  selectedStrokeWidth: 0.25,
  
  // Vertex handles (small, subtle)
  vertexRadius: 0.6,
  vertexHoverRadius: 0.8,
  vertexTouchRadius: 2,
  vertexFill: 'rgba(255, 255, 255, 0.9)',
  vertexStroke: 'rgba(0, 0, 0, 0.5)',
  vertexHoverFill: '#f59e0b',
  vertexDragFill: '#fbbf24',
  
  // Midpoint handles (even smaller)
  midpointRadius: 0.4,
  midpointTouchRadius: 1.5,
  midpointFill: 'rgba(96, 165, 250, 0.6)',
  midpointHoverFill: '#60a5fa',
  
  // Drawing mode
  drawingStroke: '#f59e0b',
  drawingStrokeWidth: 0.2,
  drawingPointRadius: 0.7,
  drawingFirstPointRadius: 1,
  drawingCloseZoneRadius: 2,
}

interface Point {
  x: number
  y: number
}

type EditorMode = 'select' | 'draw'

// ============================================
// Splat Component - completely static
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

// SplatScene - ISOLATED with memo
const SplatScene = memo(function SplatScene() {
  return (
    <Application graphicsDeviceOptions={{ antialias: false }}>
      <Entity name="camera" position={OVERVIEW.position} rotation={OVERVIEW.rotation}>
        <Camera clearColor="#1a1a2e" fov={OVERVIEW.fov} farClip={1000} nearClip={0.01} />
      </Entity>
      <PumpRoomSplat src={SPLAT_URL} />
    </Application>
  )
})

// ============================================
// Polygon Shape Renderer (SVG)
// ============================================
interface PolygonShapeProps {
  points: Point[]
  isSelected: boolean
  onSelect?: () => void
  onVertexDrag?: (index: number, newPos: Point) => void
  onMidpointClick?: (index: number) => void
  onVertexRightClick?: (index: number) => void
}

function PolygonShape({ 
  points, 
  isSelected, 
  onSelect,
  onVertexDrag,
  onMidpointClick,
  onVertexRightClick
}: PolygonShapeProps) {
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null)
  const [hoverVertex, setHoverVertex] = useState<number | null>(null)
  const [hoverMidpoint, setHoverMidpoint] = useState<number | null>(null)
  const svgRef = useRef<SVGGElement>(null)
  
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ')
  
  // Calculate midpoints
  const midpoints = points.map((p, i) => {
    const next = points[(i + 1) % points.length]
    return { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 }
  })
  
  const handleVertexMouseDown = (e: React.MouseEvent, index: number) => {
    if (e.button === 2) {
      e.preventDefault()
      onVertexRightClick?.(index)
      return
    }
    e.stopPropagation()
    setDraggingVertex(index)
  }
  
  // Global mouse tracking for smooth dragging
  useEffect(() => {
    if (draggingVertex === null) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const svg = svgRef.current?.closest('svg')
      if (!svg || !onVertexDrag) return
      
      const rect = svg.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      
      onVertexDrag(draggingVertex, { 
        x: Math.max(0, Math.min(100, x)), 
        y: Math.max(0, Math.min(100, y)) 
      })
    }
    
    const handleMouseUp = () => setDraggingVertex(null)
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingVertex, onVertexDrag])
  
  const getVertexFill = (i: number) => {
    if (draggingVertex === i) return STYLE.vertexDragFill
    if (hoverVertex === i) return STYLE.vertexHoverFill
    return STYLE.vertexFill
  }
  
  return (
    <g ref={svgRef}>
      {/* Polygon fill and stroke */}
      <polygon
        points={pointsStr}
        fill={isSelected ? STYLE.selectedFill : STYLE.fill}
        stroke={isSelected ? STYLE.selectedStroke : STYLE.stroke}
        strokeWidth={isSelected ? STYLE.selectedStrokeWidth : STYLE.strokeWidth}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.()
        }}
      />
      
      {/* Vertices - only when selected */}
      {isSelected && points.map((p, i) => (
        <g key={`v-${i}`}>
          {/* Invisible touch target */}
          <circle
            cx={p.x}
            cy={p.y}
            r={STYLE.vertexTouchRadius}
            fill="transparent"
            className="cursor-move"
            onMouseDown={(e) => handleVertexMouseDown(e, i)}
            onMouseEnter={() => setHoverVertex(i)}
            onMouseLeave={() => setHoverVertex(null)}
            onContextMenu={(e) => e.preventDefault()}
          />
          {/* Visible vertex */}
          <circle
            cx={p.x}
            cy={p.y}
            r={hoverVertex === i || draggingVertex === i ? STYLE.vertexHoverRadius : STYLE.vertexRadius}
            fill={getVertexFill(i)}
            stroke={STYLE.vertexStroke}
            strokeWidth={0.1}
            pointerEvents="none"
          />
        </g>
      ))}
      
      {/* Midpoints - for adding vertices */}
      {isSelected && points.length >= 3 && midpoints.map((p, i) => (
        <g key={`m-${i}`}>
          {/* Invisible touch target */}
          <circle
            cx={p.x}
            cy={p.y}
            r={STYLE.midpointTouchRadius}
            fill="transparent"
            className="cursor-crosshair"
            onClick={(e) => {
              e.stopPropagation()
              onMidpointClick?.(i)
            }}
            onMouseEnter={() => setHoverMidpoint(i)}
            onMouseLeave={() => setHoverMidpoint(null)}
          />
          {/* Visible midpoint */}
          <circle
            cx={p.x}
            cy={p.y}
            r={STYLE.midpointRadius}
            fill={hoverMidpoint === i ? STYLE.midpointHoverFill : STYLE.midpointFill}
            pointerEvents="none"
          />
        </g>
      ))}
    </g>
  )
}

// ============================================
// Drawing Polygon
// ============================================
interface DrawingPolygonProps {
  points: Point[]
  mousePos: Point | null
}

function DrawingPolygon({ points, mousePos }: DrawingPolygonProps) {
  if (points.length === 0) return null
  
  const allPoints = mousePos ? [...points, mousePos] : points
  const pointsStr = allPoints.map(p => `${p.x},${p.y}`).join(' ')
  
  return (
    <g>
      {/* Lines */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke={STYLE.drawingStroke}
        strokeWidth={STYLE.drawingStrokeWidth}
        strokeDasharray="0.5,0.3"
      />
      
      {/* Closing line preview */}
      {points.length >= 2 && mousePos && (
        <line
          x1={mousePos.x}
          y1={mousePos.y}
          x2={points[0].x}
          y2={points[0].y}
          stroke={STYLE.drawingStroke}
          strokeWidth={STYLE.drawingStrokeWidth * 0.7}
          strokeDasharray="0.3,0.3"
          opacity={0.5}
        />
      )}
      
      {/* Placed points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === 0 && points.length >= 3 ? STYLE.drawingFirstPointRadius : STYLE.drawingPointRadius}
          fill={i === 0 ? '#22c55e' : STYLE.drawingStroke}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={0.1}
        />
      ))}
      
      {/* Close zone indicator */}
      {points.length >= 3 && (
        <circle
          cx={points[0].x}
          cy={points[0].y}
          r={STYLE.drawingCloseZoneRadius}
          fill="none"
          stroke="#22c55e"
          strokeWidth={0.15}
          strokeDasharray="0.4,0.3"
          opacity={0.6}
        />
      )}
    </g>
  )
}

// ============================================
// SVG Overlay
// ============================================
interface OverlayProps {
  hotspots: ParsedSplatHotspot[]
  selectedId: string | null
  onSelectHotspot: (id: string | null) => void
  onUpdateBounds: (id: string, bounds: PolygonBounds) => void
  mode: EditorMode
  drawingPoints: Point[]
  onAddDrawingPoint: (point: Point) => void
  onCompleteDrawing: () => void
  mousePos: Point | null
  onMouseMove: (pos: Point) => void
}

function Overlay({
  hotspots,
  selectedId,
  onSelectHotspot,
  onUpdateBounds,
  mode,
  drawingPoints,
  onAddDrawingPoint,
  onCompleteDrawing,
  mousePos,
  onMouseMove
}: OverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  
  const getMousePosition = (e: React.MouseEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    }
  }
  
  const handleClick = (e: React.MouseEvent) => {
    const pos = getMousePosition(e)
    
    if (mode === 'draw') {
      // Check if clicking near first point to close
      if (drawingPoints.length >= 3) {
        const first = drawingPoints[0]
        const dist = Math.sqrt((pos.x - first.x) ** 2 + (pos.y - first.y) ** 2)
        if (dist < 3) {
          onCompleteDrawing()
          return
        }
      }
      onAddDrawingPoint(pos)
    }
    // In select mode, clicking empty space does NOT deselect
    // User must click another hotspot or use sidebar to deselect
  }
  
  const handleDoubleClick = () => {
    if (mode === 'draw' && drawingPoints.length >= 3) {
      onCompleteDrawing()
    }
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    onMouseMove(getMousePosition(e))
  }
  
  const handleVertexDrag = (hotspotId: string, vertexIndex: number, newPos: Point) => {
    const hotspot = hotspots.find(h => h.id === hotspotId)
    if (!hotspot || hotspot.shape !== 'polygon') return
    
    const bounds = hotspot.bounds as PolygonBounds
    const newPoints = [...bounds.points]
    newPoints[vertexIndex] = newPos
    onUpdateBounds(hotspotId, { points: newPoints })
  }
  
  const handleMidpointClick = (hotspotId: string, midpointIndex: number) => {
    const hotspot = hotspots.find(h => h.id === hotspotId)
    if (!hotspot || hotspot.shape !== 'polygon') return
    
    const bounds = hotspot.bounds as PolygonBounds
    const p1 = bounds.points[midpointIndex]
    const p2 = bounds.points[(midpointIndex + 1) % bounds.points.length]
    const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    
    const newPoints = [...bounds.points]
    newPoints.splice(midpointIndex + 1, 0, midpoint)
    onUpdateBounds(hotspotId, { points: newPoints })
  }
  
  const handleVertexDelete = (hotspotId: string, vertexIndex: number) => {
    const hotspot = hotspots.find(h => h.id === hotspotId)
    if (!hotspot || hotspot.shape !== 'polygon') return
    
    const bounds = hotspot.bounds as PolygonBounds
    if (bounds.points.length <= 3) return
    
    const newPoints = bounds.points.filter((_, i) => i !== vertexIndex)
    onUpdateBounds(hotspotId, { points: newPoints })
  }
  
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
      style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseMove={handleMouseMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Existing hotspots */}
      {hotspots.map(hotspot => {
        if (hotspot.shape !== 'polygon') return null
        const bounds = hotspot.bounds as PolygonBounds
        return (
          <PolygonShape
            key={hotspot.id}
            points={bounds.points}
            isSelected={selectedId === hotspot.id}
            onSelect={() => onSelectHotspot(hotspot.id)}
            onVertexDrag={(i, pos) => handleVertexDrag(hotspot.id, i, pos)}
            onMidpointClick={(i) => handleMidpointClick(hotspot.id, i)}
            onVertexRightClick={(i) => handleVertexDelete(hotspot.id, i)}
          />
        )
      })}
      
      {/* Drawing polygon */}
      {mode === 'draw' && (
        <DrawingPolygon points={drawingPoints} mousePos={mousePos} />
      )}
    </svg>
  )
}

// ============================================
// Sidebar
// ============================================
interface SidebarProps {
  hotspots: ParsedSplatHotspot[]
  selectedId: string | null
  onSelectHotspot: (id: string | null) => void
  mode: EditorMode
  onSetMode: (mode: EditorMode) => void
  onCreateHotspot: (name: string) => void
  onDeleteHotspot: (id: string) => void
  drawingPoints: Point[]
  onCancelDrawing: () => void
  saving: boolean
  configId: string | null
  loading: boolean
  error: string | null
}

function Sidebar({
  hotspots,
  selectedId,
  onSelectHotspot,
  mode,
  onSetMode,
  onCreateHotspot,
  onDeleteHotspot,
  drawingPoints,
  onCancelDrawing,
  saving,
  configId,
  loading,
  error
}: SidebarProps) {
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  
  const selectedHotspot = hotspots.find(h => h.id === selectedId)
  
  const handleCreate = () => {
    if (newName.trim()) {
      onCreateHotspot(newName.trim())
      setNewName('')
    }
  }
  
  const handleDelete = (id: string) => {
    onDeleteHotspot(id)
    setConfirmDelete(null)
  }
  
  return (
    <div className="w-72 bg-neutral-900 text-white text-sm flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-neutral-700">
        <Link to="/admin" className="text-amber-600 hover:text-amber-500 text-xs">
          ← Back to Admin
        </Link>
        <h1 className="text-base font-medium text-neutral-200 mt-1">Hotspot Editor</h1>
      </div>
      
      {/* Status */}
      {loading && (
        <div className="px-3 py-2 bg-neutral-800 text-neutral-400 text-xs">
          Loading...
        </div>
      )}
      {error && (
        <div className="px-3 py-2 bg-red-900/30 text-red-400 text-xs">
          {error}
        </div>
      )}
      
      {/* Mode Toggle */}
      <div className="p-3 border-b border-neutral-700">
        <div className="flex gap-1">
          <button
            onClick={() => onSetMode('select')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors
              ${mode === 'select' 
                ? 'bg-amber-700 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            Edit
          </button>
          <button
            onClick={() => onSetMode('draw')}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors
              ${mode === 'draw' 
                ? 'bg-amber-700 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            Draw
          </button>
        </div>
        
        {mode === 'draw' && (
          <div className="mt-2 text-[10px] text-neutral-500">
            Click to place points. Double-click or click start point to close.
            {drawingPoints.length > 0 && (
              <div className="mt-1 flex items-center justify-between text-neutral-400">
                <span>{drawingPoints.length} points</span>
                <button onClick={onCancelDrawing} className="text-red-400 hover:text-red-300">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* New Hotspot Name */}
      {mode === 'draw' && drawingPoints.length >= 3 && (
        <div className="p-3 border-b border-neutral-700 bg-green-900/20">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Hotspot name..."
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-xs
                      focus:border-green-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="w-full mt-2 bg-green-700 hover:bg-green-600 disabled:bg-neutral-700
                      disabled:text-neutral-500 py-1.5 rounded text-xs font-medium"
          >
            Save
          </button>
        </div>
      )}
      
      {/* Selected Hotspot */}
      {mode === 'select' && selectedHotspot && (
        <div className="p-3 border-b border-neutral-700 bg-amber-900/10">
          <div className="text-xs text-amber-500 mb-1">Selected</div>
          <div className="text-neutral-200 font-medium text-sm">{selectedHotspot.name_en}</div>
          <div className="text-neutral-600 text-[10px] font-mono mt-0.5">{selectedHotspot.slug}</div>
          
          <div className="mt-2 text-[10px] text-neutral-500">
            Drag handles to edit. Right-click to delete vertex.
          </div>
          
          {selectedHotspot.shape === 'polygon' && (
            <div className="mt-1 text-[10px] text-neutral-600">
              {(selectedHotspot.bounds as PolygonBounds).points.length} vertices
            </div>
          )}
          
          {/* Delete */}
          {confirmDelete === selectedHotspot.id ? (
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => handleDelete(selectedHotspot.id)}
                className="flex-1 bg-red-700 hover:bg-red-600 py-1 rounded text-[10px]"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 py-1 rounded text-[10px]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(selectedHotspot.id)}
              className="w-full mt-2 text-red-400 hover:text-red-300 text-[10px] text-left"
            >
              Delete hotspot
            </button>
          )}
          
          {/* Deselect */}
          <button
            onClick={() => onSelectHotspot(null)}
            className="w-full mt-1 text-neutral-500 hover:text-neutral-400 text-[10px] text-left"
          >
            Deselect
          </button>
        </div>
      )}
      
      {/* Hotspot List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wide">
            Hotspots ({hotspots.length})
          </span>
          {saving && (
            <span className="text-[10px] text-amber-500">Saving...</span>
          )}
        </div>
        
        <div className="space-y-0.5">
          {hotspots.map(h => (
            <button
              key={h.id}
              onClick={() => onSelectHotspot(h.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors
                ${selectedId === h.id
                  ? 'bg-amber-900/40 text-amber-100'
                  : 'text-neutral-300 hover:bg-neutral-800'}`}
            >
              <div className="flex items-center justify-between">
                <span>{h.name_en}</span>
                {h.viewpoint_position && (
                  <span className="text-green-500 text-[10px]">📷</span>
                )}
              </div>
            </button>
          ))}
        </div>
        
        {hotspots.length === 0 && !loading && (
          <p className="text-neutral-600 text-xs text-center py-4">
            No hotspots. Use Draw mode.
          </p>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-neutral-800 text-[10px] text-neutral-600">
        {configId ? `Config: ${configId.slice(0, 8)}` : 'No config'}
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================
export default function HotspotEditor() {
  const { config, hotspots, loading, error, saveHotspotBounds } = useSplatData()
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<EditorMode>('select')
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([])
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Local hotspots for optimistic updates
  const [localHotspots, setLocalHotspots] = useState<ParsedSplatHotspot[]>([])
  
  useEffect(() => {
    setLocalHotspots(hotspots)
  }, [hotspots])
  
  const handleSelectHotspot = (id: string | null) => {
    setSelectedId(id)
    if (id) setMode('select')
  }
  
  const handleSetMode = (newMode: EditorMode) => {
    setMode(newMode)
    if (newMode === 'draw') {
      setSelectedId(null)
      setDrawingPoints([])
    }
  }
  
  const handleAddDrawingPoint = (point: Point) => {
    setDrawingPoints(prev => [...prev, point])
  }
  
  const handleCancelDrawing = () => {
    setDrawingPoints([])
  }
  
  const handleCompleteDrawing = () => {
    // Points stay visible, user enters name in sidebar
  }
  
  const handleCreateHotspot = async (name: string) => {
    if (!config || drawingPoints.length < 3) return
    
    setSaving(true)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    const newHotspot = await createHotspot({
      splat_config_id: config.id,
      slug,
      name_en: name,
      shape: 'polygon',
      bounds: { points: drawingPoints },
      order_index: localHotspots.length,
      active: true
    })
    
    if (newHotspot) {
      setLocalHotspots(prev => [...prev, newHotspot])
      setSelectedId(newHotspot.id)
    }
    
    setDrawingPoints([])
    setMode('select')
    setSaving(false)
  }
  
  const handleDeleteHotspot = async (id: string) => {
    setSaving(true)
    const success = await deleteHotspot(id)
    if (success) {
      setLocalHotspots(prev => prev.filter(h => h.id !== id))
      setSelectedId(null)
    }
    setSaving(false)
  }
  
  const handleUpdateBounds = async (id: string, bounds: PolygonBounds) => {
    // Optimistic update
    setLocalHotspots(prev => prev.map(h => 
      h.id === id ? { ...h, bounds } : h
    ))
    
    // Save to DB
    setSaving(true)
    await saveHotspotBounds(id, 'polygon', bounds)
    setSaving(false)
  }
  
  return (
    <div className="w-screen h-screen bg-black flex">
      {/* Splat Viewer */}
      <div className="flex-1 relative">
        <SplatScene />
        <Overlay
          hotspots={localHotspots.filter(h => h.shape === 'polygon')}
          selectedId={selectedId}
          onSelectHotspot={handleSelectHotspot}
          onUpdateBounds={handleUpdateBounds}
          mode={mode}
          drawingPoints={drawingPoints}
          onAddDrawingPoint={handleAddDrawingPoint}
          onCompleteDrawing={handleCompleteDrawing}
          mousePos={mousePos}
          onMouseMove={setMousePos}
        />
      </div>
      
      {/* Sidebar */}
      <Sidebar
        hotspots={localHotspots}
        selectedId={selectedId}
        onSelectHotspot={handleSelectHotspot}
        mode={mode}
        onSetMode={handleSetMode}
        onCreateHotspot={handleCreateHotspot}
        onDeleteHotspot={handleDeleteHotspot}
        drawingPoints={drawingPoints}
        onCancelDrawing={handleCancelDrawing}
        saving={saving}
        configId={config?.id || null}
        loading={loading}
        error={error}
      />
    </div>
  )
}
