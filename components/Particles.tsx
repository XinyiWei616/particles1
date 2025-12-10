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
  
  // Create random scatter vectors for the explosion effect (Open Hand)
  const scatterVectors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for(let i=0; i<count*3; i++) {
        // Normalized random vector
        arr[i] = (Math.random() - 0.5) * 2; 
    }
    return arr;
  }, [count]);

  // Internal state for smooth interpolation
  const smoothedGesture = useRef({ openness: 0.5, x: 0, y: 0 });

  // Initialize positions
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

    // 1. Smooth Gesture Input (Lerp)
    // A lower factor makes it smoother/sluggish, higher makes it snappier
    const lerpFactor = 0.1; 
    smoothedGesture.current.openness += (gesture.openness - smoothedGesture.current.openness) * lerpFactor;
    
    // Smooth position (X, Y)
    smoothedGesture.current.x += (gesture.x - smoothedGesture.current.x) * lerpFactor;
    smoothedGesture.current.y += (gesture.y - smoothedGesture.current.y) * lerpFactor;

    const geometry = pointsRef.current.geometry;
    const positionAttribute = geometry.attributes.position;
    
    // Physics Parameters
    const openVal = smoothedGesture.current.openness; // 0.0 (Closed) to 1.0 (Open)
    
    // World Translation based on Hand Position
    // Map -1..1 to world units (e.g. -15..15)
    const handX = smoothedGesture.current.x * 15;
    const handY = smoothedGesture.current.y * 10;

    // Scattering Physics
    // When Open (1.0): Particles should explode/scatter OUTWARDS from the shape.
    // When Closed (0.0): Particles should tightly converge to the shape `targetPositions`.
    
    const scatterMagnitude = openVal * 6.0; // How far they fly apart
    const shapeScale = 1.0 + (openVal * 1.5); // The base shape also grows
    
    // Morph speed for shape switching
    const morphSpeed = 0.08;
    
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
            // A. Update Logical Base Position (Morphing between shapes)
      const tx = targetPositions[i3];
      const ty = targetPositions[i3 + 1];
      const tz = targetPositions[i3 + 2];

      // Lerp current base position towards new shape target
      currentPositions[i3] += (tx - currentPositions[i3]) * morphSpeed;
      currentPositions[i3 + 1] += (ty - currentPositions[i3 + 1]) * morphSpeed;
      currentPositions[i3 + 2] += (tz - currentPositions[i3 + 2]) * morphSpeed;

      // B. Calculate Final Render Position
      // Formula: (BasePos * Scale) + (ScatterDirection * Magnitude) + HandOffset + Noise
      
      const baseX = currentPositions[i3];
      const baseY = currentPositions[i3 + 1];
      const baseZ = currentPositions[i3 + 2];

      // Scatter vector
      const sx = scatterVectors[i3];
      const sy = scatterVectors[i3 + 1];
      const sz = scatterVectors[i3 + 2];

      // Organic Noise (breathing effect)
      const noise = Math.sin(time * 2 + i) * (0.05 + openVal * 0.2);

      positionAttribute.setXYZ(
        i,
        (baseX * shapeScale) + (sx * scatterMagnitude) + handX + noise,
        (baseY * shapeScale) + (sy * scatterMagnitude) + handY + noise,
        (baseZ * shapeScale) + (sz * scatterMagnitude)
      );
    }

    positionAttribute.needsUpdate = true;
    
    // Rotate the whole system slightly for 3D depth perception
    pointsRef.current.rotation.y = time * 0.1;
    pointsRef.current.rotation.z = smoothedGesture.current.x * 0.2; // Tilt with movement
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
        size={0.12}
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
