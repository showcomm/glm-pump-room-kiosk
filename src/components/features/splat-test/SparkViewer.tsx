import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SplatMesh } from '@sparkjsdev/spark';
import type { SplatFormat } from '../SplatComparisonTest';
import { getDirectDownloadUrl } from './urlUtils';

interface SparkViewerProps {
  url: string;
  format: SplatFormat;
}

export function SparkViewer({ url, format }: SparkViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    setLoading(true);
    setLoadError(null);

    // Create our own Three.js scene (not using R3F)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1f1c1a');

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minAzimuthAngle = -Math.PI / 2;
    controls.maxAzimuthAngle = Math.PI / 2;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.target.set(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Transform URL for direct download
    const directUrl = getDirectDownloadUrl(url);
    console.log('Spark: Loading from', directUrl);

    // Create Spark splat mesh
    let splatMesh: THREE.Object3D | null = null;
    
    try {
      splatMesh = new SplatMesh({ url: directUrl });
      splatMesh.position.set(0, 0, 0);
      scene.add(splatMesh);
      setLoading(false);
    } catch (err) {
      console.error('Spark: Failed to create SplatMesh:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to create splat mesh');
      setLoading(false);
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      if (splatMesh) {
        scene.remove(splatMesh);
        if ('dispose' in splatMesh && typeof splatMesh.dispose === 'function') {
          (splatMesh as any).dispose();
        }
      }
    };
  }, [url]);

  // Log format info
  useEffect(() => {
    if (format === 'sog') {
      console.log('Spark: Loading .sog format - this should work well');
    } else if (format === 'ply') {
      console.log('Spark: Loading .ply format');
    } else if (format === 'splat') {
      console.log('Spark: Loading .splat format');
    }
  }, [format]);

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1f1c1a] z-20">
          <div className="text-[#d4c5b0] text-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#8b6f47] border-t-transparent rounded-full mx-auto mb-3" />
            <p>Loading splat...</p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white p-4 rounded z-30">
          <p className="font-semibold">Spark Error:</p>
          <p className="text-sm mt-1">{loadError}</p>
        </div>
      )}

      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-[#d4c5b0] text-xs p-3 rounded z-10">
        <p><strong>Spark v0.1.10</strong></p>
        <p>Format: {format.toUpperCase()}</p>
        <p className="mt-2">
          Drag to rotate<br />
          Scroll to zoom
        </p>
      </div>
    </div>
  );
}
