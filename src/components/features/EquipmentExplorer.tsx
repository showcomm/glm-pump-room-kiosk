import { useEffect, useRef, useState } from 'react'
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import { BackButton } from '../shared/BackButton'

interface EquipmentExplorerProps {
  onBack: () => void
}

export function EquipmentExplorer({ onBack }: EquipmentExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    
    // Hardcoded path for testing
    const plyPath = '/splats/export_10000.ply'

    console.log('Creating viewer...')

    const viewer = new GaussianSplats3D.Viewer({
      cameraUp: [0, 1, 0],
      initialCameraPosition: [0, 2, 8],
      initialCameraLookAt: [0, 0, 0],
      rootElement: container,
      sharedMemoryForWorkers: false,
    })

    viewerRef.current = viewer

    console.log('Loading splat from:', plyPath)

    viewer.addSplatScene(plyPath, {
      splatAlphaRemovalThreshold: 5,
      showLoadingUI: false,
      progressiveLoad: true,
    })
    .then(() => {
      console.log('Splat loaded, starting viewer')
      viewer.start()
      setLoading(false)
    })
    .catch((err: Error) => {
      console.error('Failed to load splat:', err)
      setError(err.message)
      setLoading(false)
    })

    // No cleanup - let the viewer persist
  }, [])

  return (
    <div className="w-full h-full flex flex-col bg-[#1f1c1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#2a2622] border-b border-[#3d3530]">
        <BackButton onBack={onBack} />
        <h2 className="text-xl font-semibold text-[#d4c5b0]">
          Splat Test
        </h2>
        <div className="w-20" />
      </div>

      {/* Viewer */}
      <div className="flex-1 relative" ref={containerRef}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1f1c1a] z-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#8b6f47] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#d4c5b0]">Loading...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white p-4 rounded z-20">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
