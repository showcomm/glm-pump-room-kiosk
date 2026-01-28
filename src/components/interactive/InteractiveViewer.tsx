/**
 * Interactive Viewer - Main kiosk experience
 * 
 * This component replaces SplatTest for the visitor-facing kiosk.
 * Key differences from SplatTest:
 * - NO free camera controls (CameraControls script removed)
 * - Camera position driven entirely by state
 * - Smooth animated transitions between viewpoints
 * - Hotspot overlay for touch interaction
 * 
 * Admin Mode:
 * - Triple-tap top-left corner to toggle admin mode
 * - In admin mode, use SplatTest.tsx for camera capture (change import in main.tsx)
 */

import { useEffect, useRef, useCallback } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat, Script } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'
import { useKioskStore, checkIdleTimeout } from '../../store/kioskStore'
import { HotspotOverlay } from './HotspotOverlay'
import { InfoPanel } from './InfoPanel'
import { NavigationBar } from './NavigationBar'
import { IdleOverlay } from './IdleOverlay'
import { FrameOverlay } from './FrameOverlay'
import { AdminToggle } from './AdminToggle'

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
// Admin Camera Capture Helper
// ============================================
function AdminCameraHelper() {
  const app = useApp()
  const { isAdminMode } = useKioskStore()
  const frameRef = useRef<number>()
  
  useEffect(() => {
    if (!app || !isAdminMode) return
    
    const getCameraData = () => {
      const cameraEntity = app.root.findByName('camera')
      if (!cameraEntity) return null
      
      const pos = cameraEntity.getLocalPosition()
      const rot = cameraEntity.getLocalEulerAngles()
      
      return {
        pos: [pos.x, pos.y, pos.z],
        rot: [rot.x, rot.y, rot.z]
      }
    }
    
    // Expose to window for console access
    ;(window as any).captureCamera = () => {
      const data = getCameraData()
      if (data) {
        const code = `{
  id: 'viewpoint-name',
  equipment_id: 'equipment-id',
  position: [${data.pos.map(v => v.toFixed(3)).join(', ')}],
  rotation: [${data.rot.map(v => v.toFixed(2)).join(', ')}],
  fov: 60,
  label: { en: 'English Label', fr: 'French Label' }
}`
        console.log('Camera viewpoint code:', code)
        navigator.clipboard.writeText(code)
        console.log('Copied to clipboard!')
      }
      return data
    }
    
    // Broadcast live updates
    const updateLoop = () => {
      const data = getCameraData()
      if (data) {
        window.dispatchEvent(new CustomEvent('camera-update', { detail: data }))
      }
      frameRef.current = requestAnimationFrame(updateLoop)
    }
    frameRef.current = requestAnimationFrame(updateLoop)
    
    return () => {
      delete (window as any).captureCamera
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [app, isAdminMode])
  
  return null
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
    completeTransition,
    isAdminMode
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
  
  // Start animation when target changes (only in visitor mode)
  useEffect(() => {
    if (isAdminMode) return // Don't animate in admin mode
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
  }, [isTransitioning, targetViewpoint, app, animate, isAdminMode])
  
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
      {/* In admin mode, enable free camera controls for position capture */}
      {isAdminMode && <Script script={CameraControls} />}
    </Entity>
  )
}

// ============================================
// Admin Camera Info Panel
// ============================================
function AdminCameraPanel() {
  const { isAdminMode, language } = useKioskStore()
  const [cameraData, setCameraData] = useState({ pos: [0, 0, 0], rot: [0, 0, 0] })
  
  useEffect(() => {
    if (!isAdminMode) return
    
    const handler = (e: CustomEvent) => setCameraData(e.detail)
    window.addEventListener('camera-update', handler as EventListener)
    return () => window.removeEventListener('camera-update', handler as EventListener)
  }, [isAdminMode])
  
  if (!isAdminMode) return null
  
  const formatNum = (v: number) => v.toFixed(3)
  
  return (
    <div 
      className="absolute z-40 bg-black/90 text-white p-4 rounded-lg font-mono text-sm"
      style={{ top: FRAME_WIDTH + 50, left: FRAME_WIDTH + 16 }}
    >
      <div className="text-yellow-400 mb-2">Camera Position (Live)</div>
      <div>Pos: [{cameraData.pos.map(formatNum).join(', ')}]</div>
      <div>Rot: [{cameraData.rot.map(v => v.toFixed(2)).join(', ')}]</div>
      <button
        onClick={() => (window as any).captureCamera?.()}
        className="mt-3 w-full bg-blue-600 hover:bg-blue-500 py-2 rounded"
      >
        Copy to Clipboard
      </button>
      <div className="text-gray-500 text-xs mt-2">
        Console: captureCamera()
      </div>
    </div>
  )
}

// Need useState for AdminCameraPanel
import { useState } from 'react'

// ============================================
// Main Interactive Viewer Component
// ============================================
export function InteractiveViewer() {
  const { isIdle, isAdminMode, recordInteraction } = useKioskStore()
  
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
          <AdminCameraHelper />
        </Application>
      </div>

      {/* Hotspot overlay - touchable regions (hidden in admin mode) */}
      {!isAdminMode && <HotspotOverlay frameWidth={FRAME_WIDTH} />}

      {/* Frame overlay - decorative border */}
      <FrameOverlay frameWidth={FRAME_WIDTH} />

      {/* Info panel - shows when equipment selected (hidden in admin mode) */}
      {!isAdminMode && <InfoPanel frameWidth={FRAME_WIDTH} />}

      {/* Navigation bar - home button, language toggle */}
      <NavigationBar frameWidth={FRAME_WIDTH} />

      {/* Admin toggle - triple-tap top-left to activate */}
      <AdminToggle frameWidth={FRAME_WIDTH} />
      
      {/* Admin camera panel */}
      <AdminCameraPanel />

      {/* Idle/Attract overlay (hidden in admin mode) */}
      {isIdle && !isAdminMode && <IdleOverlay />}
    </div>
  )
}

export default InteractiveViewer
