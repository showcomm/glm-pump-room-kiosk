/**
 * Interactive Viewer - Main kiosk experience
 * 
 * CRITICAL: PlayCanvas components must stay STABLE - no prop changes that cause re-renders.
 * All camera animation is done imperatively via the PlayCanvas API.
 */

import { useEffect, useRef, useState } from 'react'
import { Application, Entity } from '@playcanvas/react'
import { Camera, GSplat } from '@playcanvas/react/components'
import { useSplat, useApp } from '@playcanvas/react/hooks'
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'
import { useKioskStore, checkIdleTimeout } from '../../store/kioskStore'
import { HotspotOverlay } from './HotspotOverlay'
import { InfoPanel } from './InfoPanel'
import { NavigationBar } from './NavigationBar'
import { IdleOverlay } from './IdleOverlay'
import { FrameOverlay } from './FrameOverlay'
import { AdminToggle } from './AdminToggle'
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
// Subscribes to store but does NOT affect Entity props
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
  const isAdminMode = useKioskStore(state => state.isAdminMode)
  
  // Easing function
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }
  
  // Lerp helper
  const lerp = (start: number, end: number, t: number): number => {
    return start + (end - start) * t
  }
  
  useEffect(() => {
    if (isAdminMode) return
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
  }, [isTransitioning, targetViewpoint, app, completeTransition, isAdminMode])
  
  return null
}

// ============================================
// Admin Mode Controller - adds/removes CameraControls imperatively
// ============================================
function AdminModeController() {
  const app = useApp()
  const isAdminMode = useKioskStore(state => state.isAdminMode)
  const scriptInstanceRef = useRef<any>(null)
  
  useEffect(() => {
    if (!app) return
    
    const cameraEntity = app.root.findByName('camera')
    if (!cameraEntity) return
    
    if (isAdminMode) {
      // Add CameraControls script imperatively
      if (!cameraEntity.script) {
        cameraEntity.addComponent('script')
      }
      if (!scriptInstanceRef.current) {
        scriptInstanceRef.current = cameraEntity.script.create(CameraControls)
      }
    } else {
      // Remove CameraControls script
      if (scriptInstanceRef.current && cameraEntity.script) {
        cameraEntity.script.destroy(CameraControls)
        scriptInstanceRef.current = null
      }
    }
  }, [app, isAdminMode])
  
  return null
}

// ============================================
// Admin Camera Helper - for capturing positions
// ============================================
function AdminCameraHelper() {
  const app = useApp()
  const isAdminMode = useKioskStore(state => state.isAdminMode)
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
    
    ;(window as any).captureCamera = () => {
      const data = getCameraData()
      if (data) {
        const code = `{
  position: [${data.pos.map(v => v.toFixed(3)).join(', ')}],
  rotation: [${data.rot.map(v => v.toFixed(2)).join(', ')}],
}`
        console.log('Camera:', code)
        navigator.clipboard.writeText(code)
      }
      return data
    }
    
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
// Admin Camera Panel
// ============================================
function AdminCameraPanel() {
  const isAdminMode = useKioskStore(state => state.isAdminMode)
  const [cameraData, setCameraData] = useState({ pos: [0, 0, 0], rot: [0, 0, 0] })
  
  useEffect(() => {
    if (!isAdminMode) return
    const handler = (e: CustomEvent) => setCameraData(e.detail)
    window.addEventListener('camera-update', handler as EventListener)
    return () => window.removeEventListener('camera-update', handler as EventListener)
  }, [isAdminMode])
  
  if (!isAdminMode) return null
  
  return (
    <div 
      className="absolute z-40 bg-black/90 text-white p-4 rounded-lg font-mono text-sm"
      style={{ top: FRAME_WIDTH + 50, left: FRAME_WIDTH + 16 }}
    >
      <div className="text-yellow-400 mb-2">ADMIN MODE - Camera Capture</div>
      <div>Pos: [{cameraData.pos.map(v => v.toFixed(2)).join(', ')}]</div>
      <div>Rot: [{cameraData.rot.map(v => v.toFixed(1)).join(', ')}]</div>
      <button
        onClick={() => (window as any).captureCamera?.()}
        className="mt-3 w-full bg-blue-600 hover:bg-blue-500 py-2 rounded"
      >
        Copy to Clipboard
      </button>
      <div className="text-gray-500 text-xs mt-2">
        Left-drag: orbit | Scroll: zoom | Middle-drag: pan
      </div>
    </div>
  )
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
      <AdminModeController />
      <AdminCameraHelper />
    </>
  )
}

// ============================================
// Main Interactive Viewer Component
// ============================================
export function InteractiveViewer() {
  const isIdle = useKioskStore(state => state.isIdle)
  const isAdminMode = useKioskStore(state => state.isAdminMode)
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

      {/* UI Layer - changes here won't affect PlayCanvas */}
      {!isAdminMode && <HotspotOverlay frameWidth={FRAME_WIDTH} />}
      <FrameOverlay frameWidth={FRAME_WIDTH} />
      {!isAdminMode && <InfoPanel frameWidth={FRAME_WIDTH} />}
      <NavigationBar frameWidth={FRAME_WIDTH} />
      <AdminToggle frameWidth={FRAME_WIDTH} />
      <AdminCameraPanel />
      {isIdle && !isAdminMode && <IdleOverlay />}
    </div>
  )
}

export default InteractiveViewer
