/**
 * Hotspot Editor - Polygon Drawing Tool
 * 
 * CRITICAL: PlayCanvas Application must be COMPLETELY ISOLATED from React state.
 * The SplatScene component is memoized and has NO props that change.
 * 
 * Features:
 * - Draw polygon hotspots over the splat viewer
 * - Click to place points, double-click to close shape
 * - Edit existing polygons by dragging vertices
 * - Add new vertices by clicking midpoints
 * - Delete hotspots via sidebar button
 * - Saves directly to Supabase
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react'
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

// Fixed overview position - NO camera controls, static view for polygon editing
const OVERVIEW = {
  position: [-0.005, -6.86, 0.296] as [number, number, number],
  rotation: [87.53, -0.96, 0] as [number, number, number],
  fov: 60
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

// ============================================
// SplatScene - COMPLETELY ISOLATED with memo to prevent ANY re-renders
// This is the key pattern from InteractiveViewer that prevents splat disappearing
// ============================================
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
  
  // MUCH LARGER touch targets for usability
  const VERTEX_RADIUS = 1.5
  const VERTEX_HOVER_RADIUS = 2
  const TOUCH_TARGET_RADIUS = 3
  const MIDPOINT_RADIUS = 1
  const MIDPOINT_TOUCH_RADIUS = 2.5
  
  return (
    <g ref={svgRef}>
      {/* Polygon fill */}
      <polygon
        points={pointsStr}
        fill={isSelected ? 'rgba(139, 115, 85, 0.35)' : 'rgba(139, 115, 85, 0.2)'}
        stroke={isSelected ? 'rgba(245, 158, 11, 0.9)' : 'rgba(196, 165, 116, 0.6)'}
        strokeWidth={isSelected ? 0.5 : 0.3}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.()
        }}
      />
      
      {/* Vertices - only show when selected */}
      {isSelected && points.map((p, i) => (
        <g key={`v-${i}`}>
          {/* Invisible larger touch target */}
          <circle
            cx={p.x}
            cy={p.y}
            r={TOUCH_TARGET_RADIUS}
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
            r={hoverVertex === i || draggingVertex === i ? VERTEX_HOVER_RADIUS : VERTEX_RADIUS}
            fill={draggingVertex === i ? '#f59e0b' : hoverVertex === i ? '#fbbf24' : '#c4a574'}
            stroke="#1a1a2e"
            strokeWidth={0.3}
            pointerEvents="none"
          />
          {/* Vertex number label */}
          <text
            x={p.x}
            y={p.y + 0.4}
            fontSize="1.1"
            fill="#1a1a2e"
            textAnchor="middle"
            pointerEvents="none"
            fontWeight="bold"
          >
            {i + 1}
          </text>
        </g>
      ))}
      
      {/* Midpoints - for adding new vertices */}
      {isSelected && points.length >= 3 && midpoints.map((p, i) => (
        <g key={`m-${i}`}>
          {/* Invisible larger touch target */}
          <circle
            cx={p.x}
            cy={p.y}
            r={MIDPOINT_TOUCH_RADIUS}
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
            r={hoverMidpoint === i ? MIDPOINT_RADIUS * 1.3 : MIDPOINT_RADIUS}
            fill={hoverMidpoint === i ? '#60a5fa' : 'rgba(96, 165, 250, 0.6)'}
            stroke="#1a1a2e"
            strokeWidth={0.2}
            pointerEvents="none"
          />
          {/* Plus sign on hover */}
          {hoverMidpoint === i && (
            <>
              <line x1={p.x - 0.5} y1={p.y} x2={p.x + 0.5} y2={p.y} stroke="#1a1a2e" strokeWidth={0.2} pointerEvents="none" />
              <line x1={p.x} y1={p.y - 0.5} x2={p.x} y2={p.y + 0.5} stroke="#1a1a2e" strokeWidth={0.2} pointerEvents="none" />
            </>
          )}
        </g>
      ))}
    </g>
  )
}

