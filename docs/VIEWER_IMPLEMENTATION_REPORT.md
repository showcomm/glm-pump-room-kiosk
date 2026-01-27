# PlayCanvas Gaussian Splat Viewer - Implementation Report

## Overview

This document captures the key decisions, solutions, and patterns discovered while building the Gaussian splat viewer prototype for the Kingston Dry Dock Pump Room kiosk project.

**Repository:** https://github.com/showcomm/glm-pump-room-kiosk  
**Primary file:** `src/SplatTest.tsx`  
**Date:** January 27, 2026

---

## Package Versions (Critical)

```json
{
  "@playcanvas/react": "^0.11.0",
  "playcanvas": "2.11.8",
  "react": "^19.1.0"
}
```

### ⚠️ CRITICAL: PlayCanvas Version Pinning

**The `playcanvas` package MUST be pinned to exact version `2.11.8`** - do NOT use `^2.11.8`.

The caret (`^`) allows npm to resolve to newer minor versions (e.g., 2.15.x), which have breaking API changes that cause the viewer to fail silently. This was a major source of debugging pain.

**In package.json, always use:**
```json
"playcanvas": "2.11.8"
```

**NOT:**
```json
"playcanvas": "^2.11.8"
```

---

## Documentation Links

- **PlayCanvas React:** https://playcanvas-react.vercel.app/docs/
- **GSplat Component:** https://playcanvas-react.vercel.app/docs/api/components/splat
- **PlayCanvas Engine:** https://developer.playcanvas.com/en/api/
- **CameraControls Script:** Part of PlayCanvas ESM scripts (`playcanvas/scripts/esm/camera-controls.mjs`)

---

## Architecture

### Component Structure

```
SplatTest (main component)
├── CameraInfoPanel (UI overlay - outside Application)
├── FrameOverlay (decorative frame - outside Application)
└── Application (PlayCanvas context)
    ├── Entity[name="camera"]
    │   ├── Camera component
    │   └── Script[CameraControls]
    ├── PumpRoomSplat
    │   └── Entity > GSplat
    └── CameraCaptureHelper (exposes window.captureCamera)
```

### Key Pattern: UI Outside Application

UI elements (panels, overlays) must be placed **outside** the `<Application>` component. PlayCanvas takes over rendering inside Application, so React DOM elements won't display there.

```tsx
export default function SplatTest() {
  return (
    <div className="w-screen h-screen">
      {/* UI elements here - outside Application */}
      <CameraInfoPanel />
      <FrameOverlay />
      
      {/* PlayCanvas takes over inside Application */}
      <Application>
        <Entity name="camera">...</Entity>
        <PumpRoomSplat />
      </Application>
    </div>
  )
}
```

---

## Loading Gaussian Splats

### The useSplat Hook

```tsx
import { useSplat } from '@playcanvas/react/hooks'

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
```

### Splat File Location

Place `.ply` files in `/public/` directory. Reference with leading slash:

```tsx
const SPLAT_URL = '/pump-room.ply'
```

---

## Camera System

### CameraControls Script

Import from PlayCanvas ESM scripts:

```tsx
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs'

<Entity name="camera" position={[0, 2, 5]} rotation={[0, 0, 0]}>
  <Camera 
    clearColor="#1a1a2e"
    fov={60}
    farClip={1000}
    nearClip={0.01}
  />
  <Script script={CameraControls} />
</Entity>
```

### Default Controls

- **Left drag:** Orbit (changes pitch/yaw)
- **Middle drag:** Pan
- **Scroll wheel:** Zoom
- **Roll (Z rotation):** Always 0 with orbit controls (this is normal)

### Camera Position Capture

The CameraControls script uses an orbit camera model. To read the current camera state:

```tsx
function CameraCaptureHelper() {
  const app = useApp()
  
  useEffect(() => {
    if (!app) return
    
    const getCameraData = () => {
      const cameraEntity = app.root.findByName('camera')
      if (!cameraEntity) return null
      
      const pos = cameraEntity.getPosition()
      const rot = cameraEntity.getEulerAngles()
      
      return {
        pos: [pos.x, pos.y, pos.z],
        rot: [rot.x, rot.y, rot.z]
      }
    }
    
    // Expose to console for debugging
    ;(window as any).captureCamera = getCameraData
    
    return () => {
      delete (window as any).captureCamera
    }
  }, [app])
  
  return null
}
```

