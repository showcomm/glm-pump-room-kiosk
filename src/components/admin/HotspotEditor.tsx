/**
 * Hotspot Editor - Polygon Drawing Tool
 * 
 * CRITICAL ARCHITECTURAL PATTERN:
 * Main component must be STATELESS - just like CameraCapture.
 * All state lives in the Sidebar/Editor component.
 * SplatViewer renders independently, unaffected by state changes.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { useSplat } from '@playcanvas/react/hooks'
import { useSplatData } from '../../hooks/useSplatData'
import type { ParsedSplatHotspot, PolygonBounds, SplatConfig } from '../../lib/database.types'
import { createHotspot, deleteHotspot } from '../../lib/api/splat'
import { getOverviewViewpoint } from '../../data/viewpoints'

// ============================================
// CONFIGURATION - Module level constants
// ============================================
const SPLAT_URL = '/pump-room.ply'
const INITIAL = getOverviewViewpoint()

// Default polygon styling
const DEFAULT_STYLE = {
  fillColor: '#8b7355',
  fillOpacity: 0.12,
  strokeColor: '#c4a574',
  strokeWidth: 0.2,
  selectedFillOpacity: 0.22,
  selectedStrokeColor: '#f59e0b',
  selectedStrokeWidth: 0.35
}

interface Point {
  x: number
  y: number
}

type EditorMode = 'select' | 'draw'

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
// Splat Viewer - STATELESS, renders immediately
// Static camera (no orbit controls) to match visitor experience
// ============================================
function SplatViewer() {
  return (
    <Application graphicsDeviceOptions={{ antialias: false }}>
      <Entity name="camera" position={INITIAL.position} rotation={INITIAL.rotation}>
        <Camera clearColor="#1a1a2e" fov={INITIAL.fov || 60} farClip={1000} nearClip={0.01} />
      </Entity>
      <PumpRoomSplat src={SPLAT_URL} />
    </Application>
  )
}

// ============================================
// Polygon Shape Renderer
// ============================================
interface PolygonShapeProps {
  points: Point[]
  isSelected: boolean
  style: typeof DEFAULT_STYLE
  onSelect?: () => void
  onVertexDrag?: (index: number, newPos: Point) => void
  onMidpointClick?: (index: number) => void
  onVertexDelete?: (index: number) => void
}

function PolygonShape({ 
  points, 
  isSelected, 
  style,
  onSelect,
  onVertexDrag,
  onMidpointClick,
  onVertexDelete
}: PolygonShapeProps) {
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null)
  const [hoverVertex, setHoverVertex] = useState<number | null>(null)
  const [hoverMidpoint, setHoverMidpoint] = useState<number | null>(null)
  const svgRef = useRef<SVGGElement>(null)
  
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ')
  
  const midpoints = points.map((p, i) => {
    const next = points[(i + 1) % points.length]
    return { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 }
  })
  
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
  
  // Small, elegant handles
  const VERTEX_R = 0.5
  const VERTEX_HOVER_R = 0.7
  const TOUCH_R = 1.8
  const MID_R = 0.35
  const MID_TOUCH_R = 1.4
  
  const fillOpacity = isSelected ? style.selectedFillOpacity : style.fillOpacity
  const strokeColor = isSelected ? style.selectedStrokeColor : style.strokeColor
  const strokeWidth = isSelected ? style.selectedStrokeWidth : style.strokeWidth
  
  return (
    <g ref={svgRef}>
      {/* Polygon fill */}
      <polygon
        points={pointsStr}
        fill={style.fillColor}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.()
        }}
      />
      
      {/* Vertices - only when selected */}
      {isSelected && points.map((p, i) => (
        <g key={`v-${i}`}>
          {/* Touch target */}
          <circle
            cx={p.x}
            cy={p.y}
            r={TOUCH_R}
            fill="transparent"
            className="cursor-move"
            onMouseDown={(e) => {
              if (e.button === 2) {
                e.preventDefault()
                if (points.length > 3) onVertexDelete?.(i)
                return
              }
              e.stopPropagation()
              setDraggingVertex(i)
            }}
            onMouseEnter={() => setHoverVertex(i)}
            onMouseLeave={() => setHoverVertex(null)}
            onContextMenu={(e) => e.preventDefault()}
          />
          {/* Visible dot */}
          <circle
            cx={p.x}
            cy={p.y}
            r={hoverVertex === i || draggingVertex === i ? VERTEX_HOVER_R : VERTEX_R}
            fill={draggingVertex === i ? '#fff' : hoverVertex === i ? '#fbbf24' : '#f59e0b'}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={0.08}
            pointerEvents="none"
          />
        </g>
      ))}
      
      {/* Midpoints - for adding vertices */}
      {isSelected && points.length >= 3 && midpoints.map((p, i) => (
        <g key={`m-${i}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r={MID_TOUCH_R}
            fill="transparent"
            className="cursor-crosshair"
            onClick={(e) => {
              e.stopPropagation()
              onMidpointClick?.(i)
            }}
            onMouseEnter={() => setHoverMidpoint(i)}
            onMouseLeave={() => setHoverMidpoint(null)}
          />
          <circle
            cx={p.x}
            cy={p.y}
            r={hoverMidpoint === i ? MID_R * 1.4 : MID_R}
            fill={hoverMidpoint === i ? '#60a5fa' : 'rgba(96, 165, 250, 0.35)'}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={0.05}
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
function DrawingPolygon({ points, mousePos, style }: { 
  points: Point[]
  mousePos: Point | null
  style: typeof DEFAULT_STYLE 
}) {
  if (points.length === 0) return null
  
  const allPoints = mousePos ? [...points, mousePos] : points
  const pointsStr = allPoints.map(p => `${p.x},${p.y}`).join(' ')
  
  return (
    <g>
      <polyline
        points={pointsStr}
        fill="none"
        stroke={style.selectedStrokeColor}
        strokeWidth={style.selectedStrokeWidth}
        strokeDasharray="0.6,0.3"
      />
      
      {points.length >= 2 && mousePos && (
        <line
          x1={mousePos.x} y1={mousePos.y}
          x2={points[0].x} y2={points[0].y}
          stroke={style.selectedStrokeColor}
          strokeWidth={0.15}
          strokeDasharray="0.3,0.3"
          opacity={0.4}
        />
      )}
      
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === 0 && points.length >= 3 ? 0.8 : 0.5}
          fill={i === 0 ? '#22c55e' : '#f59e0b'}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={0.08}
        />
      ))}
      
      {points.length >= 3 && (
        <circle
          cx={points[0].x}
          cy={points[0].y}
          r={1.4}
          fill="none"
          stroke="#22c55e"
          strokeWidth={0.12}
          strokeDasharray="0.4,0.2"
          opacity={0.5}
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
  style: typeof DEFAULT_STYLE
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
  onMouseMove,
  style
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
      if (drawingPoints.length >= 3) {
        const first = drawingPoints[0]
        const dist = Math.sqrt((pos.x - first.x) ** 2 + (pos.y - first.y) ** 2)
        if (dist < 2.5) {
          onCompleteDrawing()
          return
        }
      }
      onAddDrawingPoint(pos)
    }
  }
  
  const handleDoubleClick = () => {
    if (mode === 'draw' && drawingPoints.length >= 3) {
      onCompleteDrawing()
    }
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
      onMouseMove={(e) => onMouseMove(getMousePosition(e))}
      onContextMenu={(e) => e.preventDefault()}
    >
      {hotspots.map(hotspot => {
        if (hotspot.shape !== 'polygon') return null
        const bounds = hotspot.bounds as PolygonBounds
        return (
          <PolygonShape
            key={hotspot.id}
            points={bounds.points}
            isSelected={selectedId === hotspot.id}
            style={style}
            onSelect={() => onSelectHotspot(hotspot.id)}
            onVertexDrag={(i, pos) => handleVertexDrag(hotspot.id, i, pos)}
            onMidpointClick={(i) => handleMidpointClick(hotspot.id, i)}
            onVertexDelete={(i) => handleVertexDelete(hotspot.id, i)}
          />
        )
      })}
      
      {mode === 'draw' && (
        <DrawingPolygon points={drawingPoints} mousePos={mousePos} style={style} />
      )}
    </svg>
  )
}

// ============================================
// Style Editor
// ============================================
function StyleEditor({ 
  style, 
  onChange 
}: { 
  style: typeof DEFAULT_STYLE
  onChange: (style: typeof DEFAULT_STYLE) => void 
}) {
  return (
    <div className="space-y-2 text-[10px]">
      <div className="flex items-center gap-2">
        <label className="text-neutral-500 w-12">Fill</label>
        <input
          type="color"
          value={style.fillColor}
          onChange={(e) => onChange({ ...style, fillColor: e.target.value })}
          className="w-5 h-5 rounded border border-neutral-600 bg-transparent cursor-pointer"
        />
        <input
          type="range"
          min="0"
          max="40"
          value={style.fillOpacity * 100}
          onChange={(e) => onChange({ ...style, fillOpacity: Number(e.target.value) / 100 })}
          className="flex-1 h-1 accent-amber-600"
        />
        <span className="text-neutral-500 w-6 text-right">{Math.round(style.fillOpacity * 100)}%</span>
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-neutral-500 w-12">Stroke</label>
        <input
          type="color"
          value={style.strokeColor}
          onChange={(e) => onChange({ ...style, strokeColor: e.target.value })}
          className="w-5 h-5 rounded border border-neutral-600 bg-transparent cursor-pointer"
        />
        <input
          type="range"
          min="5"
          max="80"
          value={style.strokeWidth * 100}
          onChange={(e) => onChange({ ...style, strokeWidth: Number(e.target.value) / 100 })}
          className="flex-1 h-1 accent-amber-600"
        />
        <span className="text-neutral-500 w-6 text-right">{style.strokeWidth.toFixed(1)}</span>
      </div>
    </div>
  )
}

// ============================================
// Editor Panel - ALL STATE LIVES HERE
// ============================================
function EditorPanel() {
  const { config, hotspots, loading, error, saveHotspotBounds } = useSplatData()
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<EditorMode>('select')
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([])
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [saving, setSaving] = useState(false)
  const [style, setStyle] = useState(DEFAULT_STYLE)
  const [localHotspots, setLocalHotspots] = useState<ParsedSplatHotspot[]>([])
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showStyle, setShowStyle] = useState(false)
  
  // Debounce ref
  const saveTimeoutRef = useRef<number>()
  
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
  
  // Debounced save
  const handleUpdateBounds = (id: string, bounds: PolygonBounds) => {
    // Optimistic update
    setLocalHotspots(prev => prev.map(h => h.id === id ? { ...h, bounds } : h))
    
    // Debounce DB save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(async () => {
      setSaving(true)
      await saveHotspotBounds(id, 'polygon', bounds)
      setSaving(false)
    }, 400)
  }
  
  const handleCreate = () => {
    if (newName.trim()) {
      handleCreateHotspot(newName.trim())
      setNewName('')
    }
  }
  
  const selectedHotspot = localHotspots.find(h => h.id === selectedId)
  
  return (
    <>
      {/* Overlay on top of splat viewer */}
      <div className="absolute inset-0 pointer-events-auto">
        <Overlay
          hotspots={localHotspots.filter(h => h.shape === 'polygon')}
          selectedId={selectedId}
          onSelectHotspot={handleSelectHotspot}
          onUpdateBounds={handleUpdateBounds}
          mode={mode}
          drawingPoints={drawingPoints}
          onAddDrawingPoint={(p) => setDrawingPoints(prev => [...prev, p])}
          onCompleteDrawing={() => {}}
          mousePos={mousePos}
          onMouseMove={setMousePos}
          style={style}
        />
      </div>
      
      {/* Sidebar */}
      <div className="w-64 bg-neutral-900 text-white text-sm flex flex-col relative z-10">
        {/* Header */}
        <div className="p-2 border-b border-neutral-700">
          <Link to="/admin" className="text-amber-600 hover:text-amber-500 text-[10px]">
            ← Admin
          </Link>
          <h1 className="text-sm font-medium text-neutral-200 mt-0.5">Hotspot Editor</h1>
          <p className="text-[9px] text-neutral-600 mt-0.5">
            Static view matches visitor kiosk
          </p>
        </div>
        
        {loading && <div className="p-2 bg-neutral-800 text-neutral-400 text-[10px]">Loading...</div>}
        {error && <div className="p-2 bg-red-900/30 text-red-400 text-[10px]">{error}</div>}
        
        {/* Mode Toggle */}
        <div className="p-2 border-b border-neutral-700">
          <div className="flex gap-1">
            <button
              onClick={() => handleSetMode('select')}
              className={`flex-1 py-1 rounded text-[11px] ${mode === 'select' ? 'bg-amber-800 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
            >
              Select
            </button>
            <button
              onClick={() => handleSetMode('draw')}
              className={`flex-1 py-1 rounded text-[11px] ${mode === 'draw' ? 'bg-amber-800 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
            >
              Draw
            </button>
          </div>
          
          {mode === 'draw' && (
            <div className="mt-1.5 text-[10px] text-neutral-500">
              Click to place. Double-click to close.
              {drawingPoints.length > 0 && (
                <span className="ml-2 text-neutral-400">
                  {drawingPoints.length} pts
                  <button onClick={() => setDrawingPoints([])} className="ml-2 text-red-400 hover:text-red-300">Cancel</button>
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Save new */}
        {mode === 'draw' && drawingPoints.length >= 3 && (
          <div className="p-2 border-b border-neutral-700 bg-green-900/20">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name..."
              className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-[11px] focus:border-green-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="w-full mt-1 bg-green-700 hover:bg-green-600 disabled:bg-neutral-700 disabled:text-neutral-500 py-1 rounded text-[11px]"
            >
              Save
            </button>
          </div>
        )}
        
        {/* Selected */}
        {mode === 'select' && selectedHotspot && (
          <div className="p-2 border-b border-neutral-700 bg-amber-900/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-400">{selectedHotspot.name_en}</span>
              <span className="text-[9px] text-neutral-600">
                {(selectedHotspot.bounds as PolygonBounds).points.length} pts
              </span>
            </div>
            <p className="text-[9px] text-neutral-600 mt-1">Drag • Click edge to add • Right-click to delete</p>
            
            {confirmDelete === selectedHotspot.id ? (
              <div className="flex gap-1 mt-1.5">
                <button onClick={() => { handleDeleteHotspot(selectedHotspot.id); setConfirmDelete(null) }} className="flex-1 bg-red-700 py-0.5 rounded text-[10px]">Delete</button>
                <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-neutral-700 py-0.5 rounded text-[10px]">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2 mt-1.5 text-[10px]">
                <button onClick={() => setConfirmDelete(selectedHotspot.id)} className="text-red-400 hover:text-red-300">Delete</button>
                <button onClick={() => setSelectedId(null)} className="text-neutral-500 hover:text-neutral-400">Deselect</button>
              </div>
            )}
          </div>
        )}
        
        {/* Style */}
        <div className="p-2 border-b border-neutral-700">
          <button onClick={() => setShowStyle(!showStyle)} className="text-[10px] text-neutral-500 hover:text-neutral-400">
            {showStyle ? '▼' : '▶'} Style
          </button>
          {showStyle && <div className="mt-1.5"><StyleEditor style={style} onChange={setStyle} /></div>}
        </div>
        
        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-neutral-600">HOTSPOTS ({localHotspots.length})</span>
            {saving && <span className="text-[9px] text-amber-500">Saving...</span>}
          </div>
          
          <div className="space-y-0.5">
            {localHotspots.map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedId(h.id)}
                className={`w-full text-left px-1.5 py-1 rounded text-[11px] ${selectedId === h.id ? 'bg-amber-900/40 text-amber-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
              >
                <div className="flex items-center justify-between">
                  <span>{h.name_en}</span>
                  {h.viewpoint_position && <span className="text-[9px] text-green-500">📷</span>}
                </div>
              </button>
            ))}
          </div>
          
          {localHotspots.length === 0 && !loading && (
            <p className="text-neutral-600 text-[10px] text-center py-3">No hotspots</p>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-2 border-t border-neutral-800 text-[9px] text-neutral-700">
          <div>{config?.id ? `Config: ${config.id.slice(0,8)}` : <span className="text-red-400">No config</span>}</div>
        </div>
      </div>
    </>
  )
}

// ============================================
// Main Component - STATELESS! Just layout.
// ============================================
export default function HotspotEditor() {
  return (
    <div className="w-screen h-screen bg-black flex">
      {/* Viewer area - left side, contains splat */}
      <div className="flex-1 relative">
        <SplatViewer />
        {/* EditorPanel renders overlay + sidebar */}
        <EditorPanel />
      </div>
    </div>
  )
}
