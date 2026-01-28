/**
 * Hotspot Editor - Polygon Drawing Tool
 * 
 * CRITICAL PLAYCANVAS RULE:
 * PlayCanvas components BREAK if their parent re-renders.
 * Solution: Isolate the Application in a component with ZERO changing props/state.
 * The SplatViewer component below is completely static - it never re-renders.
 * 
 * SELECTION MODEL:
 * - Sidebar is the PRIMARY way to select hotspots for editing
 * - Canvas clicks do NOT select polygons (prevents accidental selection when editing nearby shapes)
 * - Only sidebar selection shows vertex handles
 * 
 * COORDINATE SYSTEM:
 * - Stored coordinates are 0-100 percentages in both X and Y
 * - viewBox="0 0 100 100" with preserveAspectRatio="none"
 * - Because the SVG stretches to fit 1920x1080, we need to compensate for aspect ratio
 *   when calculating distances (multiply dx by aspectRatio, not divide)
 */

import React, { useState, useEffect, useRef, memo, useCallback } from 'react'
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
  fillOpacity: 0.15,
  strokeColor: '#c4a574',
  strokeWidth: 0.4
}

type HotspotStyle = typeof DEFAULT_STYLE

interface Point {
  x: number
  y: number
}

type EditorMode = 'select' | 'draw'

interface ViewportBounds {
  left: number
  top: number
  width: number
  height: number
}

// ============================================
// Splat Component - static, no props that change
// ============================================
function PumpRoomSplat() {
  const { asset, loading, error } = useSplat(SPLAT_URL)
  if (error || loading || !asset) return null
  return (
    <Entity position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <GSplat asset={asset} />
    </Entity>
  )
}

// ============================================
// Static Scene - no props, no state, never re-renders
// ============================================
function StaticScene() {
  return (
    <>
      <Entity name="camera" position={INITIAL.position} rotation={INITIAL.rotation}>
        <Camera clearColor="#1a1a2e" fov={INITIAL.fov || 60} farClip={1000} nearClip={0.01} />
      </Entity>
      <PumpRoomSplat />
    </>
  )
}

// ============================================
// SplatViewer - COMPLETELY ISOLATED from all state
// ============================================
const SplatViewer = memo(function SplatViewer() {
  return (
    <Application graphicsDeviceOptions={{ antialias: false }}>
      <StaticScene />
    </Application>
  )
})

// ============================================
// SVG Filter Definitions for Glow Effect
// ============================================
function SvgFilters() {
  return (
    <defs>
      {/* Soft glow filter - creates a blurred shadow behind strokes */}
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      
      {/* Stronger glow for selected state */}
      <filter id="glow-selected" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      
      {/* Drop shadow for depth */}
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0.1" dy="0.1" stdDeviation="0.5" floodColor="#000" floodOpacity="0.5" />
      </filter>
    </defs>
  )
}

