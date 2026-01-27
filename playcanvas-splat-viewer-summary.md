# PlayCanvas React Gaussian Splat Viewer - Implementation Summary

## Project Context
- **Repo**: https://github.com/showcomm/glm-pump-room-kiosk
- **Purpose**: Museum kiosk displaying 3D Gaussian splat of Kingston Dry Dock pump room
- **Stack**: React + Vite + TypeScript + Tailwind CSS + PlayCanvas

## Current State (Jan 27, 2026)

### What's Working
- ✅ 300MB .ply Gaussian splat loads and renders
- ✅ Orbit camera controls (left-drag)
- ✅ Zoom (scroll wheel)
- ✅ Pan controls (right-drag or middle-drag)
- ✅ **Live camera position/rotation display** - Real-time updates
- ✅ **Camera capture** - Capture button and `captureCamera()` console function
- ✅ **16:9 aspect ratio viewport** - Matches kiosk display
- ✅ **Object position controls** - Move/rotate the splat model
- ✅ **Focus point display** - Shows where camera is looking
- ✅ **JSON export** - Copy camera state to clipboard

### Technical Architecture

```
SplatTest (main component)
├── 16:9 Aspect Container
│   ├── CameraInfoPanel (live camera data + capture)
│   ├── ObjectControls (position/rotation sliders)
│   ├── ControlsHelp (user instructions)
│   └── Application (PlayCanvas context)
│       ├── Entity[name="camera"]
│       │   ├── Camera component
│       │   └── Script[CameraControls] with attributes
│       ├── PumpRoomSplat (positioned/rotated)
│       │   └── Entity > GSplat
│       └── CameraCaptureHelper (reads actual camera state)
```

## Key Files

- `src/SplatTest.tsx` - Main test viewer (imported as App via main.tsx)
- `src/main.tsx` - Entry point
- `public/pump-room.ply` - The splat file (user-provided, not in repo)

## Dependencies (package.json)

```json
{
  "@playcanvas/react": "^0.11.0",
  "playcanvas": "2.11.8"  // EXACT version - do not use ^
}
```

**Critical**: PlayCanvas must be pinned to exact `2.11.8`. Version `^2.11.8` resolves to 2.15.x which has breaking API changes.

## Camera System

### How CameraControls Works

The PlayCanvas `CameraControls` script uses an orbit camera model:
- **Entity position** = the focus/pivot point (what camera looks at)
- **Actual camera position** = calculated from focus point + distance + pitch/yaw
- The script updates the Entity's world transform directly in its update loop

### Reading Camera State

```typescript
// Access via the Script component instance
const cameraEntity = app.root.findByName('camera')
const worldPos = cameraEntity.getPosition()     // Actual camera world position
const worldRot = cameraEntity.getEulerAngles()  // Actual rotation

// Access focusPoint from script instance
const scripts = cameraEntity.script
const controlScript = scripts._scripts[0]
const focusPoint = controlScript.focusPoint  // Where camera looks at
```

### CameraControls Configuration

```tsx
<Script 
  script={CameraControls}
  sceneSize={10}           // Scale for movement speed
  focusDamping={0.1}       // Smoothing when refocusing
  moveDamping={0.9}        // Pan smoothing
  rotateDamping={0.9}      // Orbit smoothing
  zoomDamping={0.9}        // Zoom smoothing
  zoomMin={0.5}            // Minimum zoom distance
  zoomMax={50}             // Maximum zoom distance
  pitchRange={[-90, 90]}   // Vertical angle limits
/>
```

## Controls

| Input | Action |
|-------|--------|
| Left drag | Orbit around focus point |
| Right drag | Pan (move focus point) |
| Middle drag | Pan (move focus point) |
| Scroll wheel | Zoom in/out |

## Console Functions

```javascript
// Capture and log current camera state
captureCamera()

// Get camera data without logging
getCameraData()
```

## Camera Capture Data Format

```json
{
  "position": [1.234, 2.567, 3.890],
  "rotation": [-15.5, 45.2, 0.0],
  "focusPoint": [0.0, 0.5, 0.0],
  "fov": 60.0
}
```

## 16:9 Viewport Implementation

The viewport uses CSS to maintain aspect ratio while fitting the window:

```tsx
<div 
  style={{
    width: 'min(100vw, calc(100vh * 16 / 9))',
    height: 'min(100vh, calc(100vw * 9 / 16))',
  }}
>
```

This ensures the viewport is always 16:9 regardless of window size, with letterboxing on the gray background.

## Object Controls

Sliders allow real-time adjustment of:
- **Position**: X, Y, Z (-10 to +10)
- **Rotation**: X, Y, Z (-180° to +180°)

Useful for:
- Centering the splat model
- Correcting upside-down captures (rotate X by 180°)
- Fine-tuning initial view

## Next Steps for Kiosk Integration

1. **Preset Camera Positions**
   - Use capture tool to define viewpoints for each equipment piece
   - Store as JSON array
   - Animate camera transitions between presets

2. **Hotspot System**
   - Define clickable regions in 3D space
   - Associate hotspots with camera presets
   - Trigger info panels on hotspot selection

3. **Production Viewer**
   - Strip admin controls
   - Lock to preset camera movements only
   - Add touch event handling

## Files Not in Repo
- `/public/pump-room.ply` - User must provide their own splat file

## Related Docs
- PlayCanvas React: https://playcanvas-react.vercel.app/docs/
- CameraControls script: Part of PlayCanvas engine ESM scripts
- GSplat component: https://playcanvas-react.vercel.app/docs/api/components/splat
