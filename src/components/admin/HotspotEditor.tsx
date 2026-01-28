/**
 * Hotspot Editor - Polygon Drawing Tool (CORRECTED)
 * 
 * ARCHITECTURE FIX:
 * - PlayCanvas Application is positioned INSIDE the viewport bounds (same as InteractiveViewer)
 * - SVG overlay is positioned inside the SAME container
 * - This ensures coordinates naturally align between splat view and drawn hotspots
 * 
 * COORDINATE SYSTEM:
 * - Stored coordinates are 0-100 percentages in both X and Y
 * - viewBox="0 0 100 100" with preserveAspectRatio="none"
 * - Coordinates map directly: click at 50% -> stored as 50 -> rendered at 50
 * 
 * CIRCLE FIX:
 * - Use <ellipse> with compensated radii to appear circular in stretched SVG
 * - rx = baseRadius / aspectRatio, ry = baseRadius
 */

import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { useSplat } from '@playcanvas/react/hooks'
import { useSplatData } from '../../hooks/useSplatData'
import type { ParsedSplatHotspot, PolygonBounds } from '../../lib/database.types'
import { createHotspot, deleteHotspot } from '../../lib/api/splat'
import { getOverviewViewpoint } from '../../data/viewpoints'

// ============================================
// CONFIGURATION
// ============================================
const SPLAT_URL = '/pump-room.ply'
const INITIAL = getOverviewViewpoint()

const DEFAULT_TARGET_WIDTH = 1920
const DEFAULT_TARGET_HEIGHT = 1080
const FRAME_WIDTH = 24

const DEFAULT_STYLE = {
  fillColor: '#8b7355',
  fillOpacity: 0.12,
  strokeColor: '#c4a574',
  strokeWidth: 0.3,
  selectedFillOpacity: 0.22,
  selectedStrokeColor: '#f59e0b',
  selectedStrokeWidth: 0.5
}

interface Point {
  x: number
  y: number
}

type EditorMode = 'select' | 'draw'

// ============================================
// Viewport Bounds Hook - calculates aspect-ratio-constrained bounds
// Matches InteractiveViewer's approach exactly
// ============================================
interface ViewportBounds {
  left: number
  top: number
  width: number
  height: number
}

function useViewportBounds(
  containerRef: React.RefObject<HTMLDivElement>,
  targetWidth: number,
  targetHeight: number
): ViewportBounds {
  const [bounds, setBounds] = useState<ViewportBounds>({ left: 0, top: 0, width: 0, height: 0 })
  
  useEffect(() => {
    const updateBounds = () => {
      if (!containerRef.current) return
      
      const containerWidth = containerRef.current.clientWidth
      const containerHeight = containerRef.current.clientHeight
      
      const targetAspect = targetWidth / targetHeight
      const containerAspect = containerWidth / containerHeight
      
      let viewportWidth: number
      let viewportHeight: number
      
      if (containerAspect > targetAspect) {
        viewportHeight = containerHeight
        viewportWidth = viewportHeight * targetAspect
      } else {
        viewportWidth = containerWidth
        viewportHeight = viewportWidth / targetAspect
      }
      
      const left = (containerWidth - viewportWidth) / 2
      const top = (containerHeight - viewportHeight) / 2
      
      setBounds({ left, top, width: viewportWidth, height: viewportHeight })
    }
    
    updateBounds()
    
    const observer = new ResizeObserver(updateBounds)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    
    return () => observer.disconnect()
  }, [containerRef, targetWidth, targetHeight])
  
  return bounds
}

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
// Ellipse Helper - renders visually circular shapes in stretched SVG
// ============================================
interface CircleAsEllipseProps {
  cx: number
  cy: number
  r: number
  aspectRatio: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  className?: string
  pointerEvents?: 'none' | 'auto'
  onMouseDown?: (e: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
}

function CircleAsEllipse({
  cx, cy, r, aspectRatio,
  fill, stroke, strokeWidth = 0.1,
  className, pointerEvents,
  onMouseDown, onMouseEnter, onMouseLeave, onClick, onContextMenu
}: CircleAsEllipseProps) {
  // Compensate for SVG stretch: shrink rx to appear circular
  const rx = r / aspectRatio
  const ry = r
  
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      className={className}
      style={{ pointerEvents }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onContextMenu={onContextMenu}
    />
  )
}

// ============================================
// Polygon Shape Renderer
// ============================================
interface PolygonShapeProps {
  points: Point[]
  isSelected: boolean
  style: typeof DEFAULT_STYLE
  aspectRatio: number
  onSelect?: () => void
  onVertexDrag?: (index: number, newPos: Point) => void
  onMidpointClick?: (index: number) => void
  onVertexDelete?: (index: number) => void
}

function PolygonShape({ 
  points, 
  isSelected, 
  style,
  aspectRatio,
  onSelect,
  onVertexDrag,
  onMidpointClick,
  onVertexDelete
}: PolygonShapeProps) {
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null)
  const [hoverVertex, setHoverVertex] = useState<number | null>(null)
  const [hoverMidpoint, setHoverMidpoint] = useState<number | null>(null)
  const svgRef = useRef<SVGGElement>(null)
  
