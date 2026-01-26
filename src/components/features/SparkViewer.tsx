import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SplatMesh } from '@sparkjsdev/spark';
import * as THREE from 'three';
import type { SplatFormat } from '../SplatComparisonTest';

interface SparkViewerProps {
  url: string;
  format: SplatFormat;
}

function SparkSplatMesh({ url }: { url: string }) {
  const meshRef = useRef<THREE.Object3D>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let splat: THREE.Object3D | null = null;
    
    const loadSplat = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create Spark splat mesh
        splat = new SplatMesh({ url });
        
        // Position it at origin
        splat.position.set(0, 0, 0);
        
        // Add to scene (this is done via the ref)
        if (meshRef.current) {
          meshRef.current.add(splat);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Spark loading error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load splat');
        setLoading(false);
      }
    };

    loadSplat();

    return () => {
      // Cleanup
      if (splat && meshRef.current) {
        meshRef.current.remove(splat);
        // Dispose of splat resources if available
        if ('dispose' in splat && typeof splat.dispose === 'function') {
          splat.dispose();
        }
      }
    };
  }, [url]);

  if (error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    );
  }

  return <group ref={meshRef} />;
}

export function SparkViewer({ url, format }: SparkViewerProps) {
  const [loadError, setLoadError] = useState<string | null>(null);

  // Show format warning for .sog
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
    <div className="w-full h-full relative">
      <Canvas
        camera={{
          position: [0, 2, 5],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}
        className="bg-[#1f1c1a]"
        onCreated={({ gl }) => {
          gl.setClearColor('#1f1c1a');
        }}
      >
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          minAzimuthAngle={-Math.PI / 2}
          maxAzimuthAngle={Math.PI / 2}
          enablePan={false}
          minDistance={2}
          maxDistance={10}
        />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        
        <SparkSplatMesh url={url} />
      </Canvas>

      {loadError && (
        <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white p-4 rounded">
          <p className="font-semibold">Spark Error:</p>
          <p className="text-sm mt-1">{loadError}</p>
        </div>
      )}

      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 bg-black/70 text-[#d4c5b0] text-xs p-3 rounded">
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
