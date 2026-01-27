import { useEffect, useRef, useState } from 'react'
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import { BackButton } from '../shared/BackButton'

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

export function EquipmentExplorer({ onBack }: EquipmentExplorerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const viewerContainerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<any>(null)
  const initializedRef = useRef(false)
  
  const [plyPath, setPlyPath] = useState('/splats/export_10000.ply')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cameraInfo, setCameraInfo] = useState({ position: [0, 0, 0], target: [0, 0, 0] })

  // Update camera info display
  useEffect(() => {
    const interval = setInterval(() => {
      if (viewerRef.current?.camera && viewerRef.current?.controls) {
        const cam = viewerRef.current.camera
        const ctrl = viewerRef.current.controls
        setCameraInfo({
          position: [
            parseFloat(cam.position.x.toFixed(2)),
            parseFloat(cam.position.y.toFixed(2)),
            parseFloat(cam.position.z.toFixed(2))
          ],
          target: [
            parseFloat(ctrl.target.x.toFixed(2)),
            parseFloat(ctrl.target.y.toFixed(2)),
            parseFloat(ctrl.target.z.toFixed(2))
          ]
        })
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  // Load splat
  const loadSplat = (path: string) => {
    if (!wrapperRef.current) return
    
    // Clean up previous viewer
    if (viewerRef.current) {
      try {
        viewerRef.current.dispose()
      } catch (e) {
        // ignore
      }
      viewerRef.current = null
    }
    
    // Remove old container if exists
    if (viewerContainerRef.current && wrapperRef.current.contains(viewerContainerRef.current)) {
      wrapperRef.current.removeChild(viewerContainerRef.current)
    }
    
    // Create fresh container for the library (not managed by React)
    const container = document.createElement('div')
    container.style.width = '100%'
    container.style.height = '100%'
    wrapperRef.current.appendChild(container)
    viewerContainerRef.current = container

    setLoading(true)
    setError(null)

    const viewer = new GaussianSplats3D.Viewer({
      cameraUp: [0, 1, 0],
      initialCameraPosition: [0, 2, 8],
      initialCameraLookAt: [0, 0, 0],
      rootElement: container,
      sharedMemoryForWorkers: false,
      selfDrivenMode: true,
      useBuiltInControls: true,
    })

    viewerRef.current = viewer

    viewer.addSplatScene(path, {
      splatAlphaRemovalThreshold: 5,
      showLoadingUI: true,
      progressiveLoad: true,
    })
    .then(() => {
      console.log('Splat loaded!')
      
      // Remove rotation restrictions
      const controls = viewer.controls
      if (controls) {
        controls.minAzimuthAngle = -Infinity
        controls.maxAzimuthAngle = Infinity
        controls.minPolarAngle = 0
        controls.maxPolarAngle = Math.PI
        controls.enableDamping = true
        controls.dampingFactor = 0.1
      }
      
      viewer.start()
      setLoading(false)
    })
    .catch((err: Error) => {
      console.error('Failed to load splat:', err)
      setError(err.message)
      setLoading(false)
    })
  }

  // Initial load
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    loadSplat(plyPath)
    
    // Cleanup on unmount
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.dispose()
        } catch (e) {
          // ignore
        }
      }
    }
  }, [])

  // Move camera to preset
  const moveCameraTo = (preset: typeof CAMERA_PRESETS[0]) => {
    if (viewerRef.current?.camera && viewerRef.current?.controls) {
      const camera = viewerRef.current.camera
      const controls = viewerRef.current.controls
      camera.position.set(preset.position[0], preset.position[1], preset.position[2])
      controls.target.set(preset.target[0], preset.target[1], preset.target[2])
      controls.update()
    }
  }

  // Copy camera position
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
        {/* Viewer wrapper - we manually manage children here */}
        <div className="flex-1 relative">
          <div ref={wrapperRef} className="absolute inset-0" />
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1f1c1a] z-20 pointer-events-none">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#8b6f47] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#d4c5b0]">Loading...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white p-4 rounded z-20">
              <p className="font-semibold">Error: {error}</p>
            </div>
          )}

          {/* Camera info overlay */}
          {!loading && (
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
          )}
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
              onClick={() => loadSplat(plyPath)}
              disabled={loading}
              className="w-full px-3 py-2 bg-[#8b6f47] hover:bg-[#a08759] disabled:bg-[#3d3530] text-white rounded text-sm"
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