  // NO scaling needed - coordinates are direct 0-100
  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ')
  
  const midpoints = points.map((p, i) => {
    const next = points[(i + 1) % points.length]
    return { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 }
  })
  
  // Check if midpoint too close to any vertex (accounting for aspect ratio in visual space)
  const isMidpointTooCloseToVertex = (midpoint: Point, minDist: number = 4): boolean => {
    for (const p of points) {
      // Visual distance accounting for stretch
      const dx = (midpoint.x - p.x) / aspectRatio
      const dy = midpoint.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) return true
    }
    return false
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
  
  // Visual radii (in viewBox units)
  const VERTEX_R = 1.2
  const VERTEX_HOVER_R = 1.5
  const VERTEX_TOUCH_R = 3.5
  const MID_R = 0.8
  const MID_TOUCH_R = 2.0
  
  const fillOpacity = isSelected ? style.selectedFillOpacity : style.fillOpacity
  const strokeColor = isSelected ? style.selectedStrokeColor : style.strokeColor
  const strokeWidth = isSelected ? style.selectedStrokeWidth : style.strokeWidth
  
  return (
    <g ref={svgRef}>
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
      
      {/* Midpoints (rendered first so vertices are on top) */}
      {isSelected && points.length >= 3 && midpoints.map((p, i) => {
        if (isMidpointTooCloseToVertex(p)) return null
        
        return (
          <g key={`m-${i}`}>
            {/* Touch target */}
            <CircleAsEllipse
              cx={p.x}
              cy={p.y}
              r={MID_TOUCH_R}
              aspectRatio={aspectRatio}
              fill="transparent"
              className="cursor-cell"
              pointerEvents="auto"
              onClick={(e) => {
                e.stopPropagation()
                onMidpointClick?.(i)
              }}
              onMouseEnter={() => setHoverMidpoint(i)}
              onMouseLeave={() => setHoverMidpoint(null)}
            />
            {/* Visual */}
            <CircleAsEllipse
              cx={p.x}
              cy={p.y}
              r={hoverMidpoint === i ? MID_R * 1.3 : MID_R}
              aspectRatio={aspectRatio}
              fill={hoverMidpoint === i ? '#60a5fa' : 'rgba(96, 165, 250, 0.5)'}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={0.15}
              pointerEvents="none"
            />
          </g>
        )
      })}
      
      {/* Vertices (on top) */}
      {isSelected && points.map((p, i) => (
        <g key={`v-${i}`}>
          {/* Touch target */}
          <CircleAsEllipse
            cx={p.x}
            cy={p.y}
            r={VERTEX_TOUCH_R}
            aspectRatio={aspectRatio}
            fill="transparent"
            className="cursor-move"
            pointerEvents="auto"
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
          {/* Visual */}
          <CircleAsEllipse
            cx={p.x}
            cy={p.y}
            r={hoverVertex === i || draggingVertex === i ? VERTEX_HOVER_R : VERTEX_R}
            aspectRatio={aspectRatio}
            fill={draggingVertex === i ? '#fff' : hoverVertex === i ? '#fbbf24' : '#f59e0b'}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={0.15}
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
function DrawingPolygon({ points, mousePos, style, aspectRatio }: { 
  points: Point[]
  mousePos: Point | null
  style: typeof DEFAULT_STYLE
  aspectRatio: number
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
        strokeDasharray="1.5,0.75"
      />
      
      {/* Close preview line */}
      {points.length >= 2 && mousePos && (
        <line
          x1={mousePos.x} y1={mousePos.y}
          x2={points[0].x} y2={points[0].y}
          stroke={style.selectedStrokeColor}
          strokeWidth={0.3}
          strokeDasharray="1,1"
          opacity={0.4}
        />
      )}
      
      {/* Vertices */}
      {points.map((p, i) => (
        <CircleAsEllipse
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === 0 && points.length >= 3 ? 1.8 : 1.2}
          aspectRatio={aspectRatio}
          fill={i === 0 ? '#22c55e' : '#f59e0b'}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth={0.15}
        />
      ))}
      
      {/* Close zone indicator */}
      {points.length >= 3 && (
        <CircleAsEllipse
          cx={points[0].x}
          cy={points[0].y}
          r={3.0}
          aspectRatio={aspectRatio}
          fill="none"
          stroke="#22c55e"
          strokeWidth={0.2}
        />
      )}
    </g>
  )
}

// ============================================
// SVG Overlay (positioned inside viewport bounds)
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
  aspectRatio: number
}

function HotspotSvgOverlay({
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
  style,
  aspectRatio
}: OverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  
  // Simple 0-100 in both axes
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
        // Distance check (visual space, accounting for aspect ratio)
        const dx = (pos.x - first.x) / aspectRatio
        const dy = pos.y - first.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 5) {
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
    if (!bounds?.points) return
    
    const newPoints = [...bounds.points]
    newPoints[vertexIndex] = newPos
    onUpdateBounds(hotspotId, { points: newPoints })
  }
  
  const handleMidpointClick = (hotspotId: string, midpointIndex: number) => {
    const hotspot = hotspots.find(h => h.id === hotspotId)
    if (!hotspot || hotspot.shape !== 'polygon') return
    
    const bounds = hotspot.bounds as PolygonBounds
    if (!bounds?.points) return
    
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
    if (!bounds?.points || bounds.points.length <= 3) return
    
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
        if (!bounds?.points) return null
        return (
          <PolygonShape
            key={hotspot.id}
            points={bounds.points}
            isSelected={selectedId === hotspot.id}
            style={style}
            aspectRatio={aspectRatio}
            onSelect={() => onSelectHotspot(hotspot.id)}
            onVertexDrag={(i, pos) => handleVertexDrag(hotspot.id, i, pos)}
            onMidpointClick={(i) => handleMidpointClick(hotspot.id, i)}
            onVertexDelete={(i) => handleVertexDelete(hotspot.id, i)}
          />
        )
      })}
      
