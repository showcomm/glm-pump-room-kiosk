/**
 * Interactive Viewer - Main kiosk experience (Visitor Mode)
 * 
 * CRITICAL: PlayCanvas components must stay STABLE - no prop changes that cause re-renders.
 * All camera animation is done imperatively via the PlayCanvas API.
 * 
 * Admin functions are on separate routes (/admin, /admin/camera-capture)
 */

import { useEffect, useRef } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { useKioskStore, checkIdleTimeout } from '../../store/kioskStore'
import { HotspotOverlay } from './HotspotOverlay'
import { InfoPanel } from './InfoPanel'
import { NavigationBar } from './NavigationBar'
import { IdleOverlay } from './IdleOverlay'
import { FrameOverlay } from './FrameOverlay'
import { getOverviewViewpoint } from '../../data/viewpoints'

// ============================================
// CONFIGURATION
// ============================================
const SPLAT_URL = '/pump-room.ply'
const FRAME_WIDTH = 24
const TRANSITION_DURATION_MS = 1200

// Static initial position - these props NEVER change
const INITIAL = getOverviewViewpoint()

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
  
  // Lerp helper
  const lerp = (start: number, end: number, t: number): number => {
    return start + (end - start) * t
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
      
      const newRotX = lerp(startRotRef.current.x, targetViewpoint.rotation[0], t)
      const newRotY = lerp(startRotRef.current.y, targetViewpoint.rotation[1], t)
      const newRotZ = lerp(startRotRef.current.z, targetViewpoint.rotation[2], t)
      
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
// Main Interactive Viewer Component
// ============================================
export function InteractiveViewer() {
  const isIdle = useKioskStore(state => state.isIdle)
  const recordInteraction = useKioskStore(state => state.recordInteraction)
  
  useEffect(() => {
    const interval = setInterval(checkIdleTimeout, 5000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div 
      className="w-screen h-screen bg-black relative"
      onClick={recordInteraction}
      onTouchStart={recordInteraction}
    >
      {/* PlayCanvas Application - completely isolated */}
      <div 
        className="absolute" 
        style={{ 
          top: FRAME_WIDTH, 
          left: FRAME_WIDTH, 
          right: FRAME_WIDTH, 
          bottom: FRAME_WIDTH 
        }}
      >
        <Application graphicsDeviceOptions={{ antialias: false }}>
          <Scene />
        </Application>
      </div>

      {/* UI Layer */}
      <HotspotOverlay frameWidth={FRAME_WIDTH} />
      <FrameOverlay frameWidth={FRAME_WIDTH} />
      <InfoPanel frameWidth={FRAME_WIDTH} />
      <NavigationBar frameWidth={FRAME_WIDTH} />
      {isIdle && <IdleOverlay />}
    </div>
  )
}

export default InteractiveViewer