// ============================================
// Drawing Polygon (incomplete, still placing points)
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
        stroke="#f59e0b"
        strokeWidth={0.4}
        strokeDasharray="0.8,0.4"
      />
      
      {/* Closing line preview */}
      {points.length >= 2 && mousePos && (
        <line
          x1={mousePos.x}
          y1={mousePos.y}
          x2={points[0].x}
          y2={points[0].y}
          stroke="#f59e0b"
          strokeWidth={0.25}
          strokeDasharray="0.4,0.4"
          opacity={0.5}
        />
      )}
      
      {/* Placed points - LARGER */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={i === 0 && points.length >= 3 ? 2 : 1.5}
            fill={i === 0 ? '#22c55e' : '#f59e0b'}
            stroke="#1a1a2e"
            strokeWidth={0.3}
          />
          <text
            x={p.x}
            y={p.y + 0.4}
            fontSize="1"
            fill="#1a1a2e"
            textAnchor="middle"
            fontWeight="bold"
          >
            {i + 1}
          </text>
        </g>
      ))}
      
      {/* First point indicator (click to close) */}
      {points.length >= 3 && (
        <circle
          cx={points[0].x}
          cy={points[0].y}
          r={3}
          fill="none"
          stroke="#22c55e"
          strokeWidth={0.3}
          strokeDasharray="0.5,0.3"
        />
      )}
    </g>
  )
}

