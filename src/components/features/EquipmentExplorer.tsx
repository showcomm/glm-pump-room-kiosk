import { useState, useRef } from 'react'
import { BackButton } from '../shared/BackButton'

interface EquipmentExplorerProps {
  onBack: () => void
}

export function EquipmentExplorer({ onBack }: EquipmentExplorerProps) {
  const [plyPath, setPlyPath] = useState('/splats/export_10000.ply')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const loadSplat = () => {
    // Reload iframe with new path as query param
    if (iframeRef.current) {
      iframeRef.current.src = `/tests/splat-viewer.html?src=${encodeURIComponent(plyPath)}`
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#1f1c1a]">
      {/* Header */}
      <div className="flex items-center px-6 py-3 bg-[#2a2622] border-b border-[#3d3530]">
        <BackButton onBack={onBack} />
        <h2 className="text-xl font-semibold text-[#d4c5b0] ml-4">Splat Test</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Viewer - iframe embedding the working HTML viewer */}
        <div className="flex-1 relative bg-black">
          <iframe
            ref={iframeRef}
            src={`/tests/splat-viewer.html?src=${encodeURIComponent(plyPath)}`}
            className="w-full h-full border-0"
            title="Splat Viewer"
          />
        </div>

        {/* Control Panel */}
        <div className="w-72 bg-[#2a2622] border-l border-[#3d3530] p-4 overflow-y-auto flex-shrink-0">
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

          {/* Quick presets */}
          <section className="mb-6">
            <h3 className="text-[#8b6f47] font-semibold mb-2">Presets</h3>
            <button
              onClick={() => {
                setPlyPath('/splats/export_10000.ply')
                if (iframeRef.current) {
                  iframeRef.current.src = `/tests/splat-viewer.html?src=${encodeURIComponent('/splats/export_10000.ply')}`
                }
              }}
              className="w-full px-3 py-2 bg-[#3d3530] hover:bg-[#4d4540] text-[#d4c5b0] rounded text-sm mb-2"
            >
              10k Steps
            </button>
            <button
              onClick={() => {
                setPlyPath('/splats/export_30000.ply')
                if (iframeRef.current) {
                  iframeRef.current.src = `/tests/splat-viewer.html?src=${encodeURIComponent('/splats/export_30000.ply')}`
                }
              }}
              className="w-full px-3 py-2 bg-[#3d3530] hover:bg-[#4d4540] text-[#d4c5b0] rounded text-sm mb-2"
            >
              30k Steps
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