### Live Camera Updates

Use `requestAnimationFrame` loop to continuously broadcast position:

```tsx
const updateLoop = () => {
  const data = getCameraData()
  if (data) {
    window.dispatchEvent(new CustomEvent('camera-update', { detail: data }))
  }
  frameRef.current = requestAnimationFrame(updateLoop)
}
```

### Setting Initial Camera Position

Pass position and rotation arrays to the Entity:

```tsx
const INITIAL_CAMERA = {
  position: [-0.005, -6.86, 0.296] as [number, number, number],
  rotation: [87.53, -0.96, 0] as [number, number, number]
}

<Entity 
  name="camera" 
  position={INITIAL_CAMERA.position}
  rotation={INITIAL_CAMERA.rotation}
>
```

---

## Styling & Frame Overlay

### Frame That Sits ON TOP of Viewport

Build the frame from 4 separate edge divs so the center is transparent:

```tsx
function FrameOverlay() {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Top edge */}
      <div className="absolute top-0 left-0 right-0" style={{ height: FRAME_WIDTH, ... }} />
      {/* Bottom edge */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: FRAME_WIDTH, ... }} />
      {/* Left edge */}
      <div className="absolute left-0" style={{ top: FRAME_WIDTH, bottom: FRAME_WIDTH, width: FRAME_WIDTH, ... }} />
      {/* Right edge */}
      <div className="absolute right-0" style={{ top: FRAME_WIDTH, bottom: FRAME_WIDTH, width: FRAME_WIDTH, ... }} />
      
      {/* Inner shadow for depth effect - no background! */}
      <div style={{
        top: FRAME_WIDTH, left: FRAME_WIDTH, right: FRAME_WIDTH, bottom: FRAME_WIDTH,
        boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.7), ...'
      }} />
    </div>
  )
}
```

**Key insight:** The inner shadow div must have NO background color - only box-shadow. Otherwise it blocks the viewport.

### Inset Application Container

Position the Application inside the frame area:

```tsx
<div className="absolute" style={{ 
  top: FRAME_WIDTH, 
  left: FRAME_WIDTH, 
  right: FRAME_WIDTH, 
  bottom: FRAME_WIDTH 
}}>
  <Application>...</Application>
</div>
```

---

## Lessons Learned

### 1. Incremental Changes Only

When the viewer breaks, it's extremely hard to debug. Make ONE change at a time and test after each. Don't refactor multiple things at once.

### 2. Version Pinning is Critical

WebGL libraries are sensitive to version changes. Always pin exact versions for playcanvas and @playcanvas/react.

### 3. Clean Reinstall When Stuck

If things break mysteriously:
```bash
rm -rf node_modules
npm install
npm run dev
```

### 4. UI Must Be Outside Application

React DOM elements inside `<Application>` won't render. Place all UI overlays as siblings, not children.

### 5. Frame Overlays Need Transparent Centers

Don't use a solid background with a "cutout" - use separate edge pieces so the center is truly transparent.

### 6. Console Functions for Debugging

Expose helpers to `window` for console debugging:
```tsx
;(window as any).captureCamera = () => { ... }
```

Then in browser console: `captureCamera()`

---

## Configuration Reference

Current configuration values in `SplatTest.tsx`:

```tsx
// Splat file path (in /public/)
const SPLAT_URL = '/pump-room.ply'

// Frame width in pixels
const FRAME_WIDTH = 24

// Initial camera position and rotation
const INITIAL_CAMERA = {
  position: [-0.005, -6.86, 0.296] as [number, number, number],
  rotation: [87.53, -0.96, 0] as [number, number, number]
}
```

---

## Next Steps for Kiosk Implementation

When implementing in the full kiosk system:

1. **Admin Backend:** Add UI to capture and save camera positions to database
2. **Preset Positions:** Store named viewpoints that visitors can tap to navigate to
3. **Animated Transitions:** Implement smooth camera movement between positions
4. **Hotspots:** Add touch targets that trigger camera transitions
5. **Idle/Attract Mode:** Return to default position after timeout

---

## Files in This Prototype

- `src/SplatTest.tsx` - Main viewer component (this is the reference implementation)
- `src/main.tsx` - Entry point (line 9 toggles between SplatTest and main App)
- `public/pump-room.ply` - Gaussian splat file (user-provided, not in repo)
- `package.json` - Dependencies (note pinned playcanvas version)
