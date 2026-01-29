/**
 * Interactive Viewer - Main kiosk experience (Visitor Mode)
 * 
 * CRITICAL: PlayCanvas components must stay STABLE - no prop changes that cause re-renders.
 * All camera animation is done imperatively via the PlayCanvas API.
 * 
 * VIEWPORT CONSTRAINING:
 * This component constrains to the target aspect ratio from the database config.
 * On the actual target monitor (e.g., 1920×1080), it fills the screen perfectly.
 * On other aspect ratios, black letterbox/pillarbox bars appear automatically.
 * This ensures hotspot coordinates align correctly regardless of screen size.
 * 
 * Admin functions are on separate routes (/admin, /admin/camera-capture)
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { useKioskStore, checkIdleTimeout } from '../../store/kioskStore'
import { useSplatData } from '../../hooks/useSplatData'
import { InfoPanel } from './InfoPanel'
import { NavigationBar } from './NavigationBar'
import { IdleOverlay } from './IdleOverlay'
import { getOverviewViewpoint } from '../../data/viewpoints'
import type { PolygonBounds } from '../../lib/database.types'

// ============================================
// CONFIGURATION
// ============================================
const SPLAT_URL = '/pump-room.ply'
const DEFAULT_FRAME_WIDTH = 24
const DEFAULT_TARGET_WIDTH = 1920
const DEFAULT_TARGET_HEIGHT = 1080
const TRANSITION_DURATION_MS = 1200

// Default hotspot style - matches HotspotEditor
const DEFAULT_STYLE = {
  fillColor: '#8b7355',
  fillOpacity: 0.15,
  strokeColor: '#c4a574',
  strokeWidth: 0.4
}

type HotspotStyle = typeof DEFAULT_STYLE

// Static initial position - these props NEVER change
const INITIAL = getOverviewViewpoint()

// ============================================
// Helper Functions
// ============================================
function darkenColor(hex: string, factor: number = 0.4): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
}

function lightenColor(hex: string, factor: number = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * factor))}, ${Math.min(255, Math.round(g + (255 - g) * factor))}, ${Math.min(255, Math.round(b + (255 - b) * factor))})`
}

// Extract style from config settings (same as HotspotEditor)
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
// Types
// ============================================
interface ViewportBounds {
  left: number
  top: number
  width: number
  height: number
}

// ============================================
// Viewport Bounds Hook - calculates aspect-ratio-constrained bounds
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
      
      let viewportWidth: number
      let viewportHeight: number
      
      if (containerAspect > targetAspect) {
        // Container is wider than target - fit to height, pillarbox sides
        viewportHeight = containerHeight
        viewportWidth = viewportHeight * targetAspect
      } else {
        // Container is taller than target - fit to width, letterbox top/bottom
        viewportWidth = containerWidth
        viewportHeight = viewportWidth / targetAspect
      }
      
      const left = (containerWidth - viewportWidth) / 2
      const top = (containerHeight - viewportHeight) / 2
      
      setBounds({ left, top, width: viewportWidth, height: viewportHeight })
    }
    
    updateBounds()
    
    // Update on resize
    const observer = new ResizeObserver(updateBounds)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    
    return () => observer.disconnect()
  }, [containerRef, targetWidth, targetHeight])
  
  return bounds
}

// ============================================
// Splat Component - completely static, no store access
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
// Camera Animator - handles transitions imperatively
// ============================================
function CameraAnimator() {
  const app = useApp()
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>(0)
  const startPosRef = useRef({ x: INITIAL.position[0], y: INITIAL.position[1], z: INITIAL.position[2] })
  const startRotRef = useRef({ x: INITIAL.rotation[0], y: INITIAL.rotation[1], z: INITIAL.rotation[2] })
  
  const targetViewpoint = useKioskStore(state => state.targetViewpoint)
  const isTransitioning = useKioskStore(state => state.isTransitioning)
  const completeTransition = useKioskStore(state => state.completeTransition)
  
  // Easing function
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
  
  // Lerp helper for linear values
  const lerp = (start: number, end: number, t: number): number => {
    return start + (end - start) * t
  }
  
  // Shortest-path angle interpolation - always takes the most direct route
  const lerpAngle = (start: number, end: number, t: number): number => {
    // Normalize angles to -180 to 180 range
    const normalizeAngle = (angle: number) => {
      let normalized = angle % 360
      if (normalized > 180) normalized -= 360
      if (normalized < -180) normalized += 360
      return normalized
    }
    
    const startNorm = normalizeAngle(start)
    const endNorm = normalizeAngle(end)
    
    // Calculate the shortest delta between angles
    let delta = endNorm - startNorm
    
    // Wrap around if needed to take shorter path
    // Example: going from 350° to 10° should go +20°, not -340°
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    
    // Interpolate along the shortest path
    return startNorm + delta * t
  }
  
  useEffect(() => {
    if (!isTransitioning || !targetViewpoint || !app) return
    
    const cameraEntity = app.root.findByName('camera')
    if (!cameraEntity) {
      console.error('Camera entity not found')
      return
    }
    
    // Capture starting position
    const currentPos = cameraEntity.getLocalPosition()
    const currentRot = cameraEntity.getLocalEulerAngles()
    startPosRef.current = { x: currentPos.x, y: currentPos.y, z: currentPos.z }
    startRotRef.current = { x: currentRot.x, y: currentRot.y, z: currentRot.z }
    startTimeRef.current = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const progress = Math.min(elapsed / TRANSITION_DURATION_MS, 1)
      const t = easeInOutCubic(progress)
      
      const newX = lerp(startPosRef.current.x, targetViewpoint.position[0], t)
      const newY = lerp(startPosRef.current.y, targetViewpoint.position[1], t)
      const newZ = lerp(startPosRef.current.z, targetViewpoint.position[2], t)
      
      // Use shortest-path angle interpolation for rotation to avoid spinning the long way
      const newRotX = lerpAngle(startRotRef.current.x, targetViewpoint.rotation[0], t)
      const newRotY = lerpAngle(startRotRef.current.y, targetViewpoint.rotation[1], t)
      const newRotZ = lerpAngle(startRotRef.current.z, targetViewpoint.rotation[2], t)
      
      cameraEntity.setLocalPosition(newX, newY, newZ)
      cameraEntity.setLocalEulerAngles(newRotX, newRotY, newRotZ)
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        completeTransition()
      }
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isTransitioning, targetViewpoint, app, completeTransition])
  
  return null
}

// ============================================
// Static Camera Entity - NO store subscriptions, props NEVER change
// ============================================
function StaticCamera() {
  return (
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
  )
}

// ============================================
// PlayCanvas Scene - isolated from UI state changes
// ============================================
function Scene() {
  return (
    <>
      <StaticCamera />
      <PumpRoomSplat src={SPLAT_URL} />
      <CameraAnimator />
    </>
  )
}

// ============================================
// Letterbox/Pillarbox Overlay - darkened areas outside viewport
// ============================================
function LetterboxOverlay({ bounds }: { bounds: ViewportBounds }) {
  if (bounds.width === 0) return null
  
  return (
    <div className="absolute inset-0 pointer-events-none z-5">
      {/* Top bar */}
      {bounds.top > 0 && (
        <div 
          className="absolute left-0 right-0 top-0 bg-black"
          style={{ height: bounds.top }}
        />
      )}
      {/* Bottom bar */}
      {bounds.top > 0 && (
        <div 
          className="absolute left-0 right-0 bottom-0 bg-black"
          style={{ height: bounds.top }}
        />
      )}
      {/* Left bar */}
      {bounds.left > 0 && (
        <div 
          className="absolute left-0 bg-black"
          style={{ 
            top: bounds.top, 
            width: bounds.left, 
            height: bounds.height 
          }}
        />
      )}
      {/* Right bar */}
      {bounds.left > 0 && (
        <div 
          className="absolute right-0 bg-black"
          style={{ 
            top: bounds.top, 
            width: bounds.left, 
            height: bounds.height 
          }}
        />
      )}
    </div>
  )
}