      {mode === 'draw' && (
        <DrawingPolygon 
          points={drawingPoints} 
          mousePos={mousePos} 
          style={style} 
          aspectRatio={aspectRatio}
        />
      )}
    </svg>
  )
}

// ============================================
// Style Editor
// ============================================
function StyleEditor({ style, onChange }: { 
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
          min="0" max="40"
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
          min="10" max="100"
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
// Frame Overlay - visual frame around viewport
// ============================================
function FrameOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top edge */}
      <div 
        className="absolute top-0 left-0 right-0"
        style={{
          height: FRAME_WIDTH,
          background: 'linear-gradient(to bottom, #2c2824 0%, #1f1c1a 100%)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.5)',
        }}
      />
      {/* Bottom edge */}
      <div 
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: FRAME_WIDTH,
          background: 'linear-gradient(to top, #2c2824 0%, #1f1c1a 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.1)',
        }}
      />
      {/* Left edge */}
      <div 
        className="absolute left-0"
        style={{
          top: FRAME_WIDTH,
          bottom: FRAME_WIDTH,
          width: FRAME_WIDTH,
          background: 'linear-gradient(to right, #2c2824 0%, #1f1c1a 100%)',
          boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.1), inset -2px 0 4px rgba(0,0,0,0.5)',
        }}
      />
      {/* Right edge */}
      <div 
        className="absolute right-0"
        style={{
          top: FRAME_WIDTH,
          bottom: FRAME_WIDTH,
          width: FRAME_WIDTH,
          background: 'linear-gradient(to left, #2c2824 0%, #1f1c1a 100%)',
          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.5), inset -2px 0 4px rgba(255,255,255,0.1)',
        }}
      />
      {/* Inner shadow */}
      <div 
        className="absolute"
        style={{
          top: FRAME_WIDTH,
          left: FRAME_WIDTH,
          right: FRAME_WIDTH,
          bottom: FRAME_WIDTH,
          boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.7), inset 6px 0 20px rgba(0,0,0,0.5), inset -6px 0 20px rgba(0,0,0,0.5), inset 0 -6px 20px rgba(0,0,0,0.7)',
        }}
      />
    </div>
  )
}

