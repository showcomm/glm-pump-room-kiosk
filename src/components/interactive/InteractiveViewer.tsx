/**
 * Interactive Viewer - Main kiosk experience
 * 
 * This component replaces SplatTest for the visitor-facing kiosk.
 * Key differences from SplatTest:
 * - NO free camera controls (CameraControls script removed)
 * - Camera position driven entirely by state
 * - Smooth animated transitions between viewpoints
 * - Hotspot overlay for touch interaction
 */

import { useEffect, useRef, useCallback } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { useKioskStore, checkIdleTimeout } from '../../store/kioskStore'
import { HotspotOverlay } from './HotspotOverlay'
import { InfoPanel } from './InfoPanel'
import { NavigationBar } from './NavigationBar'
import { IdleOverlay } from './IdleOverlay'
import { FrameOverlay } from './FrameOverlay'

// ============================================
// CONFIGURATION
// ============================================
const SPLAT_URL = '/pump-room.ply'
const FRAME_WIDTH = 24
const TRANSITION_DURATION_MS = 1200

// ============================================
// Splat Component
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
// Animated Camera - Handles smooth transitions
// ============================================
function AnimatedCamera() {
  const app = useApp()
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>(0)
  const startPosRef = useRef<[number, number, number]>([0, 0, 0])
  const startRotRef = useRef<[number, number, number]>([0, 0, 0])
  
  const { 
    currentViewpoint, 
    targetViewpoint, 
    isTransitioning,
    completeTransition 
  } = useKioskStore()
  
  // Easing function for smooth animation
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
  
  // Lerp helper
  const lerp = (start: number, end: number, t: number): number => {
    return start + (end - start) * t
  }
  
  // Animation loop
  const animate = useCallback(() => {
    if (!app || !targetViewpoint) return
    
    const cameraEntity = app.root.findByName('camera')
    if (!cameraEntity) return
    
    const elapsed = Date.now() - startTimeRef.current
    const progress = Math.min(elapsed / TRANSITION_DURATION_MS, 1)
    const easedProgress = easeInOutCubic(progress)
    
    // Interpolate position
    const newPos = [
      lerp(startPosRef.current[0], targetViewpoint.position[0], easedProgress),
      lerp(startPosRef.current[1], targetViewpoint.position[1], easedProgress),
      lerp(startPosRef.current[2], targetViewpoint.position[2], easedProgress)
    ]
    
    // Interpolate rotation (simple lerp - works for small angles)
    const newRot = [
      lerp(startRotRef.current[0], targetViewpoint.rotation[0], easedProgress),
      lerp(startRotRef.current[1], targetViewpoint.rotation[1], easedProgress),
      lerp(startRotRef.current[2], targetViewpoint.rotation[2], easedProgress)
    ]
    
    cameraEntity.setLocalPosition(newPos[0], newPos[1], newPos[2])
    cameraEntity.setLocalEulerAngles(newRot[0], newRot[1], newRot[2])
    
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      completeTransition()
    }
  }, [app, targetViewpoint, completeTransition])
  
  // Start animation when target changes
  useEffect(() => {
    if (!isTransitioning || !targetViewpoint || !app) return
    
    const cameraEntity = app.root.findByName('camera')
    if (!cameraEntity) return
    
    // Store starting position
    const pos = cameraEntity.getLocalPosition()
    const rot = cameraEntity.getLocalEulerAngles()
    startPosRef.current = [pos.x, pos.y, pos.z]
    startRotRef.current = [rot.x, rot.y, rot.z]
    startTimeRef.current = Date.now()
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isTransitioning, targetViewpoint, app, animate])
  
  return (
    <Entity 
      name="camera" 
      position={currentViewpoint.position}
      rotation={currentViewpoint.rotation}
    >
      <Camera 
        clearColor="#1a1a2e"
        fov={currentViewpoint.fov || 60}
        farClip={1000}
        nearClip={0.01}
      />
      {/* NO CameraControls script - camera is state-driven */}
    </Entity>
  )
}

// ============================================
// Main Interactive Viewer Component
// ============================================
export function InteractiveViewer() {
  const { isIdle, recordInteraction } = useKioskStore()
  
  // Idle timeout checker
  useEffect(() => {
    const interval = setInterval(checkIdleTimeout, 5000)
    return () => clearInterval(interval)
  }, [])
  
  // Record any touch/click as interaction
  const handleInteraction = () => {
    recordInteraction()
  }
  
  return (
    <div 
      className="w-screen h-screen bg-black relative"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* PlayCanvas Application - inset from edges */}
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
          <AnimatedCamera />
          <PumpRoomSplat src={SPLAT_URL} />
        </Application>
      </div>

      {/* Hotspot overlay - touchable regions */}
      <HotspotOverlay frameWidth={FRAME_WIDTH} />

      {/* Frame overlay - decorative border */}
      <FrameOverlay frameWidth={FRAME_WIDTH} />

      {/* Info panel - shows when equipment selected */}
      <InfoPanel frameWidth={FRAME_WIDTH} />

      {/* Navigation bar - home button, language toggle */}
      <NavigationBar frameWidth={FRAME_WIDTH} />

      {/* Idle/Attract overlay */}
      {isIdle && <IdleOverlay />}
    </div>
  )
}

export default InteractiveViewer
