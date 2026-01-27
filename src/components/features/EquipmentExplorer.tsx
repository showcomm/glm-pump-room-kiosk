import { useState, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Splat, OrbitControls } from '@react-three/drei'
import { BackButton } from '../shared/BackButton'
import * as THREE from 'three'

interface EquipmentExplorerProps {
  onBack: () => void
}

const CAMERA_PRESETS = [
  { name: 'Default', position: [0, 2, 8], target: [0, 0, 0] },
  { name: 'Top Down', position: [0, 10, 0.1], target: [0, 0, 0] },
  { name: 'Front', position: [0, 1, 6], target: [0, 1, 0] },
  { name: 'Side Left', position: [-6, 2, 0], target: [0, 1, 0] },
  { name: 'Side Right', position: [6, 2, 0], target: [0, 1, 0] },
  { name: 'Close Up', position: [0, 1.5, 3], target: [0, 1, 0] },
]

// Component to track camera position
function CameraTracker({ onCameraUpdate }: { onCameraUpdate: (pos: number[], target: number[]) => void }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  
  useFrame(() => {
    if (camera && controlsRef.current) {
      const target = controlsRef.current.target
      onCameraUpdate(
        [
          parseFloat(camera.position.x.toFixed(2)),
          parseFloat(camera.position.y.toFixed(2)),
          parseFloat(camera.position.z.toFixed(2))
        ],
        [
          parseFloat(target.x.toFixed(2)),
          parseFloat(target.y.toFixed(2)),
          parseFloat(target.z.toFixed(2))
        ]
      )
    }
  })
  
  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={0.5}
      maxDistance={50}
    />
  )
}

// Camera controller for presets
function CameraController({ preset }: { preset: { position: number[], target: number[] } | null }) {
  const { camera } = useThree()
  
  useFrame(() => {
    if (preset) {
      camera.position.set(preset.position[0], preset.position[1], preset.position[2])
    }
  })
  
  return null
}

export function EquipmentExplorer({ onBack }: EquipmentExplorerProps) {
  const [plyPath, setPlyPath] = useState('/splats/export_10000.ply')
  const [loadedPath, setLoadedPath] = useState('/splats/export_10000.ply')
  const [cameraInfo, setCameraInfo] = useState({ position: [0, 2, 8], target: [0, 0, 0] })
  const [activePreset, setActivePreset] = useState<typeof CAMERA_PRESETS[0] | null>(null)

  const handleCameraUpdate = (pos: number[], target: number[]) => {
    setCameraInfo({ position: pos, target })
  }

  const loadSplat = () => {
    setLoadedPath(plyPath)
  }

  const moveCameraTo = (preset: typeof CAMERA_PRESETS[0]) => {
    setActivePreset(preset)
    // Clear after a frame so it doesn't keep resetting
    setTimeout(() => setActivePreset(null), 100)
  }

  const copyCameraPosition = () => {
    const code = `{ position: [${cameraInfo.position.join(', ')}], target: [${cameraInfo.target.join(', ')}] }`
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#1f1c1a]">
      {/* Header */}
      <div className="flex items-center px-6 py-3 bg-[#2a2622] border-b border-[#3d3530]">
        <BackButton onBack={onBack} />
        <h2 className="text-xl font-semibold text-[#d4c5b0] ml-4">Splat Test</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <Canvas
            camera={{ position: [0, 2, 8], fov: 60 }}
            gl={{ antialias: true }}
          >
            <color attach="background" args={['#1a1816']} />
            
            <Splat src={loadedPath} />
            
            <CameraTracker onCameraUpdate={handleCameraUpdate} />
            {activePreset && <CameraController preset={activePreset} />}
          </Canvas>

          {/* Camera info overlay */}
          <div className="absolute bottom-4 left-4 bg-black/80 text-[#d4c5b0] p-3 rounded text-sm font-mono z-10">
            <p>pos: [{cameraInfo.position.join(', ')}]</p>
            <p>target: [{cameraInfo.target.join(', ')}]</p>
            <button
              onClick={copyCameraPosition}
              className="mt-2 px-2 py-1 bg-[#8b6f47] hover:bg-[#a08759] rounded text-xs"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Control Panel */}
        <div className="w-72 bg-[#2a2622] border-l border-[#3d3530] p-4 overflow-y-auto">
          {/* File Path */}
          <section className="mb-6">
            <h3 className="text-[#8b6f47] font-semibold mb-2">PLY File</h3>
            <input
              type="text"
              value={plyPath}
              onChange={(e) => setPlyPath(e.target.value)}
              className="w-full px-3 py-2 bg-[#1f1c1a] text-[#d4c5b0] border border-[#3d3530] rounded text-sm mb-2"
            />
            <button
              onClick={loadSplat}
              className="w-full px-3 py-2 bg-[#8b6f47] hover:bg-[#a08759] text-white rounded text-sm"
            >
              Load
            </button>
          </section>

          {/* Camera Presets */}
          <section className="mb-6">
            <h3 className="text-[#8b6f47] font-semibold mb-2">Camera Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => moveCameraTo(preset)}
                  className="px-2 py-2 bg-[#3d3530] hover:bg-[#4d4540] text-[#d4c5b0] rounded text-xs"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </section>

          {/* Controls hint */}
          <section className="text-[#d4c5b0]/60 text-xs">
            <p>🖱️ Left-drag: Rotate</p>
            <p>🖱️ Scroll: Zoom</p>
            <p>🖱️ Right-drag: Pan</p>
          </section>
        </div>
      </div>
    </div>
  )
}
