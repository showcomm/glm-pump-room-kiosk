import { useEffect, useRef, useState, useCallback } from 'react'
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import { BackButton } from '../shared/BackButton'

interface EquipmentExplorerProps {
  onBack: () => void
}

// Preset camera positions for testing
const CAMERA_PRESETS = [
  { name: 'Default', position: [0, 2, 8], target: [0, 0, 0] },
  { name: 'Top Down', position: [0, 10, 0.1], target: [0, 0, 0] },
  { name: 'Front', position: [0, 1, 6], target: [0, 1, 0] },
  { name: 'Side Left', position: [-6, 2, 0], target: [0, 1, 0] },
  { name: 'Side Right', position: [6, 2, 0], target: [0, 1, 0] },
  { name: 'Close Up', position: [0, 1.5, 3], target: [0, 1, 0] },
]

export function EquipmentExplorer({ onBack }: EquipmentExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  
  const [selectedFile, setSelectedFile] = useState('/splats/export_30000.ply')
  const [customPath, setCustomPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [splatInfo, setSplatInfo] = useState<{ count: number; loadTime: number } | null>(null)
  const [cameraInfo, setCameraInfo] = useState({ position: [0, 0, 0], target: [0, 0, 0] })
  const [showControls, setShowControls] = useState(true)

  // Available PLY files (add more as you create them)
  const availableFiles = [
    { name: 'Pump Room (30k iterations)', path: '/splats/export_30000.ply' },
    { name: 'Custom Path...', path: 'custom' },
  ]

  // Update camera info periodically
  const updateCameraInfo = useCallback(() => {
    if (viewerRef.current?.camera) {
      const cam = viewerRef.current.camera
      const controls = viewerRef.current.controls
      setCameraInfo({
        position: [
          parseFloat(cam.position.x.toFixed(2)),
          parseFloat(cam.position.y.toFixed(2)),
          parseFloat(cam.position.z.toFixed(2))
        ],
        target: controls ? [
          parseFloat(controls.target.x.toFixed(2)),
          parseFloat(controls.target.y.toFixed(2)),
          parseFloat(controls.target.z.toFixed(2))
        ] : [0, 0, 0]
      })
    }
  }, [])

  // Load splat function
  const loadSplat = useCallback(async (path: string) => {
    if (!containerRef.current) return

    // Cleanup existing viewer
    if (viewerRef.current) {
      viewerRef.current.dispose()
      viewerRef.current = null
    }

    setLoading(true)
    setError(null)
    setSplatInfo(null)

    const startTime = performance.now()

    try {
      // Create new viewer
      const viewer = new GaussianSplats3D.Viewer({
        cameraUp: [0, 1, 0],
        initialCameraPosition: [0, 2, 8],
        initialCameraLookAt: [0, 0, 0],
        rootElement: containerRef.current,
        sharedMemoryForWorkers: false,
        dynamicScene: false,
        selfDrivenMode: true,
        useBuiltInControls: true,
      })

      viewerRef.current = viewer

      console.log('Loading splat from:', path)

      // Load the splat scene
      await viewer.addSplatScene(path, {
        splatAlphaRemovalThreshold: 5,
        showLoadingUI: true,
        progressiveLoad: true,
      })

      // Configure controls
      const controls = viewer.controls
      if (controls) {
        controls.enableDamping = true
        controls.dampingFactor = 0.1
        controls.rotateSpeed = 0.5
        controls.zoomSpeed = 1.0
        controls.minDistance = 0.5
        controls.maxDistance = 50
      }

      // Start rendering
      viewer.start()

      const loadTime = (performance.now() - startTime) / 1000

      // Get splat count if available
      let count = 0
      try {
        count = viewer.getSplatCount?.() || 0
      } catch (e) {
        console.log('Could not get splat count')
      }

      setSplatInfo({ count, loadTime })
      setLoading(false)

      // Start camera info updates
      const interval = setInterval(updateCameraInfo, 100)
      return () => clearInterval(interval)

    } catch (err: any) {
      console.error('Splat load error:', err)
      setError(err.message || 'Failed to load splat')
      setLoading(false)
    }
  }, [updateCameraInfo])

  // Load on mount and when file changes
  useEffect(() => {
    const path = selectedFile === 'custom' ? customPath : selectedFile
    if (path && path !== 'custom') {
      const cleanup = loadSplat(path)
      return () => {
        cleanup?.then(fn => fn?.())
        if (viewerRef.current) {
          viewerRef.current.dispose()
          viewerRef.current = null
        }
      }
    }
  }, [selectedFile, loadSplat])

  // Move camera to preset
  const moveCameraTo = (preset: typeof CAMERA_PRESETS[0]) => {
    if (viewerRef.current?.camera && viewerRef.current?.controls) {
      const camera = viewerRef.current.camera
      const controls = viewerRef.current.controls
      
      camera.position.set(...preset.position)
      controls.target.set(...preset.target)
      controls.update()
    }
  }

  // Copy camera position to clipboard
  const copyCameraPosition = () => {
    const code = `{ position: [${cameraInfo.position.join(', ')}], target: [${cameraInfo.target.join(', ')}] }`
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#1f1c1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#2a2622] border-b border-[#3d3530]">
        <BackButton onBack={onBack} />
        <h2 className="text-xl font-semibold text-[#d4c5b0]">
          Gaussian Splat Test Environment
        </h2>
        <button
          onClick={() => setShowControls(!showControls)}
          className="px-3 py-1 bg-[#3d3530] hover:bg-[#4d4540] text-[#d4c5b0] rounded text-sm"
        >
          {showControls ? 'Hide' : 'Show'} Controls
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Splat Viewer */}
        <div className="flex-1 relative" ref={containerRef}>
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1f1c1a]/90 z-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#8b6f47] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#d4c5b0]">Loading Gaussian Splat...</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white p-4 rounded z-20">
              <p className="font-semibold">Error Loading Splat</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Camera info overlay */}
          {!loading && splatInfo && (
            <div className="absolute bottom-4 left-4 bg-black/80 text-[#d4c5b0] p-3 rounded text-sm font-mono z-10">
              <p className="text-[#8b6f47] font-semibold mb-2">Camera Position</p>
              <p>pos: [{cameraInfo.position.join(', ')}]</p>
              <p>target: [{cameraInfo.target.join(', ')}]</p>
              <button
                onClick={copyCameraPosition}
                className="mt-2 px-2 py-1 bg-[#8b6f47] hover:bg-[#a08759] rounded text-xs"
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          {/* Controls hint */}
          <div className="absolute bottom-4 right-4 bg-black/80 text-[#d4c5b0] p-3 rounded text-xs z-10">
            <p>🖱️ Left-drag: Rotate</p>
            <p>🖱️ Scroll: Zoom</p>
            <p>🖱️ Right-drag: Pan</p>
          </div>
        </div>

        {/* Control Panel */}
        {showControls && (
          <div className="w-80 bg-[#2a2622] border-l border-[#3d3530] p-4 overflow-y-auto">
            {/* File Selection */}
            <section className="mb-6">
              <h3 className="text-[#8b6f47] font-semibold mb-3">PLY File</h3>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="w-full px-3 py-2 bg-[#1f1c1a] text-[#d4c5b0] border border-[#3d3530] rounded mb-2"
              >
                {availableFiles.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name}
                  </option>
                ))}
              </select>

              {selectedFile === 'custom' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="/splats/your-file.ply"
                    className="flex-1 px-3 py-2 bg-[#1f1c1a] text-[#d4c5b0] border border-[#3d3530] rounded text-sm"
                  />
                  <button
                    onClick={() => loadSplat(customPath)}
                    className="px-3 py-2 bg-[#8b6f47] hover:bg-[#a08759] text-white rounded"
                  >
                    Load
                  </button>
                </div>
              )}
            </section>

            {/* Splat Info */}
            {splatInfo && (
              <section className="mb-6">
                <h3 className="text-[#8b6f47] font-semibold mb-3">Splat Info</h3>
                <div className="bg-[#1f1c1a] p-3 rounded text-sm text-[#d4c5b0]">
                  <p>Splats: {splatInfo.count.toLocaleString() || 'N/A'}</p>
                  <p>Load time: {splatInfo.loadTime.toFixed(2)}s</p>
                </div>
              </section>
            )}

            {/* Camera Presets */}
            <section className="mb-6">
              <h3 className="text-[#8b6f47] font-semibold mb-3">Camera Presets</h3>
              <div className="grid grid-cols-2 gap-2">
                {CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => moveCameraTo(preset)}
                    className="px-3 py-2 bg-[#3d3530] hover:bg-[#4d4540] text-[#d4c5b0] rounded text-sm"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </section>

            {/* Future: Animation Controls */}
            <section className="mb-6">
              <h3 className="text-[#8b6f47] font-semibold mb-3">Animation</h3>
              <div className="bg-[#1f1c1a] p-3 rounded text-sm text-[#d4c5b0]/60">
                <p>Coming soon:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Animated camera moves</li>
                  <li>Easing functions</li>
                  <li>Waypoint recording</li>
                </ul>
              </div>
            </section>

            {/* Future: Masking Controls */}
            <section className="mb-6">
              <h3 className="text-[#8b6f47] font-semibold mb-3">Masking</h3>
              <div className="bg-[#1f1c1a] p-3 rounded text-sm text-[#d4c5b0]/60">
                <p>Coming soon:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Clipping planes</li>
                  <li>Region highlighting</li>
                  <li>Opacity controls</li>
                </ul>
              </div>
            </section>

            {/* Reload Button */}
            <button
              onClick={() => {
                const path = selectedFile === 'custom' ? customPath : selectedFile
                if (path) loadSplat(path)
              }}
              className="w-full px-4 py-2 bg-[#8b6f47] hover:bg-[#a08759] text-white rounded"
            >
              Reload Splat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