// ============================================
// Ellipse Helper
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
  const rx = r / aspectRatio
  const ry = r
  
  return (
    <ellipse
      cx={cx} cy={cy} rx={rx} ry={ry}
      fill={fill} stroke={stroke} strokeWidth={strokeWidth}
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
// Helper: Calculate visual distance between two points
// Accounts for SVG stretching due to preserveAspectRatio="none"
// ============================================
function visualDistance(p1: Point, p2: Point, aspectRatio: number): number {
  // The SVG viewBox is 100x100 but stretched to fit the container (e.g. 1920x1080)
  // To get equal visual distance in all directions, multiply dx by aspectRatio
  const dx = (p2.x - p1.x) * aspectRatio
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

// ============================================
// Helper: Darken a hex color
// ============================================
function darkenColor(hex: string, factor: number = 0.4): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
}

// ============================================
// Helper: Lighten a hex color
// ============================================
function lightenColor(hex: string, factor: number = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * factor))}, ${Math.min(255, Math.round(g + (255 - g) * factor))}, ${Math.min(255, Math.round(b + (255 - b) * factor))})`
}

// ============================================
// Polygon Shape Renderer
// ============================================
interface PolygonShapeProps {
  points: Point[]
  isSelected: boolean
  style: HotspotStyle
  aspectRatio: number
  onVertexDrag?: (index: number, newPos: Point) => void
  onMidpointClick?: (index: number) => void
  onVertexDelete?: (index: number) => void
}

function PolygonShape({ 
  points, isSelected, style, aspectRatio,
  onVertexDrag, onMidpointClick, onVertexDelete
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
  
  const isMidpointTooCloseToVertex = (midpoint: Point, minDist: number = 4): boolean => {
    for (const p of points) {
      if (visualDistance(midpoint, p, aspectRatio) < minDist) return true
    }
    return false
  }
  
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
  
  const VERTEX_R = 1.2, VERTEX_HOVER_R = 1.5, VERTEX_TOUCH_R = 3.5
  const MID_R = 0.8, MID_TOUCH_R = 2.0
  
  // Style calculations
  const fillOpacity = isSelected ? Math.min(style.fillOpacity * 2, 0.4) : style.fillOpacity
  const mainStrokeColor = isSelected ? '#f59e0b' : style.strokeColor
  const shadowStrokeColor = isSelected ? darkenColor('#f59e0b', 0.3) : darkenColor(style.strokeColor, 0.3)
  const highlightStrokeColor = isSelected ? lightenColor('#f59e0b', 0.4) : lightenColor(style.strokeColor, 0.4)
  
  // Stroke widths - shadow is thicker, main stroke on top
  const shadowWidth = style.strokeWidth * 2.5
  const mainWidth = style.strokeWidth * 1.2
  const highlightWidth = style.strokeWidth * 0.6
  
  return (
    <g ref={svgRef}>
      {/* Layer 1: Shadow/glow stroke - darker, blurred, underneath */}
      <polygon
        points={pointsStr}
        fill="none"
        stroke={shadowStrokeColor}
        strokeWidth={shadowWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeOpacity={0.6}
        filter={isSelected ? "url(#glow-selected)" : "url(#glow)"}
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Layer 2: Main fill */}
      <polygon
        points={pointsStr}
        fill={style.fillColor}
        fillOpacity={fillOpacity}
        stroke="none"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Layer 3: Main stroke - rounded corners */}
      <polygon
        points={pointsStr}
        fill="none"
        stroke={mainStrokeColor}
        strokeWidth={mainWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Layer 4: Inner highlight stroke - subtle lighter edge */}
      <polygon
        points={pointsStr}
        fill="none"
        stroke={highlightStrokeColor}
        strokeWidth={highlightWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeOpacity={0.4}
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Midpoint handles - only when selected */}
      {isSelected && points.length >= 3 && midpoints.map((p, i) => {
        if (isMidpointTooCloseToVertex(p)) return null
        return (
          <g key={`m-${i}`}>
            <CircleAsEllipse cx={p.x} cy={p.y} r={MID_TOUCH_R} aspectRatio={aspectRatio}
              fill="transparent" className="cursor-cell" pointerEvents="auto"
              onClick={(e) => { e.stopPropagation(); onMidpointClick?.(i) }}
              onMouseEnter={() => setHoverMidpoint(i)}
              onMouseLeave={() => setHoverMidpoint(null)}
            />
            <CircleAsEllipse cx={p.x} cy={p.y} r={hoverMidpoint === i ? MID_R * 1.3 : MID_R} aspectRatio={aspectRatio}
              fill={hoverMidpoint === i ? '#60a5fa' : 'rgba(96, 165, 250, 0.5)'}
              stroke="rgba(0,0,0,0.3)" strokeWidth={0.15} pointerEvents="none"
            />
          </g>
        )
      })}
      
      {/* Vertex handles - only when selected */}
      {isSelected && points.map((p, i) => (
        <g key={`v-${i}`}>
          <CircleAsEllipse cx={p.x} cy={p.y} r={VERTEX_TOUCH_R} aspectRatio={aspectRatio}
            fill="transparent" className="cursor-move" pointerEvents="auto"
            onMouseDown={(e) => {
              if (e.button === 2) { e.preventDefault(); if (points.length > 3) onVertexDelete?.(i); return }
              e.stopPropagation(); setDraggingVertex(i)
            }}
            onMouseEnter={() => setHoverVertex(i)}
            onMouseLeave={() => setHoverVertex(null)}
            onContextMenu={(e) => e.preventDefault()}
          />
          <CircleAsEllipse cx={p.x} cy={p.y} r={hoverVertex === i || draggingVertex === i ? VERTEX_HOVER_R : VERTEX_R} aspectRatio={aspectRatio}
            fill={draggingVertex === i ? '#fff' : hoverVertex === i ? '#fbbf24' : '#f59e0b'}
            stroke="rgba(0,0,0,0.5)" strokeWidth={0.15} pointerEvents="none"
          />
        </g>
      ))}
    </g>
  )
}

// ============================================
// Drawing Polygon
// IMPORTANT: All elements have pointerEvents="none" so clicks pass through to SVG
// ============================================
function DrawingPolygon({ points, mousePos, style, aspectRatio, isCloseable }: { 
  points: Point[]
  mousePos: Point | null
  style: HotspotStyle
  aspectRatio: number
  isCloseable: boolean
}) {
  if (points.length === 0) return null
  
  const allPoints = mousePos ? [...points, mousePos] : points
  const pointsStr = allPoints.map(p => `${p.x},${p.y}`).join(' ')
  
  return (
    <g style={{ pointerEvents: 'none' }}>
      <polyline points={pointsStr} fill="none" stroke="#f59e0b"
        strokeWidth={0.5} strokeDasharray="1.5,0.75" strokeLinejoin="round" />
      
      {points.length >= 2 && mousePos && (
        <line x1={mousePos.x} y1={mousePos.y} x2={points[0].x} y2={points[0].y}
          stroke="#22c55e" strokeWidth={0.3} strokeDasharray="1,1" opacity={0.6} />
      )}
      
      {points.map((p, i) => (
        <CircleAsEllipse key={i} cx={p.x} cy={p.y} r={i === 0 && points.length >= 3 ? 1.8 : 1.2}
          aspectRatio={aspectRatio} fill={i === 0 ? '#22c55e' : '#f59e0b'}
          stroke="rgba(0,0,0,0.4)" strokeWidth={0.15} pointerEvents="none" />
      ))}
      
      {/* Close zone indicator - visual feedback when closeable */}
      {points.length >= 3 && (
        <CircleAsEllipse cx={points[0].x} cy={points[0].y} r={4.0}
          aspectRatio={aspectRatio} 
          fill={isCloseable ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.15)"} 
          stroke={isCloseable ? "#4ade80" : "#22c55e"} 
          strokeWidth={isCloseable ? 0.4 : 0.2} 
          pointerEvents="none" />
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
  onUpdateBounds: (id: string, bounds: PolygonBounds) => void
  mode: EditorMode
  drawingPoints: Point[]
  onAddDrawingPoint: (point: Point) => void
  onCompleteDrawing: () => void
  mousePos: Point | null
  onMouseMove: (pos: Point) => void
  style: HotspotStyle
  aspectRatio: number
}

function HotspotSvgOverlay({
  hotspots, selectedId, onUpdateBounds,
  mode, drawingPoints, onAddDrawingPoint, onCompleteDrawing,
  mousePos, onMouseMove, style, aspectRatio
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
  
  // Check if current mouse position is close enough to close
  const isCloseToFirstPoint = (): boolean => {
    if (drawingPoints.length < 3 || !mousePos) return false
    const first = drawingPoints[0]
    // Use simple coordinate distance for close detection (no aspect ratio needed for threshold check)
    const dx = mousePos.x - first.x
    const dy = mousePos.y - first.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    console.log('[HotspotEditor] Close check - mouse:', mousePos, 'first:', first, 'dist:', dist.toFixed(2))
    return dist < 4  // 4 SVG units threshold
  }
  
  const handleClick = (e: React.MouseEvent) => {
    console.log('[HotspotEditor] handleClick called, mode:', mode)
    if (mode !== 'draw') return
    
    const pos = getMousePosition(e)
    console.log('[HotspotEditor] Click position:', pos, 'drawingPoints.length:', drawingPoints.length)
    
    // Check if clicking near first point to close
    if (drawingPoints.length >= 3) {
      const first = drawingPoints[0]
      const dx = pos.x - first.x
      const dy = pos.y - first.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      console.log('[HotspotEditor] Distance to first point:', dist.toFixed(2), '(threshold: 4)')
      
      if (dist < 4) {
        console.log('[HotspotEditor] CLOSING POLYGON!')
        onCompleteDrawing()
        return
      }
    }
    
    console.log('[HotspotEditor] Adding point:', pos)
    onAddDrawingPoint(pos)
  }
  
  const handleDoubleClick = () => {
    console.log('[HotspotEditor] handleDoubleClick, mode:', mode, 'points:', drawingPoints.length)
    if (mode === 'draw' && drawingPoints.length >= 3) {
      console.log('[HotspotEditor] Double-click closing polygon!')
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
    const newPoints = [...bounds.points]
    newPoints.splice(midpointIndex + 1, 0, { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 })
    onUpdateBounds(hotspotId, { points: newPoints })
  }
  
  const handleVertexDelete = (hotspotId: string, vertexIndex: number) => {
    const hotspot = hotspots.find(h => h.id === hotspotId)
    if (!hotspot || hotspot.shape !== 'polygon') return
    const bounds = hotspot.bounds as PolygonBounds
    if (!bounds?.points || bounds.points.length <= 3) return
    onUpdateBounds(hotspotId, { points: bounds.points.filter((_, i) => i !== vertexIndex) })
  }
  
  return (
    <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
      style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseMove={(e) => onMouseMove(getMousePosition(e))}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* SVG Filter definitions */}
      <SvgFilters />
      
      {/* Render all polygons - NO click selection, sidebar only */}
      {hotspots.map(hotspot => {
        if (hotspot.shape !== 'polygon') return null
        const bounds = hotspot.bounds as PolygonBounds
        if (!bounds?.points) return null
        return (
          <PolygonShape key={hotspot.id} points={bounds.points} isSelected={selectedId === hotspot.id}
            style={style} aspectRatio={aspectRatio}
            onVertexDrag={(i, pos) => handleVertexDrag(hotspot.id, i, pos)}
            onMidpointClick={(i) => handleMidpointClick(hotspot.id, i)}
            onVertexDelete={(i) => handleVertexDelete(hotspot.id, i)}
          />
        )
      })}
      
      {/* Drawing in progress */}
      {mode === 'draw' && (
        <DrawingPolygon 
          points={drawingPoints} 
          mousePos={mousePos} 
          style={style} 
          aspectRatio={aspectRatio}
          isCloseable={isCloseToFirstPoint()}
        />
      )}
    </svg>
  )
}

// ============================================
// Style Editor with Preview
// ============================================
interface StyleEditorProps {
  style: HotspotStyle
  onChange: (s: HotspotStyle) => void
  saving: boolean
}

function StyleEditor({ style, onChange, saving }: StyleEditorProps) {
  const handleReset = () => {
    onChange(DEFAULT_STYLE)
  }

  return (
    <div className="space-y-3 text-[10px]">
      {/* Preview swatch */}
      <div className="flex items-center gap-2">
        <span className="text-neutral-500 w-12">Preview</span>
        <div className="flex-1 h-6 rounded border border-neutral-600 relative overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{ 
              backgroundColor: style.fillColor, 
              opacity: style.fillOpacity 
            }} 
          />
          <div 
            className="absolute inset-1 rounded-sm"
            style={{ 
              border: `2px solid ${style.strokeColor}`,
              borderRadius: '4px',
              boxShadow: `0 0 4px ${darkenColor(style.strokeColor, 0.5)}`,
              opacity: 0.9
            }} 
          />
        </div>
        {saving && <span className="text-amber-500 text-[9px]">💾</span>}
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-neutral-500 w-12">Fill</label>
        <input type="color" value={style.fillColor} onChange={(e) => onChange({ ...style, fillColor: e.target.value })}
          className="w-5 h-5 rounded border border-neutral-600 bg-transparent cursor-pointer" />
        <input type="range" min="5" max="50" value={style.fillOpacity * 100}
          onChange={(e) => onChange({ ...style, fillOpacity: Number(e.target.value) / 100 })}
          className="flex-1 h-1 accent-amber-600" />
        <span className="text-neutral-500 w-8 text-right">{Math.round(style.fillOpacity * 100)}%</span>
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-neutral-500 w-12">Stroke</label>
        <input type="color" value={style.strokeColor} onChange={(e) => onChange({ ...style, strokeColor: e.target.value })}
          className="w-5 h-5 rounded border border-neutral-600 bg-transparent cursor-pointer" />
        <input type="range" min="10" max="100" value={style.strokeWidth * 100}
          onChange={(e) => onChange({ ...style, strokeWidth: Number(e.target.value) / 100 })}
          className="flex-1 h-1 accent-amber-600" />
        <span className="text-neutral-500 w-8 text-right">{style.strokeWidth.toFixed(1)}</span>
      </div>

      <button 
        onClick={handleReset}
        className="text-neutral-500 hover:text-neutral-400 text-[9px] underline"
      >
        Reset to defaults
      </button>
    </div>
  )
}

// ============================================
// Frame Overlay
// ============================================
function FrameOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-0 right-0" style={{ height: FRAME_WIDTH, background: 'linear-gradient(to bottom, #2c2824 0%, #1f1c1a 100%)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.5)' }} />
      <div className="absolute bottom-0 left-0 right-0" style={{ height: FRAME_WIDTH, background: 'linear-gradient(to top, #2c2824 0%, #1f1c1a 100%)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.1)' }} />
      <div className="absolute left-0" style={{ top: FRAME_WIDTH, bottom: FRAME_WIDTH, width: FRAME_WIDTH, background: 'linear-gradient(to right, #2c2824 0%, #1f1c1a 100%)', boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.1), inset -2px 0 4px rgba(0,0,0,0.5)' }} />
      <div className="absolute right-0" style={{ top: FRAME_WIDTH, bottom: FRAME_WIDTH, width: FRAME_WIDTH, background: 'linear-gradient(to left, #2c2824 0%, #1f1c1a 100%)', boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.5), inset -2px 0 4px rgba(255,255,255,0.1)' }} />
      <div className="absolute" style={{ top: FRAME_WIDTH, left: FRAME_WIDTH, right: FRAME_WIDTH, bottom: FRAME_WIDTH, boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.7), inset 6px 0 20px rgba(0,0,0,0.5), inset -6px 0 20px rgba(0,0,0,0.5), inset 0 -6px 20px rgba(0,0,0,0.7)' }} />
    </div>
  )
}

// ============================================
// Viewport Bounds Hook
// ============================================
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
      
      let viewportWidth: number, viewportHeight: number
      if (containerAspect > targetAspect) {
        viewportHeight = containerHeight
        viewportWidth = viewportHeight * targetAspect
      } else {
        viewportWidth = containerWidth
        viewportHeight = viewportWidth / targetAspect
      }
      
      setBounds({
        left: (containerWidth - viewportWidth) / 2,
        top: (containerHeight - viewportHeight) / 2,
        width: viewportWidth,
        height: viewportHeight
      })
    }
    
    updateBounds()
    const observer = new ResizeObserver(updateBounds)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [containerRef, targetWidth, targetHeight])
  
  return bounds
}

// ============================================
// Sidebar Component
// ============================================
interface SidebarProps {
  mode: EditorMode
  setMode: (m: EditorMode) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  localHotspots: ParsedSplatHotspot[]
  drawingPoints: Point[]
  setDrawingPoints: (p: Point[]) => void
  drawingComplete: boolean
  saving: boolean
  savingStyle: boolean
  loading: boolean
  error: string | null
  configId: string | null
  onCreateHotspot: (name: string) => void
  onDeleteHotspot: (id: string) => void
  style: HotspotStyle
  setStyle: (s: HotspotStyle) => void
}

function Sidebar({
  mode, setMode, selectedId, setSelectedId,
  localHotspots, drawingPoints, setDrawingPoints, drawingComplete,
  saving, savingStyle, loading, error, configId,
  onCreateHotspot, onDeleteHotspot, style, setStyle
}: SidebarProps) {
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showStyle, setShowStyle] = useState(true)
  const nameInputRef = useRef<HTMLInputElement>(null)
  
  const selectedHotspot = localHotspots?.find(h => h.id === selectedId)
  
  // Auto-focus name input when drawing is complete
  useEffect(() => {
    if (drawingComplete && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [drawingComplete])
  
  const handleSetMode = (newMode: EditorMode) => {
    setMode(newMode)
    if (newMode === 'draw') { setSelectedId(null); setDrawingPoints([]) }
  }
  
  const handleSelectHotspot = (id: string) => {
    setSelectedId(id)
    setMode('select')
  }
  
  const handleCreate = () => {
    if (newName.trim()) { onCreateHotspot(newName.trim()); setNewName('') }
  }
  
  return (
    <div className="w-64 bg-neutral-900 text-white text-sm flex flex-col border-l border-neutral-800 flex-shrink-0">
      <div className="p-3 border-b border-neutral-700">
        <Link to="/admin" className="text-amber-600 hover:text-amber-500 text-xs">← Back to Admin</Link>
        <h1 className="text-sm font-medium text-neutral-200 mt-1">Hotspot Editor</h1>
      </div>
      
      {loading && <div className="p-3 bg-neutral-800 text-neutral-400 text-xs">Loading...</div>}
      {error && <div className="p-3 bg-red-900/30 text-red-400 text-xs">{error}</div>}
      
      <div className="p-3 border-b border-neutral-700">
        <div className="flex gap-1">
          <button onClick={() => handleSetMode('select')}
            className={`flex-1 py-1.5 rounded text-xs font-medium ${mode === 'select' ? 'bg-amber-700 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>
            Select
          </button>
          <button onClick={() => handleSetMode('draw')}
            className={`flex-1 py-1.5 rounded text-xs font-medium ${mode === 'draw' ? 'bg-amber-700 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>
            Draw
          </button>
        </div>
        
        {mode === 'draw' && !drawingComplete && (
          <div className="mt-2 text-[10px] text-neutral-500">
            Click to place vertices. Click green circle or double-click to close.
            {drawingPoints.length > 0 && (
              <div className="mt-1 flex items-center justify-between text-neutral-400">
                <span>{drawingPoints.length} points</span>
                <button onClick={() => setDrawingPoints([])} className="text-red-400 hover:text-red-300">Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Save panel when drawing is complete */}
      {mode === 'draw' && drawingComplete && (
        <div className="p-3 border-b border-neutral-700 bg-green-900/30">
          <p className="text-[10px] text-green-400 mb-2 font-medium">✓ Shape closed! ({drawingPoints.length} points)</p>
          <input 
            ref={nameInputRef}
            type="text" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter hotspot name..."
            className="w-full bg-neutral-800 border border-green-600 rounded px-2 py-1.5 text-xs focus:border-green-400 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()} 
          />
          <button onClick={handleCreate} disabled={!newName.trim()}
            className="w-full mt-2 bg-green-700 hover:bg-green-600 disabled:bg-neutral-700 disabled:text-neutral-500 py-1.5 rounded text-xs font-medium">
            Save Hotspot
          </button>
          <button onClick={() => setDrawingPoints([])} 
            className="w-full mt-1 text-neutral-500 hover:text-neutral-400 text-[10px]">
            Cancel and start over
          </button>
        </div>
      )}
      
      {/* Drawing in progress (not yet complete) */}
      {mode === 'draw' && !drawingComplete && drawingPoints.length >= 3 && (
        <div className="p-3 border-b border-neutral-700 bg-amber-900/20">
          <p className="text-[10px] text-amber-400">Click the green circle to close the shape, or double-click anywhere.</p>
        </div>
      )}
      
      {/* Selected hotspot info */}
      {mode === 'select' && selectedHotspot && (
        <div className="p-3 border-b border-neutral-700 bg-amber-900/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">{selectedHotspot.name_en}</span>
            <span className="text-[9px] text-neutral-600">{(selectedHotspot.bounds as PolygonBounds)?.points?.length ?? 0} vertices</span>
          </div>
          <p className="text-[9px] text-neutral-500 mt-1">Drag vertices • Click edge midpoint to add • Right-click vertex to delete</p>
          
          {confirmDelete === selectedHotspot.id ? (
            <div className="flex gap-2 mt-2">
              <button onClick={() => { onDeleteHotspot(selectedHotspot.id); setConfirmDelete(null) }}
                className="flex-1 bg-red-700 py-1 rounded text-[10px]">Confirm Delete</button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-neutral-700 py-1 rounded text-[10px]">Cancel</button>
            </div>
          ) : (
            <div className="flex gap-3 mt-2 text-[10px]">
              <button onClick={() => setConfirmDelete(selectedHotspot.id)} className="text-red-400 hover:text-red-300">Delete</button>
              <button onClick={() => setSelectedId(null)} className="text-neutral-500 hover:text-neutral-400">Deselect</button>
            </div>
          )}
        </div>
      )}
      
      {/* Style editor - always visible */}
      <div className="p-3 border-b border-neutral-700">
        <button onClick={() => setShowStyle(!showStyle)} className="text-[10px] text-neutral-400 hover:text-neutral-300 flex items-center gap-1 mb-2">
          <span>{showStyle ? '▼' : '▶'}</span><span>Polygon Style</span>
        </button>
        {showStyle && <StyleEditor style={style} onChange={setStyle} saving={savingStyle} />}
      </div>
      
      {/* Hotspot list */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] text-neutral-600 font-medium">HOTSPOTS ({localHotspots?.length ?? 0})</span>
          {saving && <span className="text-[9px] text-amber-500">Saving...</span>}
        </div>
        
        <div className="space-y-0.5">
          {(localHotspots ?? []).map(h => (
            <button key={h.id} onClick={() => handleSelectHotspot(h.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                selectedId === h.id 
                  ? 'bg-amber-700 text-white' 
                  : 'text-neutral-400 hover:bg-neutral-800'
              }`}>
              <div className="flex items-center justify-between">
                <span>{h.name_en}</span>
                <div className="flex items-center gap-1">
                  {h.viewpoint_position && <span className="text-[9px]" title="Has viewpoint">📷</span>}
                  <span className="text-[9px] opacity-60">{(h.bounds as PolygonBounds)?.points?.length ?? 0}pt</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        
        {(localHotspots?.length ?? 0) === 0 && !loading && (
          <p className="text-neutral-600 text-[10px] text-center py-4">No hotspots yet. Switch to Draw mode to create one.</p>
        )}
      </div>
      
      <div className="p-2 border-t border-neutral-800 text-[9px] text-neutral-700">
        {configId ? `Config: ${configId.slice(0,8)}...` : <span className="text-red-400">No config loaded</span>}
      </div>
    </div>
  )
}

