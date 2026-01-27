import { useEffect, useRef } from 'react'
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import { BackButton } from '../shared/BackButton'

interface EquipmentExplorerProps {
  onBack: () => void
}

export function EquipmentExplorer({ onBack }: EquipmentExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Prevent double initialization
    if (initializedRef.current) return
    if (!containerRef.current) return
    initializedRef.current = true

    const container = containerRef.current

    const viewer = new GaussianSplats3D.Viewer({
      cameraUp: [0, 1, 0],
      initialCameraPosition: [0, 2, 8],
      initialCameraLookAt: [0, 0, 0],
      rootElement: container,
      sharedMemoryForWorkers: false,
      selfDrivenMode: true,
      useBuiltInControls: true,
    })

    viewer.addSplatScene('/splats/export_10000.ply', {
      splatAlphaRemovalThreshold: 5,
      showLoadingUI: true,
      progressiveLoad: true,
    })
    .then(() => {
      console.log('Splat loaded!')
      viewer.start()
    })
    .catch((err: Error) => {
      console.error('Failed to load splat:', err)
    })

    // Intentionally no cleanup
  }, [])

  return (
    <div className="w-full h-full flex flex-col bg-[#1f1c1a]">
      <div className="flex items-center px-6 py-3 bg-[#2a2622] border-b border-[#3d3530]">
        <BackButton onBack={onBack} />
        <h2 className="text-xl font-semibold text-[#d4c5b0] ml-4">Splat Test</h2>
      </div>
      <div className="flex-1" ref={containerRef} />
    </div>
  )
}
