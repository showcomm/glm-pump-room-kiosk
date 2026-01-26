import { useState } from 'react';
import { SparkViewer } from './splat-test/SparkViewer';
import { GaussianSplats3DViewer } from './splat-test/GaussianSplats3DViewer';

export type SplatFormat = 'ply' | 'splat' | 'sog';

export interface SplatComparisonTestProps {
  onBack: () => void;
}

export function SplatComparisonTest({ onBack }: SplatComparisonTestProps) {
  // You'll replace this with your actual file URL after uploading to Dropbox/GitHub
  const [splatUrl, setSplatUrl] = useState<string>('');
  const [format, setFormat] = useState<SplatFormat>('ply');
  const [urlInput, setUrlInput] = useState<string>('');

  const handleLoadSplat = () => {
    if (urlInput.trim()) {
      setSplatUrl(urlInput.trim());
    }
  };

  return (
    <div className="w-full h-full bg-[#1f1c1a] flex flex-col">
      {/* Header */}
      <div className="h-16 bg-[#2a2622] flex items-center justify-between px-6 border-b border-[#3d3530]">
        <h1 className="text-2xl font-bold text-[#d4c5b0]">
          Gaussian Splat Renderer Comparison
        </h1>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#8b6f47] hover:bg-[#a08759] text-white rounded transition-colors"
        >
          Back
        </button>
      </div>

      {/* URL Input */}
      <div className="bg-[#2a2622] p-4 border-b border-[#3d3530]">
        <div className="flex gap-4 items-center max-w-6xl mx-auto">
          <div className="flex-1">
            <label className="block text-[#d4c5b0] text-sm mb-2">
              Splat File URL (from Dropbox, GitHub, or local server):
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/your-splat-file.ply"
              className="w-full px-3 py-2 bg-[#1f1c1a] text-[#d4c5b0] border border-[#3d3530] rounded focus:outline-none focus:border-[#8b6f47]"
            />
          </div>
          
          <div>
            <label className="block text-[#d4c5b0] text-sm mb-2">Format:</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as SplatFormat)}
              className="px-3 py-2 bg-[#1f1c1a] text-[#d4c5b0] border border-[#3d3530] rounded focus:outline-none focus:border-[#8b6f47]"
            >
              <option value="ply">.ply</option>
              <option value="splat">.splat</option>
              <option value="sog">.sog</option>
            </select>
          </div>

          <button
            onClick={handleLoadSplat}
            disabled={!urlInput.trim()}
            className="px-6 py-2 bg-[#8b6f47] hover:bg-[#a08759] disabled:bg-[#3d3530] text-white rounded transition-colors mt-6"
          >
            Load Splat
          </button>
        </div>

        {!splatUrl && (
          <div className="mt-4 p-4 bg-[#3d3530] rounded max-w-6xl mx-auto">
            <p className="text-[#d4c5b0] text-sm">
              <strong>Instructions:</strong>
            </p>
            <ol className="text-[#d4c5b0] text-sm mt-2 space-y-1 list-decimal list-inside">
              <li>Export a .ply, .splat, or .sog file from Brush</li>
              <li>Upload it to Dropbox or commit to GitHub</li>
              <li>Get the direct download URL</li>
              <li>Paste the URL above and click Load Splat</li>
            </ol>
            <p className="text-[#d4c5b0] text-sm mt-3">
              <strong>For local testing:</strong> Run <code className="bg-[#1f1c1a] px-2 py-1 rounded">python -m http.server 8000</code> in your splat directory and use <code className="bg-[#1f1c1a] px-2 py-1 rounded">http://localhost:8000/filename.ply</code>
            </p>
          </div>
        )}
      </div>

      {/* Split View */}
      {splatUrl && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Spark */}
          <div className="flex-1 flex flex-col border-r border-[#3d3530]">
            <div className="h-12 bg-[#2a2622] flex items-center justify-center border-b border-[#3d3530]">
              <h2 className="text-lg font-semibold text-[#d4c5b0]">
                Spark (World Labs)
              </h2>
            </div>
            <div className="flex-1 relative">
              <SparkViewer url={splatUrl} format={format} />
            </div>
          </div>

          {/* Right: GaussianSplats3D */}
          <div className="flex-1 flex flex-col">
            <div className="h-12 bg-[#2a2622] flex items-center justify-center border-b border-[#3d3530]">
              <h2 className="text-lg font-semibold text-[#d4c5b0]">
                GaussianSplats3D (mkkellogg)
              </h2>
            </div>
            <div className="flex-1 relative">
              <GaussianSplats3DViewer url={splatUrl} format={format} />
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Checklist */}
      {splatUrl && (
        <div className="h-48 bg-[#2a2622] border-t border-[#3d3530] p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-[#d4c5b0] mb-3">
            Evaluation Checklist:
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-[#d4c5b0]">
            <div>
              <h4 className="font-semibold mb-2">Visual Quality:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Brass fittings detail</li>
                <li>Cast iron texture</li>
                <li>Worn patina appearance</li>
                <li>Color accuracy</li>
                <li>Depth perception</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Performance:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Initial load time</li>
                <li>Camera rotation smoothness</li>
                <li>Memory usage (check DevTools)</li>
                <li>Touch responsiveness</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