// ============================================
// Helper: Extract style from config settings
// ============================================
function getStyleFromConfig(config: { settings?: unknown } | null): HotspotStyle {
  if (!config?.settings) return DEFAULT_STYLE
  const settings = config.settings as Record<string, unknown>
  const stored = settings.hotspot_style as HotspotStyle | undefined
  if (stored?.fillColor && stored?.strokeColor && 
      typeof stored?.fillOpacity === 'number' && 
      typeof stored?.strokeWidth === 'number') {
    return stored
  }
  return DEFAULT_STYLE
}

// ============================================
// Main Component
// ============================================
export default function HotspotEditor() {
  const viewportContainerRef = useRef<HTMLDivElement>(null)
  const { config, hotspots, loading, error, saveHotspotBounds, saveConfigSettings } = useSplatData()
  
  // All editor state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<EditorMode>('select')
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([])
  const [drawingComplete, setDrawingComplete] = useState(false)
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingStyle, setSavingStyle] = useState(false)
  const [localHotspots, setLocalHotspots] = useState<ParsedSplatHotspot[]>([])
  
  // Style state - initialized from config.settings.hotspot_style
  const [style, setStyleLocal] = useState<HotspotStyle>(DEFAULT_STYLE)
  const styleInitialized = useRef(false)
  
  const saveTimeoutRef = useRef<number>()
  const styleSaveTimeoutRef = useRef<number>()
  
  const targetWidth = config?.target_width || DEFAULT_TARGET_WIDTH
  const targetHeight = config?.target_height || DEFAULT_TARGET_HEIGHT
  const aspectRatio = targetWidth / targetHeight
  
  const bounds = useViewportBounds(viewportContainerRef, targetWidth, targetHeight)
  const innerWidth = bounds.width > 0 ? bounds.width - FRAME_WIDTH * 2 : 0
  const innerHeight = bounds.height > 0 ? bounds.height - FRAME_WIDTH * 2 : 0
  
  // Sync hotspots from server
  useEffect(() => { setLocalHotspots(hotspots ?? []) }, [hotspots])
  
  // Load style from config.settings when config loads (only once)
  useEffect(() => {
    if (config && !styleInitialized.current) {
      const loadedStyle = getStyleFromConfig(config)
      setStyleLocal(loadedStyle)
      styleInitialized.current = true
    }
  }, [config])
  
  // Style change handler - updates local state and saves to Supabase with debounce
  const setStyle = useCallback((newStyle: HotspotStyle) => {
    setStyleLocal(newStyle)
    
    // Debounce save to database
    if (styleSaveTimeoutRef.current) clearTimeout(styleSaveTimeoutRef.current)
    styleSaveTimeoutRef.current = window.setTimeout(async () => {
      setSavingStyle(true)
      await saveConfigSettings({ hotspot_style: newStyle })
      setSavingStyle(false)
    }, 500)
  }, [saveConfigSettings])
  
  // Complete drawing - mark as complete so sidebar shows save UI
  const handleCompleteDrawing = () => {
    console.log('[HotspotEditor] handleCompleteDrawing called, points:', drawingPoints.length)
    if (drawingPoints.length < 3) return
    setDrawingComplete(true)
    console.log('[HotspotEditor] Drawing marked as complete!')
  }
  
  // Reset drawing state
  const handleSetDrawingPoints = (points: Point[]) => {
    setDrawingPoints(points)
    if (points.length === 0) {
      setDrawingComplete(false)
    }
  }
  
  const handleCreateHotspot = async (name: string) => {
    if (!config || drawingPoints.length < 3) return
    setSaving(true)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const newHotspot = await createHotspot({
      splat_config_id: config.id, slug, name_en: name, shape: 'polygon',
      bounds: { points: drawingPoints }, order_index: localHotspots?.length ?? 0, active: true
    })
    if (newHotspot) { 
      setLocalHotspots(prev => [...(prev ?? []), newHotspot])
      setSelectedId(newHotspot.id) 
    }
    setDrawingPoints([])
    setDrawingComplete(false)
    setMode('select')
    setSaving(false)
  }
  
  const handleDeleteHotspot = async (id: string) => {
    setSaving(true)
    const success = await deleteHotspot(id)
    if (success) { setLocalHotspots(prev => (prev ?? []).filter(h => h.id !== id)); setSelectedId(null) }
    setSaving(false)
  }
  
  const handleUpdateBounds = (id: string, newBounds: PolygonBounds) => {
    setLocalHotspots(prev => (prev ?? []).map(h => h.id === id ? { ...h, bounds: newBounds } : h))
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(async () => {
      setSaving(true); await saveHotspotBounds(id, 'polygon', newBounds); setSaving(false)
    }, 400)
  }
  
  return (
    <div className="w-screen h-screen bg-black flex">
      {/* Main viewport area */}
      <div ref={viewportContainerRef} className="flex-1 relative">
        {/* Letterbox/pillarbox */}
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
        
        {/* PlayCanvas - isolated, never re-renders */}
        {bounds.width > 0 && innerWidth > 0 && (
          <div className="absolute" style={{ left: bounds.left + FRAME_WIDTH, top: bounds.top + FRAME_WIDTH, width: innerWidth, height: innerHeight }}>
            <SplatViewer />
          </div>
        )}
        
        {/* SVG Overlay */}
        {bounds.width > 0 && innerWidth > 0 && (
          <div className="absolute z-10" style={{ left: bounds.left + FRAME_WIDTH, top: bounds.top + FRAME_WIDTH, width: innerWidth, height: innerHeight }}>
            <HotspotSvgOverlay
              hotspots={(localHotspots ?? []).filter(h => h.shape === 'polygon')}
              selectedId={selectedId}
              onUpdateBounds={handleUpdateBounds}
              mode={mode}
              drawingPoints={drawingPoints}
              onAddDrawingPoint={(p) => {
                if (!drawingComplete) {
                  setDrawingPoints(prev => [...prev, p])
                }
              }}
              onCompleteDrawing={handleCompleteDrawing}
              mousePos={mousePos}
              onMouseMove={setMousePos}
              style={style}
              aspectRatio={aspectRatio}
            />
          </div>
        )}
        
        {/* Frame overlay */}
        {bounds.width > 0 && (
          <div className="absolute pointer-events-none z-20" style={{ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }}>
            <FrameOverlay />
            <div className="absolute text-[10px] px-2 py-0.5 rounded" style={{ left: 32, top: 32, backgroundColor: 'rgba(0,0,0,0.8)', color: 'rgba(139, 115, 71, 0.8)' }}>
              {targetWidth}×{targetHeight} viewport
            </div>
          </div>
        )}
      </div>
      
      {/* Sidebar */}
      <Sidebar
        mode={mode} setMode={setMode}
        selectedId={selectedId} setSelectedId={setSelectedId}
        localHotspots={localHotspots}
        drawingPoints={drawingPoints} setDrawingPoints={handleSetDrawingPoints}
        drawingComplete={drawingComplete}
        saving={saving} savingStyle={savingStyle}
        loading={loading} error={error}
        configId={config?.id ?? null}
        onCreateHotspot={handleCreateHotspot}
        onDeleteHotspot={handleDeleteHotspot}
        style={style} setStyle={setStyle}
      />
    </div>
  )
}
