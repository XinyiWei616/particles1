import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleProps } from '../types';
import { generateTargetPositions } from '../services/mathUtils';

const Particles: React.FC<ParticleProps> = ({ count, shape, color, gesture }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Buffers
  const currentPositions = useMemo(() => new Float32Array(count * 3), [count]);
  const targetPositions = useMemo(() => generateTargetPositions(count, shape), [count, shape]);
  
  // Internal state for smooth interpolation
  const smoothedGesture = useRef({ openness: 0.5, x: 0, y: 0 });

  // Initialize
  useMemo(() => {
    for (let i = 0; i < count * 3; i++) {
      currentPositions[i] = targetPositions[i];
    }
  }, []);

  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
  }), []);

  useEffect(() => {
    uniforms.uColor.value.set(color);
  }, [color, uniforms]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    // 1. Smooth the gesture inputs (Lerp)
    const lerpFactor = 0.1;
    smoothedGesture.current.openness += (gesture.openness - smoothedGesture.current.openness) * lerpFactor;
    
    // Invert X because webcam is mirrored usually (or user moves left, looks right on screen)
    // Actually, if we use standard mapping: -1 is left. 
     // Let's assume intuitive control: Move hand Left -> Particles Left.
    const targetX = gesture.x; 
    const targetY = gesture.y;
    
    smoothedGesture.current.x += (targetX - smoothedGesture.current.x) * lerpFactor;
    smoothedGesture.current.y += (targetY - smoothedGesture.current.y) * lerpFactor;

    const geometry = pointsRef.current.geometry;
    const positionAttribute = geometry.attributes.position;

    // 2. Physics Constants
    const baseScale = 0.2; // Minimum size (when closed)
    const expansionRange = 2.0; // How much it grows
    const currentScale = baseScale + (smoothedGesture.current.openness * expansionRange);
    
    // Map -1..1 to World Units (e.g., -10 to 10)
    const worldX = smoothedGesture.current.x * 12; 
    const worldY = smoothedGesture.current.y * 6;

    // Shape morph speed
    const morphSpeed = 0.05;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
    // A. Morph logical position towards selected shape
      const tx = targetPositions[i3];
      const ty = targetPositions[i3 + 1];
      const tz = targetPositions[i3 + 2];

      currentPositions[i3] += (tx - currentPositions[i3]) * morphSpeed;
      currentPositions[i3 + 1] += (ty - currentPositions[i3 + 1]) * morphSpeed;
      currentPositions[i3 + 2] += (tz - currentPositions[i3 + 2]) * morphSpeed;

      // B. Apply Scale (Openness) + Translation (Hand Position) + Noise
      // We calculate the final visual position here without modifying the base logic buffers too much
      
      // Add a little organic noise that increases when open
      const noiseAmp = smoothedGesture.current.openness * 0.2;
      const noiseX = Math.sin(time * 2 + i) * noiseAmp;
      const noiseY = Math.cos(time * 3 + i) * noiseAmp;
      const noiseZ = Math.sin(time * 4 + i) * noiseAmp;

      positionAttribute.setXYZ(
        i,
        (currentPositions[i3] * currentScale) + worldX + noiseX,
        (currentPositions[i3 + 1] * currentScale) + worldY + noiseY,
        (currentPositions[i3 + 2] * currentScale) + noiseZ
      );
    }

    positionAttribute.needsUpdate = true;
    
    // Slight overall rotation for style
    pointsRef.current.rotation.y = time * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={new Float32Array(count * 3)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};

export default Particles;