// ============================================
// Main Component
// ============================================
export default function HotspotEditor() {
  const viewportContainerRef = useRef<HTMLDivElement>(null)
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
  
  const targetWidth = config?.target_width || DEFAULT_TARGET_WIDTH
  const targetHeight = config?.target_height || DEFAULT_TARGET_HEIGHT
  const aspectRatio = targetWidth / targetHeight
  
  // Calculate viewport bounds within the main area (excluding sidebar)
  const bounds = useViewportBounds(viewportContainerRef, targetWidth, targetHeight)
  
  const saveTimeoutRef = useRef<number>()
  
  useEffect(() => {
    setLocalHotspots(hotspots ?? [])
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
      order_index: localHotspots?.length ?? 0,
      active: true
    })
    
    if (newHotspot) {
      setLocalHotspots(prev => [...(prev ?? []), newHotspot])
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
      setLocalHotspots(prev => (prev ?? []).filter(h => h.id !== id))
      setSelectedId(null)
    }
    setSaving(false)
  }
  
  const handleUpdateBounds = (id: string, newBounds: PolygonBounds) => {
    setLocalHotspots(prev => (prev ?? []).map(h => h.id === id ? { ...h, bounds: newBounds } : h))
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(async () => {
      setSaving(true)
      await saveHotspotBounds(id, 'polygon', newBounds)
      setSaving(false)
    }, 400)
  }
  
  const handleCreate = () => {
    if (newName.trim()) {
      handleCreateHotspot(newName.trim())
      setNewName('')
    }
  }
  
  const selectedHotspot = localHotspots?.find(h => h.id === selectedId)
  
  // Inner viewport (inside frame)
  const innerWidth = bounds.width > 0 ? bounds.width - FRAME_WIDTH * 2 : 0
  const innerHeight = bounds.height > 0 ? bounds.height - FRAME_WIDTH * 2 : 0
  
  return (
    <div className="w-screen h-screen bg-black flex">
      {/* Main viewport area */}
      <div ref={viewportContainerRef} className="flex-1 relative">
        {/* Letterbox/pillarbox black areas */}
        {bounds.width > 0 && (
          <>
            {bounds.top > 0 && (
              <>
                <div className="absolute left-0 right-0 top-0 bg-black" style={{ height: bounds.top }} />
                <div className="absolute left-0 right-0 bottom-0 bg-black" style={{ height: bounds.top }} />
              </>
            )}
            {bounds.left > 0 && (
              <>
                <div className="absolute left-0 bg-black" style={{ top: bounds.top, width: bounds.left, height: bounds.height }} />
                <div className="absolute right-0 bg-black" style={{ top: bounds.top, width: bounds.left, height: bounds.height }} />
              </>
            )}
          </>
        )}
        
        {/* Viewport container - both PlayCanvas and SVG go inside here */}
        {bounds.width > 0 && innerWidth > 0 && (
          <div 
            className="absolute"
            style={{
              left: bounds.left + FRAME_WIDTH,
              top: bounds.top + FRAME_WIDTH,
              width: innerWidth,
              height: innerHeight
            }}
          >
            {/* PlayCanvas Application - fills this container */}
            <Application graphicsDeviceOptions={{ antialias: false }}>
              <Entity name="camera" position={INITIAL.position} rotation={INITIAL.rotation}>
                <Camera clearColor="#1a1a2e" fov={INITIAL.fov || 60} farClip={1000} nearClip={0.01} />
              </Entity>
              <PumpRoomSplat src={SPLAT_URL} />
            </Application>
            
            {/* SVG Overlay - same container, coordinates naturally align */}
            <HotspotSvgOverlay
              hotspots={(localHotspots ?? []).filter(h => h.shape === 'polygon')}
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
              aspectRatio={aspectRatio}
            />
          </div>
        )}
        
        {/* Frame overlay - positioned within viewport bounds */}
        {bounds.width > 0 && (
          <div 
            className="absolute pointer-events-none"
            style={{
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height
            }}
          >
            <FrameOverlay />
            
            {/* Dimension label */}
            <div 
              className="absolute text-[10px] px-2 py-0.5 rounded"
              style={{ 
                left: 32, 
                top: 32,
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'rgba(139, 115, 71, 0.8)'
              }}
            >
              {targetWidth}×{targetHeight} viewport
            </div>
          </div>
        )}
      </div>
      
      {/* Sidebar - outside viewport container, no overflow issues */}
      <div className="w-64 bg-neutral-900 text-white text-sm flex flex-col border-l border-neutral-800">
        {/* Header */}
        <div className="p-3 border-b border-neutral-700">
          <Link to="/admin" className="text-amber-600 hover:text-amber-500 text-xs">
            ← Back to Admin
          </Link>
          <h1 className="text-sm font-medium text-neutral-200 mt-1">Hotspot Editor</h1>
        </div>
        
        {loading && <div className="p-3 bg-neutral-800 text-neutral-400 text-xs">Loading...</div>}
        {error && <div className="p-3 bg-red-900/30 text-red-400 text-xs">{error}</div>}
        
        {/* Mode Toggle */}
        <div className="p-3 border-b border-neutral-700">
          <div className="flex gap-1">
            <button
              onClick={() => handleSetMode('select')}
              className={`flex-1 py-1.5 rounded text-xs font-medium ${mode === 'select' ? 'bg-amber-700 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
            >
              Select
            </button>
            <button
              onClick={() => handleSetMode('draw')}
              className={`flex-1 py-1.5 rounded text-xs font-medium ${mode === 'draw' ? 'bg-amber-700 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
            >
              Draw
            </button>
          </div>
          
          {mode === 'draw' && (
            <div className="mt-2 text-[10px] text-neutral-500">
              Click to place vertices. Click first point or double-click to close.
              {drawingPoints.length > 0 && (
                <div className="mt-1 flex items-center justify-between text-neutral-400">
                  <span>{drawingPoints.length} points</span>
                  <button onClick={() => setDrawingPoints([])} className="text-red-400 hover:text-red-300">Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Save new hotspot */}
        {mode === 'draw' && drawingPoints.length >= 3 && (
          <div className="p-3 border-b border-neutral-700 bg-green-900/20">
            <p className="text-[10px] text-green-400 mb-2">Ready to save ({drawingPoints.length} points)</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Hotspot name..."
              className="w-full bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-xs focus:border-green-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="w-full mt-2 bg-green-700 hover:bg-green-600 disabled:bg-neutral-700 disabled:text-neutral-500 py-1.5 rounded text-xs font-medium"
            >
              Save Hotspot
            </button>
          </div>
        )}
        
        {/* Selected hotspot info */}
        {mode === 'select' && selectedHotspot && (
          <div className="p-3 border-b border-neutral-700 bg-amber-900/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-400">{selectedHotspot.name_en}</span>
              <span className="text-[9px] text-neutral-600">
                {(selectedHotspot.bounds as PolygonBounds)?.points?.length ?? 0} vertices
              </span>
            </div>
            <p className="text-[9px] text-neutral-500 mt-1">
              Drag vertices • Click edge to add • Right-click to delete
            </p>
            
            {confirmDelete === selectedHotspot.id ? (
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => { handleDeleteHotspot(selectedHotspot.id); setConfirmDelete(null) }} 
                  className="flex-1 bg-red-700 py-1 rounded text-[10px]"
                >
                  Confirm Delete
                </button>
                <button 
                  onClick={() => setConfirmDelete(null)} 
                  className="flex-1 bg-neutral-700 py-1 rounded text-[10px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-3 mt-2 text-[10px]">
                <button onClick={() => setConfirmDelete(selectedHotspot.id)} className="text-red-400 hover:text-red-300">Delete</button>
                <button onClick={() => setSelectedId(null)} className="text-neutral-500 hover:text-neutral-400">Deselect</button>
              </div>
            )}
          </div>
        )}
        
        {/* Style editor */}
        <div className="p-3 border-b border-neutral-700">
          <button onClick={() => setShowStyle(!showStyle)} className="text-[10px] text-neutral-500 hover:text-neutral-400 flex items-center gap-1">
            <span>{showStyle ? '▼' : '▶'}</span>
            <span>Polygon Style</span>
          </button>
          {showStyle && (
            <div className="mt-2">
              <StyleEditor style={style} onChange={setStyle} />
            </div>
          )}
        </div>
        
        {/* Hotspot list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-neutral-600 font-medium">HOTSPOTS ({localHotspots?.length ?? 0})</span>
            {saving && <span className="text-[9px] text-amber-500">Saving...</span>}
          </div>
          
          <div className="space-y-0.5">
            {(localHotspots ?? []).map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedId(h.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs ${selectedId === h.id ? 'bg-amber-900/40 text-amber-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
              >
                <div className="flex items-center justify-between">
                  <span>{h.name_en}</span>
                  <div className="flex items-center gap-1">
                    {h.viewpoint_position && <span className="text-[9px] text-green-500" title="Has viewpoint">📷</span>}
                    <span className="text-[9px] text-neutral-600">{(h.bounds as PolygonBounds)?.points?.length ?? 0}pt</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {(localHotspots?.length ?? 0) === 0 && !loading && (
            <p className="text-neutral-600 text-[10px] text-center py-4">No hotspots yet. Switch to Draw mode to create one.</p>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-2 border-t border-neutral-800 text-[9px] text-neutral-700">
          {config?.id ? `Config: ${config.id.slice(0,8)}...` : <span className="text-red-400">No config loaded</span>}
        </div>
      </div>
    </div>
  )
}
