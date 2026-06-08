'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useGraph } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Point to a local avatar file. The user will need to place their own avatar.glb in the public folder.
const AVATAR_URL = '/avatar.glb';

class AvatarErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      );
    }
    return this.props.children;
  }
}

function Model({ audioAnalyzer }: { audioAnalyzer: AnalyserNode | null }) {
  const { scene } = useGLTF(AVATAR_URL);

  const { nodes, materials } = useGraph(scene);
  const headMeshRef = useRef<THREE.SkinnedMesh>(null);

  // Find the head mesh that contains morph targets (blendshapes) for the mouth
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.SkinnedMesh).isMesh && child.name.includes('Head')) {
        headMeshRef.current = child as THREE.SkinnedMesh;
      }
    });
  }, [scene]);

  // Audio-driven lip sync animation loop
  useFrame(() => {
    if (audioAnalyzer && headMeshRef.current && headMeshRef.current.morphTargetDictionary && headMeshRef.current.morphTargetInfluences) {
      const dataArray = new Uint8Array(audioAnalyzer.frequencyBinCount);
      audioAnalyzer.getByteFrequencyData(dataArray);

      // Calculate average volume from frequencies
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const averageVolume = sum / dataArray.length;

      // Map volume to mouth open blendshape (Ready Player Me uses 'mouthOpen' or 'viseme_aa')
      const mouthOpenAmount = Math.min(averageVolume / 50, 1.0); // Normalize and cap
      
      const dict = headMeshRef.current.morphTargetDictionary;
      const influences = headMeshRef.current.morphTargetInfluences;

      // Find common mouth-open morph targets
      const targetNames = ['mouthOpen', 'viseme_aa', 'jawOpen'];
      targetNames.forEach(name => {
        if (dict[name] !== undefined) {
          // Smooth the transition slightly
          influences[dict[name]] = THREE.MathUtils.lerp(influences[dict[name]], mouthOpenAmount, 0.2);
        }
      });
    }
  });

  return (
    <group position={[0, -1.5, 0]}>
      <primitive object={scene} />
    </group>
  );
}

export default function Avatar3D({ audioStream }: { audioStream: MediaStream | null }) {
  const [audioAnalyzer, setAudioAnalyzer] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      const source = ctx.createMediaStreamSource(audioStream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      setAudioAnalyzer(analyzer);

      return () => {
        source.disconnect();
        analyzer.disconnect();
      };
    } else {
      setAudioAnalyzer(null);
    }
  }, [audioStream]);

  return (
    <div className="w-full h-full relative bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/80">
      <Canvas camera={{ position: [0, 0, 1.5], fov: 40 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[0, 2, 5]} intensity={1.5} color="#e0e7ff" />
        <Environment preset="city" />
        
        {/* Soft shadow under avatar */}
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={5} blur={2} far={4} />

        <React.Suspense fallback={null}>
          <AvatarErrorBoundary>
            <Model audioAnalyzer={audioAnalyzer} />
          </AvatarErrorBoundary>
        </React.Suspense>

        {/* OrbitControls locked to front-facing */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          minAzimuthAngle={-0.2}
          maxAzimuthAngle={0.2}
        />
      </Canvas>

      {/* Loading overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 text-sm font-medium">Loading 3D Avatar...</p>
        </div>
      </div>
    </div>
  );
}
