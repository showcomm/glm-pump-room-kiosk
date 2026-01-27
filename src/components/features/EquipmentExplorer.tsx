import { useState, Suspense } from 'react'
import { BackButton } from '../shared/BackButton'
import { Viewer } from '@playcanvas/blocks'

interface EquipmentExplorerProps {
  onBack: () => void
}

export function EquipmentExplorer({ onBack }: EquipmentExplorerProps) {
  const [plyPath, setPlyPath] = useState('/splats/export_10000.ply')
  const [currentSrc, setCurrentSrc] = useState('/splats/export_10000.ply')

  const loadSplat = () => {
    console.log('Loading splat:', plyPath)
    setCurrentSrc(plyPath)
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#1f1c1a]">
      {/* Header */}
      <div className="flex items-center px-6 py-3 bg-[#2a2622] border-b border-[#3d3530]">
        <BackButton onBack={onBack} />
        <h2 className="text-xl font-semibold text-[#d4c5b0] ml-4">Splat Test</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Viewer */}
        <div className="flex-1 relative bg-black" style={{ minHeight: '400px' }}>
          <Suspense fallback={<div className="text-white p-4">Loading viewer...</div>}>
            <Viewer.Splat 
              key={currentSrc}
              src={currentSrc}
              style={{ width: '100%', height: '100%' }}
            >
              <Viewer.Progress />
              <Viewer.Controls>
                <Viewer.CameraModeToggle />
              </Viewer.Controls>
            </Viewer.Splat>
          </Suspense>
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
            <p className="text-[#d4c5b0]/40 text-xs mt-2">Current: {currentSrc}</p>
          </section>

          {/* Quick test with known working URL */}
          <section className="mb-6">
            <h3 className="text-[#8b6f47] font-semibold mb-2">Test Files</h3>
            <button
              onClick={() => {
                const testUrl = 'https://raw.githubusercontent.com/playcanvas/model-viewer/main/examples/assets/bonsai.sogs'
                setPlyPath(testUrl)
                setCurrentSrc(testUrl)
              }}
              className="w-full px-3 py-2 bg-[#3d3530] hover:bg-[#4d4540] text-[#d4c5b0] rounded text-sm mb-2"
            >
              Load Demo (bonsai)
            </button>
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