// ============================================
// Constrained Hotspot Overlay - positioned within viewport bounds
// ============================================
interface ConstrainedHotspotOverlayProps {
  bounds: ViewportBounds
  frameWidth: number
  style: HotspotStyle
}

function ConstrainedHotspotOverlay({ bounds, frameWidth, style }: ConstrainedHotspotOverlayProps) {
  const { 
    navigateToEquipment, 
    selectedHotspotSlug,
    isTransitioning,
    language 
  } = useKioskStore()
  
  const { hotspots } = useSplatData()
  
  // Don't show hotspots during transitions or when equipment is selected
  const showHotspots = !isTransitioning && !selectedHotspotSlug
  
  const handleHotspotClick = (hotspotSlug: string) => {
    console.log('[ConstrainedHotspotOverlay] Hotspot clicked:', hotspotSlug)
    if (!isTransitioning) {
      navigateToEquipment(hotspotSlug)
    }
  }
  
  if (bounds.width === 0) return null
  
  // Calculate the inner area (viewport minus frame)
  const innerLeft = bounds.left + frameWidth
  const innerTop = bounds.top + frameWidth
  const innerWidth = bounds.width - frameWidth * 2
  const innerHeight = bounds.height - frameWidth * 2
  
  // Style calculations (non-selected state, matching HotspotEditor)
  const fillOpacity = style.fillOpacity
  const mainStrokeColor = style.strokeColor
  const shadowStrokeColor = darkenColor(style.strokeColor, 0.3)
  const highlightStrokeColor = lightenColor(style.strokeColor, 0.4)
  
  // Stroke widths - shadow is thicker, main stroke on top
  const shadowWidth = style.strokeWidth * 2.5
  const mainWidth = style.strokeWidth * 1.2
  const highlightWidth = style.strokeWidth * 0.6
  
  return (
    <div 
      className="absolute pointer-events-none z-10"
      style={{
        left: innerLeft,
        top: innerTop,
        width: innerWidth,
        height: innerHeight
      }}
    >
      <svg 
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* SVG Filter Definitions */}
        <defs>
          <filter id="glow-visitor" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {showHotspots && hotspots.map(hotspot => {
          if (!hotspot.active) return null
          
          const boundsData = hotspot.bounds
          
          // Render based on shape type - POLYGON only (multi-layer rendering)
          if (hotspot.shape === 'polygon' && 'points' in boundsData) {
            const points = (boundsData as PolygonBounds).points.map(p => `${p.x},${p.y}`).join(' ')
            
            return (
              <g key={hotspot.id}>
                {/* Layer 1: Shadow/glow stroke - darker, blurred, underneath */}
                <polygon
                  points={points}
                  fill="none"
                  stroke={shadowStrokeColor}
                  strokeWidth={shadowWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeOpacity={0.6}
                  filter="url(#glow-visitor)"
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* Layer 2: Main fill */}
                <polygon
                  points={points}
                  fill={style.fillColor}
                  fillOpacity={fillOpacity}
                  stroke="none"
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* Layer 3: Main stroke - rounded corners */}
                <polygon
                  points={points}
                  fill="none"
                  stroke={mainStrokeColor}
                  strokeWidth={mainWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* Layer 4: Inner highlight stroke - subtle lighter edge */}
                <polygon
                  points={points}
                  fill="none"
                  stroke={highlightStrokeColor}
                  strokeWidth={highlightWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeOpacity={0.4}
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* Invisible click target on top */}
                <polygon
                  points={points}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={2}
                  className="cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  onClick={() => handleHotspotClick(hotspot.slug)}
                />
              </g>
            )
          }
          
          // Legacy shape support (if any exist)
          if (hotspot.shape === 'rectangle' && 'x' in boundsData) {
            const { x, y, width, height } = boundsData as { x: number, y: number, width: number, height: number }
            return (
              <rect
                key={hotspot.id}
                x={x}
                y={y}
                width={width}
                height={height}
                fill={style.fillColor}
                fillOpacity={fillOpacity}
                stroke={mainStrokeColor}
                strokeWidth={mainWidth}
                className="cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={() => handleHotspotClick(hotspot.slug)}
              />
            )
          }
          
          if (hotspot.shape === 'circle' && 'cx' in boundsData) {
            const { cx, cy, r } = boundsData as { cx: number, cy: number, r: number }
            return (
              <circle
                key={hotspot.id}
                cx={cx}
                cy={cy}
                r={r}
                fill={style.fillColor}
                fillOpacity={fillOpacity}
                stroke={mainStrokeColor}
                strokeWidth={mainWidth}
                className="cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={() => handleHotspotClick(hotspot.slug)}
              />
            )
          }
          
          return null
        })}
      </svg>
    </div>
  )
}

