import * as THREE from 'three';
import { ShapeType } from '../types';

export const generateTargetPositions = (count: number, shape: ShapeType): Float32Array => {
  const positions = new Float32Array(count * 3);
  const dummy = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    switch (shape) {
      case ShapeType.HEART: {
        // Parametric Heart
        const t = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.3) * 5; // Distribution
        // x = 16sin^3(t)
        // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
        // Add some random volume
        const xBase = 16 * Math.pow(Math.sin(t), 3);
        const yBase = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        
        dummy.set(
          xBase * 0.5 + (Math.random() - 0.5),
          yBase * 0.5 + (Math.random() - 0.5),
          (Math.random() - 0.5) * 4
        ).normalize().multiplyScalar(r);
        
        // Re-map to exact shape shell for cleaner look
        dummy.x = xBase * 0.3;
        dummy.y = yBase * 0.3;
        dummy.z = (Math.random() - 0.5) * 2;
        break;
      }

      case ShapeType.SATURN: {
        const rand = Math.random();
        if (rand < 0.3) {
          // Planet Sphere
          const r = 4;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          dummy.setFromSphericalCoords(r, phi, theta);
        } else {
          // Rings
          const angle = Math.random() * Math.PI * 2;
          const dist = 6 + Math.random() * 6;
          dummy.set(
            Math.cos(angle) * dist,
            (Math.random() - 0.5) * 0.5,
            Math.sin(angle) * dist
          );
          // Tilt rings
          dummy.applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.4);
        }
        break;
      }

      case ShapeType.FLOWER: {
        // Rose curve / Flower
        const theta = Math.random() * Math.PI * 2;
        const k = 4; // Petals
        const r = Math.cos(k * theta) * 8 + 2; 
        // 3D volume
        const z = (Math.random() - 0.5) * 2;
        dummy.set(
          r * Math.cos(theta),
          r * Math.sin(theta),
          z
        );
        break;
      }

      case ShapeType.MANDALA: {
        // Abstract geometric buddha/mandala vibes (Torus Knot-ish)
        const t = Math.random() * Math.PI * 2;
        const r = (Math.random() * 2 + 5); 
        const p = 2, q = 3;
        const tube = 1.5;
        // Torus knot equations
        const x = (r + tube * Math.cos(q * t)) * Math.cos(p * t);
        const y = (r + tube * Math.cos(q * t)) * Math.sin(p * t);
        const z = tube * Math.sin(q * t);
        
        dummy.set(x, y, z);
        break;
      }
      
      case ShapeType.FIREWORKS: {
        // Explosion sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * 15;
        dummy.setFromSphericalCoords(r, phi, theta);
        break;
      }

      default:
        dummy.set(0, 0, 0);
    }

    positions[i3] = dummy.x;
    positions[i3 + 1] = dummy.y;
    positions[i3 + 2] = dummy.z;
  }
  return positions;
};
