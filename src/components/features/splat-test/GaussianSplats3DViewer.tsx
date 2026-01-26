import { useEffect, useRef, useState } from 'react';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import type { SplatFormat } from '../SplatComparisonTest';

interface GaussianSplats3DViewerProps {
  url: string;
  format: SplatFormat;
}

// Helper to convert Dropbox URLs to direct download format
const getDirectDownloadUrl = (url: string): string => {
  if (url.includes('dropbox.com')) {
    // Change dl=0 to dl=1 for direct download
    // Also use dl.dropboxusercontent.com for better compatibility
    return url.replace('dl=0', 'dl=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }
  return url;
};

export function GaussianSplats3DViewer({ url, format }: GaussianSplats3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    setLoading(true);
    setLoadError(null);

    // Create viewer (no init() method needed!)
    const viewer = new GaussianSplats3D.Viewer({
      cameraUp: [0, 1, 0],
      initialCameraPosition: [0, 2, 5],
      initialCameraLookAt: [0, 0, 0],
      sharedMemoryForWorkers: false,
    });

    viewerRef.current = viewer;

    // Convert URL to direct download format (fixes Dropbox links)
    const directUrl = getDirectDownloadUrl(url);
    console.log('Loading splat scene from:', directUrl);

    // Add scene directly - returns a promise
    viewer.addSplatScene(directUrl, {
      splatAlphaRemovalThreshold: 5,
      showLoadingUI: false,
      progressiveLoad: true,
    })
    .then(() => {
      // Set camera constraints
      const controls = viewer.controls;
      if (controls) {
        controls.minPolarAngle = Math.PI / 6;
        controls.maxPolarAngle = Math.PI / 2;
        controls.minAzimuthAngle = -Math.PI / 2;
        controls.maxAzimuthAngle = Math.PI / 2;
        controls.enablePan = false;
        controls.minDistance = 2;
        controls.maxDistance = 10;
      }
      
      viewer.start();
      setLoading(false);
    })
    .catch((err: Error) => {
      console.error('GaussianSplats3D loading error:', err);
      setLoadError(err.message || 'Failed to load splat');
      setLoading(false);
    });

    // Mount to container
    if (containerRef.current && viewer.rootElement) {
      containerRef.current.appendChild(viewer.rootElement);
    }

    // Cleanup
    return () => {
      if (viewer) {
        viewer.dispose();
      }
    };
  }, [url]);

  // Show format warning
  useEffect(() => {
    if (format === 'sog') {
      setLoadError('GaussianSplats3D does not support .sog format. Try .ply or .splat instead.');
    }
  }, [format]);

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1f1c1a]">
          <div className="text-[#d4c5b0] text-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#8b6f47] border-t-transparent rounded-full mx-auto mb-3" />
            <p>Loading splat...</p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white p-4 rounded z-10">
          <p className="font-semibold">GaussianSplats3D Error:</p>
          <p className="text-sm mt-1">{loadError}</p>
          {format === 'sog' && (
            <p className="text-sm mt-2">
              This renderer doesn't support .sog format. Use Brush's .ply export instead.
            </p>
          )}
        </div>
      )}

      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-[#d4c5b0] text-xs p-3 rounded z-10">
        <p><strong>GaussianSplats3D v0.4.7</strong></p>
        <p>Format: {format.toUpperCase()}</p>
        <p className="mt-2">
          Drag to rotate<br />
          Scroll to zoom
        </p>
        {format === 'sog' && (
          <p className="mt-2 text-yellow-500">
            ⚠️ .sog not supported
          </p>
        )}
      </div>
    </div>
  );
}