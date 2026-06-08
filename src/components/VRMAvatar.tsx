'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';

function VRMModel({ isSpeaking }: { isSpeaking: boolean }) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const { scene, camera } = useThree();

  useEffect(() => {
    // Adjust camera to focus on face/bust
    camera.position.set(0, 1.4, 1.5);
    camera.lookAt(0, 1.4, 0);

    const loader = new GLTFLoader();
    
    // Install VRMLoaderPlugin
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });

    // We assume the user has placed a vrm model at public/avatar.vrm
    loader.load(
      '/avatar.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;
        
        // Disable frustum culling
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        
        vrm.scene.traverse((obj: any) => {
          obj.frustumCulled = false;
        });

        // Add VRM to scene
        scene.add(vrm.scene);
        
        // Face the camera
        vrm.scene.rotation.y = Math.PI;

        setVrm(vrm);
      },
      (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
      (error) => console.error('Failed to load VRM. Please place avatar.vrm in the public folder.', error)
    );

    return () => {
      if (vrm) {
        scene.remove(vrm.scene);
        // vrm.dispose is not a valid method on VRM instances in the current version of @pixiv/three-vrm
      }
    };
  }, [scene, camera]);

  useFrame((state, delta) => {
    if (vrm) {
      vrm.update(delta);

      // Simple idle animation (breathing/swaying)
      const t = state.clock.getElapsedTime();
      if (vrm.humanoid) {
        const spine = vrm.humanoid.getNormalizedBoneNode('spine');
        if (spine) {
          spine.rotation.x = Math.sin(t) * 0.02;
          spine.rotation.y = Math.cos(t * 0.8) * 0.02;
        }
        
        const head = vrm.humanoid.getNormalizedBoneNode('head');
        if (head) {
          head.rotation.x = Math.sin(t * 1.2) * 0.01;
          head.rotation.y = Math.sin(t * 0.5) * 0.02;
        }
      }

      // Blink occasionally
      if (vrm.expressionManager) {
        const blinkValue = Math.sin(t * 3) > 0.98 ? 1 : 0;
        vrm.expressionManager.setValue('blink', blinkValue);

        // Fake Lip-sync when speaking
        if (isSpeaking) {
          // Rapidly cycle through vowels to simulate talking
          const speed = 15;
          const talkCycle = (Math.sin(t * speed) + 1) / 2; // 0 to 1
          
          // Reset other expressions
          vrm.expressionManager.setValue('aa', 0);
          vrm.expressionManager.setValue('ih', 0);
          vrm.expressionManager.setValue('ou', 0);
          vrm.expressionManager.setValue('ee', 0);
          vrm.expressionManager.setValue('oh', 0);

          // Randomly pick a vowel based on time
          const vowelIndex = Math.floor(t * speed) % 5;
          const vowels = ['aa', 'ih', 'ou', 'ee', 'oh'];
          vrm.expressionManager.setValue(vowels[vowelIndex], talkCycle * 0.8);
        } else {
          // Close mouth
          vrm.expressionManager.setValue('aa', 0);
          vrm.expressionManager.setValue('ih', 0);
          vrm.expressionManager.setValue('ou', 0);
          vrm.expressionManager.setValue('ee', 0);
          vrm.expressionManager.setValue('oh', 0);
        }
        
        vrm.expressionManager.update();
      }
    }
  });

  return null;
}

export default function VRMAvatar({ isSpeaking = false }: { isSpeaking?: boolean }) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#1a1b26] to-[#0f1016] rounded-t-2xl overflow-hidden relative">
      <Canvas>
        <ambientLight intensity={0.8} color="#ffffff" />
        <directionalLight position={[0, 2, 2]} intensity={1.5} color="#e0e7ff" />
        <directionalLight position={[-2, 1, -1]} intensity={0.5} color="#818cf8" />
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          minPolarAngle={Math.PI / 2.5} 
          maxPolarAngle={Math.PI / 2.1} 
        />
        <VRMModel isSpeaking={isSpeaking} />
      </Canvas>
      
      {/* Decorative scanning line effect for "AI" vibe */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-t-2xl">
        <div className="w-full h-1 bg-indigo-500/20 absolute top-0 animate-scan shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ animation: 'scan 4s linear infinite' }} />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