// ============================================
// Constrained Frame Overlay - positioned within viewport bounds
// ============================================
function ConstrainedFrameOverlay({ bounds, frameWidth }: { bounds: ViewportBounds, frameWidth: number }) {
  if (bounds.width === 0) return null
  
  return (
    <div 
      className="absolute pointer-events-none z-15"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height
      }}
    >
      {/* Top edge */}
      <div 
        className="absolute top-0 left-0 right-0"
        style={{
          height: frameWidth,
          background: 'linear-gradient(to bottom, #2c2824 0%, #1f1c1a 100%)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.5)',
        }}
      />
      {/* Bottom edge */}
      <div 
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: frameWidth,
          background: 'linear-gradient(to top, #2c2824 0%, #1f1c1a 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.1)',
        }}
      />
      {/* Left edge */}
      <div 
        className="absolute left-0"
        style={{
          top: frameWidth,
          bottom: frameWidth,
          width: frameWidth,
          background: 'linear-gradient(to right, #2c2824 0%, #1f1c1a 100%)',
          boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.1), inset -2px 0 4px rgba(0,0,0,0.5)',
        }}
      />
      {/* Right edge */}
      <div 
        className="absolute right-0"
        style={{
          top: frameWidth,
          bottom: frameWidth,
          width: frameWidth,
          background: 'linear-gradient(to left, #2c2824 0%, #1f1c1a 100%)',
          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.5), inset -2px 0 4px rgba(255,255,255,0.1)',
        }}
      />
      {/* Inner shadow for depth */}
      <div 
        className="absolute"
        style={{
          top: frameWidth,
          left: frameWidth,
          right: frameWidth,
          bottom: frameWidth,
          boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.7), inset 6px 0 20px rgba(0,0,0,0.5), inset -6px 0 20px rgba(0,0,0,0.5), inset 0 -6px 20px rgba(0,0,0,0.7)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// ============================================
// Main Interactive Viewer Component
// ============================================
export function InteractiveViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const isIdle = useKioskStore(state => state.isIdle)
  const recordInteraction = useKioskStore(state => state.recordInteraction)
  const setHotspots = useKioskStore(state => state.setHotspots)
  
  // Load config and hotspots from database
  const { config, hotspots, loading } = useSplatData()
  
  // Extract hotspot style from config settings
  const hotspotStyle = getStyleFromConfig(config)
  
  // Populate store with hotspots when they load
  useEffect(() => {
    if (hotspots) {
      console.log('[InteractiveViewer] Loaded hotspots from database:', hotspots)
      setHotspots(hotspots)
    }
  }, [hotspots, setHotspots])
  
  // Get target dimensions from config (with fallbacks)
  const targetWidth = config?.target_width || DEFAULT_TARGET_WIDTH
  const targetHeight = config?.target_height || DEFAULT_TARGET_HEIGHT
  const frameWidth = config?.frame_width || DEFAULT_FRAME_WIDTH
  
  // Calculate constrained viewport bounds
  const bounds = useViewportBounds(containerRef, targetWidth, targetHeight)
  
  // Idle timeout check
  useEffect(() => {
    const interval = setInterval(checkIdleTimeout, 5000)
    return () => clearInterval(interval)
  }, [])
  
  // Show loading state briefly while config loads
  if (loading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Loading...</div>
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      className="w-screen h-screen bg-black relative"
      onClick={recordInteraction}
      onTouchStart={recordInteraction}
    >
      {/* PlayCanvas Application - positioned within constrained bounds */}
      {bounds.width > 0 && (
        <div 
          className="absolute" 
          style={{ 
            top: bounds.top + frameWidth, 
            left: bounds.left + frameWidth, 
            width: bounds.width - frameWidth * 2,
            height: bounds.height - frameWidth * 2
          }}
        >
          <Application graphicsDeviceOptions={{ antialias: false }}>
            <Scene />
          </Application>
        </div>
      )}

      {/* Letterbox/Pillarbox - black bars outside viewport */}
      <LetterboxOverlay bounds={bounds} />

      {/* UI Layer - all positioned relative to constrained bounds */}
      <ConstrainedHotspotOverlay bounds={bounds} frameWidth={frameWidth} style={hotspotStyle} />
      <ConstrainedFrameOverlay bounds={bounds} frameWidth={frameWidth} />
      
      {/* Info Panel - positioned at right edge of viewport */}
      <InfoPanel frameWidth={frameWidth} viewportBounds={bounds} />
      
      {/* Navigation Bar - positioned at bottom of viewport */}
      <NavigationBar frameWidth={frameWidth} viewportBounds={bounds} />
      
      {isIdle && <IdleOverlay />}
    </div>
  )
}

export default InteractiveViewer
