import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleProps } from '../types';
import { generateTargetPositions } from '../services/mathUtils';

const Particles: React.FC<ParticleProps> = ({ count, shape, color, gestureScale }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Buffers
  const currentPositions = useMemo(() => new Float32Array(count * 3), [count]);
  const targetPositions = useMemo(() => generateTargetPositions(count, shape), [count, shape]);
  
  // Initialize current positions to target on first load (prevent exploding from 0,0,0)
  useMemo(() => {
    for (let i = 0; i < count * 3; i++) {
      currentPositions[i] = targetPositions[i];
    }
  }, []);

  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uTime: { value: 0 },
  }), []);

  useEffect(() => {
    uniforms.uColor.value.set(color);
  }, [color, uniforms]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    uniforms.uTime.value = state.clock.elapsedTime;
    const geometry = pointsRef.current.geometry;
    const positionAttribute = geometry.attributes.position;

    // Lerp factor for smooth shape transition
    const lerpSpeed = 0.05;
    // Breathing/Pulse effect based on time
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 1. Move towards target shape
      const tx = targetPositions[i3];
      const ty = targetPositions[i3 + 1];
      const tz = targetPositions[i3 + 2];

      currentPositions[i3] += (tx - currentPositions[i3]) * lerpSpeed;
      currentPositions[i3 + 1] += (ty - currentPositions[i3 + 1]) * lerpSpeed;
      currentPositions[i3 + 2] += (tz - currentPositions[i3 + 2]) * lerpSpeed;

      // 2. Apply Gesture Scale & Pulse to the VISUAL position (not the logical position)
      // We write to the buffer attribute directly
      positionAttribute.setXYZ(
        i,
        currentPositions[i3] * gestureScale * pulse,
        currentPositions[i3 + 1] * gestureScale * pulse,
        currentPositions[i3 + 2] * gestureScale * pulse
      );
    }

    positionAttribute.needsUpdate = true;
    
    // Rotate the whole system slowly
    pointsRef.current.rotation.y += 0.002;
    pointsRef.current.rotation.z += 0.001;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={new Float32Array(count * 3)} // Placeholder, updated in useFrame
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
