"use client";

import React, { useEffect, useRef } from "react";
import { useGLTF, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { KTX2Loader } from "three-stdlib";

export function AvatarModel() {
  const { gl } = useThree();
  const { scene } = useGLTF("/model.glb", undefined, undefined, (loader: any) => {
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/");
    ktx2Loader.detectSupport(gl);
    loader.setKTX2Loader(ktx2Loader);
  });
  const blendshapesRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWS = () => {
      ws = new WebSocket("ws://127.0.0.1:11112");

      ws.onopen = () => {
        console.log("Connected to Audio2Face WebSocket");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          blendshapesRef.current = data;
        } catch (e) {
          // ignore parsing errors
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed, reconnecting...");
        reconnectTimeout = setTimeout(connectWS, 1000);
      };

      ws.onerror = () => {
        if (ws) ws.close();
      };
    };

    connectWS();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // Prevent reconnect on unmount
        ws.close();
      }
    };
  }, []);

    useFrame((state) => {
    const currentBlendshapes = blendshapesRef.current;

    // Procedural Breathing & Micro-movements (makes it look alive!)
    const t = state.clock.elapsedTime;
    scene.position.y = -1 + Math.sin(t * 2) * 0.005; // Gentle breathing up/down
    scene.rotation.y = Math.sin(t * 0.5) * 0.05; // Gentle head/body sway
    scene.rotation.x = Math.sin(t * 0.3) * 0.02;

    // Procedural Blinking (if A2F isn't sending blink data)
    // Blink every ~4 seconds
    let blinkValue = 0;
    if (t % 4 < 0.15) {
      blinkValue = Math.sin((t % 4) / 0.15 * Math.PI); // Smooth blink curve
    }

    if (!currentBlendshapes || Object.keys(currentBlendshapes).length === 0) {
      // Apply just blinks if no audio data
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetDictionary) {
          const mesh = child as THREE.Mesh;
          const influences = mesh.morphTargetInfluences;
          const dict = mesh.morphTargetDictionary;
          if (influences && dict) {
            // Reset all blendshape weights to 0.0 when idle
            for (let i = 0; i < influences.length; i++) {
              influences[i] = 0;
            }
            if (dict["eyeBlinkLeft"] !== undefined) {
               influences[dict["eyeBlinkLeft"]] = blinkValue;
            }
            if (dict["eyeBlinkRight"] !== undefined) {
               influences[dict["eyeBlinkRight"]] = blinkValue;
            }
          }
        }
      });
      return;
    }

    // Traverse the loaded GLTF scene and apply morph targets to all meshes
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetDictionary) {
        const mesh = child as THREE.Mesh;
        const dict = mesh.morphTargetDictionary;
        const influences = mesh.morphTargetInfluences;

        if (dict && influences) {
          // Map Audio2Face 'mark' output names to standard ARKit names
          const a2fToARKit: { [key: string]: string | string[] } = {
            "eyeBlink_L": "eyeBlinkLeft", "eyeBlink_R": "eyeBlinkRight",
            "eyeSquint_L": "eyeSquintLeft", "eyeSquint_R": "eyeSquintRight",
            "eyeDown_L": "eyeLookDownLeft", "eyeDown_R": "eyeLookDownRight",
            "eyeIn_L": "eyeLookInLeft", "eyeIn_R": "eyeLookInRight",
            "eyeOpen_L": "eyeWideLeft", "eyeOpen_R": "eyeWideRight",
            "eyeOut_L": "eyeLookOutLeft", "eyeOut_R": "eyeLookOutRight",
            "eyeUp_L": "eyeLookUpLeft", "eyeUp_R": "eyeLookUpRight",
            "browsD_L": "browDownLeft", "browsD_R": "browDownRight",
            "browsU_C": "browInnerUp", "browsU_L": "browOuterUpLeft", "browsU_R": "browOuterUpRight",
            "jawFwd": "jawForward", "jawLeft": "jawLeft", "jawOpen": "jawOpen", "jawRight": "jawRight",
            "mouthLeft": "mouthLeft", "mouthRight": "mouthRight",
            "mouthFrown_L": "mouthFrownLeft", "mouthFrown_R": "mouthFrownRight",
            "mouthSmile_L": "mouthSmileLeft", "mouthSmile_R": "mouthSmileRight",
            "mouthDimple_L": "mouthDimpleLeft", "mouthDimple_R": "mouthDimpleRight",
            "lipsStretch_L": "mouthStretchLeft", "lipsStretch_R": "mouthStretchRight",
            "lipsPucker": "mouthPucker", "lipsPress_L": "mouthPressLeft", "lipsPress_R": "mouthPressRight",
            "lipsFunnel": "mouthFunnel", "mouthRollUpper": "mouthRollUpper", "mouthRollLower": "mouthRollLower",
            "mouthShrugUpper": "mouthShrugUpper", "mouthShrugLower": "mouthShrugLower", "mouthClose": "mouthClose",
            "mouthUpperUp": ["mouthUpperUpLeft", "mouthUpperUpRight"],
            "mouthLowerDown": ["mouthLowerDownLeft", "mouthLowerDownRight"],
            "cheekPuff_L": "cheekPuff", "cheekPuff_R": "cheekPuff",
            "cheekSquint_L": "cheekSquintLeft", "cheekSquint_R": "cheekSquintRight",
            "noseSneer_L": "noseSneerLeft", "noseSneer_R": "noseSneerRight", "tongueOut": "tongueOut"
          };

          for (const [bsName, value] of Object.entries(currentBlendshapes)) {
            // Lower body shapes tend to be too intense from A2F mark outputs. Dampen them for realism.
            const isMouth = bsName.toLowerCase().includes("mouth") || bsName.toLowerCase().includes("jaw") || bsName.toLowerCase().includes("lip");
            const scalar = isMouth ? 0.6 : 1.0;
            let finalValue = value * scalar;

            // Mapped ARKit names
            const mapped = a2fToARKit[bsName];
            if (mapped) {
              const targetNames = Array.isArray(mapped) ? mapped : [mapped];
              for (const targetName of targetNames) {
                if (dict[targetName] !== undefined) {
                  influences[dict[targetName]] = finalValue;
                }
              }
            }
          }

          // Force procedural blinking at the end to override A2F silent data
          if (dict["eyeBlinkLeft"] !== undefined) {
             let a2fBlinkL = currentBlendshapes["eyeBlink_L"] || 0;
             influences[dict["eyeBlinkLeft"]] = Math.max(blinkValue, a2fBlinkL);
          }
          if (dict["eyeBlinkRight"] !== undefined) {
             let a2fBlinkR = currentBlendshapes["eyeBlink_R"] || 0;
             influences[dict["eyeBlinkRight"]] = Math.max(blinkValue, a2fBlinkR);
          }
        }
      }
    });
  });

  return (
    <primitive object={scene} scale={1.5} position={[0, -1, 0]} />
  );
}

export default function A2FAvatar() {
  return (
    <div style={{ width: "100%", height: "100%", background: "#111" }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[2, 2, 2]} intensity={2} />
        <directionalLight position={[-2, -2, -2]} intensity={0.5} />
        <AvatarModel />
        <OrbitControls enableZoom={true} enablePan={true} />
      </Canvas>
    </div>
  );
}
