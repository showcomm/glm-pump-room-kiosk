import { useState } from 'react'
import '@playcanvas/blocks'
import { BackButton } from '../shared/BackButton'

// Declare the web component for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'pc-splat-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string
      }, HTMLElement>
    }
  }
}

interface EquipmentExplorerProps {
  onBack: () => void
}

export function EquipmentExplorer({ onBack }: EquipmentExplorerProps) {
  const [plyPath, setPlyPath] = useState('/splats/export_10000.ply')
  const [loadedPath, setLoadedPath] = useState('/splats/export_10000.ply')

  const loadSplat = () => {
    setLoadedPath(plyPath)
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#1f1c1a]">
      {/* Header */}
      <div className="flex items-center px-6 py-3 bg-[#2a2622] border-b border-[#3d3530]">
        <BackButton onBack={onBack} />
        <h2 className="text-xl font-semibold text-[#d4c5b0] ml-4">Splat Test</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Viewer - using PlayCanvas web component */}
        <div className="flex-1 relative">
          <pc-splat-viewer
            src={loadedPath}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
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