// ============================================
// SVG Overlay (sits on top of splat)
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
      // Check if clicking near first point to close (larger threshold)
      if (drawingPoints.length >= 3) {
        const first = drawingPoints[0]
        const dist = Math.sqrt((pos.x - first.x) ** 2 + (pos.y - first.y) ** 2)
        if (dist < 4) {
          onCompleteDrawing()
          return
        }
      }
      onAddDrawingPoint(pos)
    } else {
      onSelectHotspot(null)
    }
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
    <div className="w-80 bg-neutral-900 text-white text-sm flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-neutral-700">
        <Link to="/admin" className="text-amber-600 hover:text-amber-500 text-xs">
          ← Back to Admin
        </Link>
        <h1 className="text-base font-medium text-neutral-200 mt-1">Hotspot Editor</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Draw polygons around equipment
        </p>
      </div>
      
      {/* Loading/Error States */}
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
      
      {/* Mode Toggle */}
      <div className="p-3 border-b border-neutral-700">
        <div className="flex gap-2">
          <button
            onClick={() => onSetMode('select')}
            className={`flex-1 py-2 rounded text-xs font-medium transition-colors
              ${mode === 'select' 
                ? 'bg-amber-800 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            ✋ Select / Edit
          </button>
          <button
            onClick={() => onSetMode('draw')}
            className={`flex-1 py-2 rounded text-xs font-medium transition-colors
              ${mode === 'draw' 
                ? 'bg-amber-800 text-white' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
          >
            ✏️ Draw New
          </button>
        </div>
        
        {mode === 'draw' && (
          <div className="mt-3 p-2 bg-amber-900/30 rounded text-xs border border-amber-800/50">
            <p className="text-amber-400 font-medium">Drawing Mode</p>
            <ul className="text-neutral-300 mt-1 space-y-0.5">
              <li>• Click to place vertices</li>
              <li>• Click green point (or double-click) to close</li>
              <li>• Minimum 3 points required</li>
            </ul>
            {drawingPoints.length > 0 && (
              <div className="mt-2 flex items-center justify-between pt-2 border-t border-amber-800/30">
                <span className="text-amber-300">{drawingPoints.length} point{drawingPoints.length !== 1 ? 's' : ''} placed</span>
                <button
                  onClick={onCancelDrawing}
                  className="text-red-400 hover:text-red-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* New Hotspot Name (shown when drawing has 3+ points) */}
      {mode === 'draw' && drawingPoints.length >= 3 && (
        <div className="p-3 border-b border-neutral-700 bg-green-900/20">
          <label className="text-xs text-neutral-300 block mb-1">Name this hotspot:</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Main Steam Engine"
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-2 text-sm
                      focus:border-green-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="w-full mt-2 bg-green-700 hover:bg-green-600 disabled:bg-neutral-700
                      disabled:text-neutral-500 py-2 rounded text-xs font-medium transition-colors"
          >
            ✓ Save Hotspot
          </button>
        </div>
      )}
      
      {/* Selected Hotspot Details */}
      {mode === 'select' && selectedHotspot && (
        <div className="p-3 border-b border-neutral-700 bg-amber-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-400 font-medium">Selected Hotspot</span>
          </div>
          <div className="bg-neutral-800 rounded p-2">
            <p className="text-neutral-200 font-medium">{selectedHotspot.name_en}</p>
            {selectedHotspot.name_fr && (
              <p className="text-neutral-400 text-xs mt-0.5">{selectedHotspot.name_fr}</p>
            )}
            <p className="text-neutral-600 text-[10px] mt-1 font-mono">
              {selectedHotspot.slug}
            </p>
          </div>
          
          <div className="mt-2 text-[10px] text-neutral-400 space-y-0.5">
            <p>• Drag gold circles to move vertices</p>
            <p>• Click blue dots to add vertices</p>
            <p>• Right-click vertex to delete</p>
          </div>
          
          {selectedHotspot.shape === 'polygon' && (
            <p className="mt-2 text-xs text-neutral-500">
              {(selectedHotspot.bounds as PolygonBounds).points.length} vertices
            </p>
          )}
          
          {/* Delete Button with Confirmation */}
          {confirmDelete === selectedHotspot.id ? (
            <div className="mt-3 p-2 bg-red-900/30 rounded border border-red-800">
              <p className="text-red-300 text-xs mb-2">Delete "{selectedHotspot.name_en}"?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(selectedHotspot.id)}
                  className="flex-1 bg-red-700 hover:bg-red-600 py-1.5 rounded text-xs font-medium"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 bg-neutral-700 hover:bg-neutral-600 py-1.5 rounded text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(selectedHotspot.id)}
              className="w-full mt-3 bg-red-900/50 hover:bg-red-800/50 border border-red-800/50 
                        text-red-300 py-1.5 rounded text-xs font-medium transition-colors"
            >
              🗑️ Delete Hotspot
            </button>
          )}
        </div>
      )}
      
      {/* Hotspot List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-400">
            All Hotspots ({hotspots.length})
          </span>
          {saving && (
            <span className="text-xs text-amber-500 animate-pulse">Saving...</span>
          )}
        </div>
        
        <div className="space-y-1">
          {hotspots.map(h => (
            <button
              key={h.id}
              onClick={() => onSelectHotspot(h.id)}
              className={`w-full text-left px-2 py-2 rounded text-xs transition-colors
                ${selectedId === h.id
                  ? 'bg-amber-900/50 border border-amber-700'
                  : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-neutral-200 font-medium">{h.name_en}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded
                  ${h.viewpoint_position 
                    ? 'bg-green-900/50 text-green-400' 
                    : 'bg-neutral-700 text-neutral-500'}`}
                >
                  {h.viewpoint_position ? '📷 ✓' : 'no cam'}
                </span>
              </div>
              <div className="text-neutral-500 font-mono text-[10px] mt-0.5">
                {h.shape === 'polygon' 
                  ? `${(h.bounds as PolygonBounds).points.length} vertices`
                  : h.shape}
              </div>
            </button>
          ))}
        </div>
        
        {hotspots.length === 0 && !loading && (
          <p className="text-neutral-600 text-xs text-center py-8">
            No hotspots yet.<br />
            Switch to Draw mode to create one.
          </p>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-neutral-700 text-[10px] text-neutral-600">
        {configId ? (
          <span>Config: {configId.slice(0, 8)}...</span>
        ) : (
          <span className="text-red-400">No config loaded</span>
        )}
      </div>
    </div>
  )
}

// ============================================
// Main Component
// IMPORTANT: SplatScene is rendered unconditionally to prevent unmounting
// ============================================
export default function HotspotEditor() {
  // Data from Supabase
  const { config, hotspots, loading, error, saveHotspotBounds } = useSplatData()
  
  // Local UI state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<EditorMode>('select')
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([])
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Local copy of hotspots for optimistic updates
  const [localHotspots, setLocalHotspots] = useState<ParsedSplatHotspot[]>([])
  
  // Sync from loaded data
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
    // Drawing is "complete" - user now needs to enter name in sidebar
    // Points stay visible so user can see what they drew
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
    // Optimistic local update
    setLocalHotspots(prev => prev.map(h => 
      h.id === id ? { ...h, bounds } : h
    ))
    
    // Save to database
    setSaving(true)
    await saveHotspotBounds(id, 'polygon', bounds)
    setSaving(false)
  }
  
  // CRITICAL: Always render SplatScene - never conditionally unmount it
  // Loading/error states are shown in sidebar only
  return (
    <div className="w-screen h-screen bg-black flex">
      {/* Splat Viewer - ALWAYS RENDERED, never unmounted */}
      <div className="flex-1 relative">
        <SplatScene />
        
        {/* SVG Overlay for drawing/editing polygons */}
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
      
      {/* Sidebar - shows loading/error states here instead of blocking splat */}
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
