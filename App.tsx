import React, { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Particles from './components/Particles';
import UIControls from './components/UIControls';
import GeminiHandler from './components/GeminiHandler';
import { ShapeType } from './types';

const App: React.FC = () => {
  const [shape, setShape] = useState<ShapeType>(ShapeType.HEART);
  const [color, setColor] = useState<string>('#ff0066');
  const [gestureScale, setGestureScale] = useState<number>(1.0);
  const [isAiConnected, setIsAiConnected] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth out the scale updates slightly in React state, 
  // though the heavy lifting is in the 3D loop.
  const handleGestureChange = useCallback((newScale: number) => {
    // Clamp values
    const clamped = Math.min(Math.max(newScale, 0.5), 2.5);
    setGestureScale(prev => {
      // Simple easing towards target
      return prev + (clamped - prev) * 0.3;
    });
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-black overflow-hidden font-sans">
      
      {/* 3D Scene */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
          <color attach="background" args={['#050505']} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          
          <Particles 
            count={6000} 
            shape={shape} 
            color={color} 
            gestureScale={gestureScale} 
          />
          
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            autoRotate={true}
            autoRotateSpeed={0.5}
            maxDistance={50}
            minDistance={5}
          />
        </Canvas>
      </div>

      {/* AI Vision Handler (Invisible Logic + Camera Preview) */}
      <GeminiHandler 
        onGestureChange={handleGestureChange} 
        onConnectionChange={setIsAiConnected}
      />

      {/* UI Overlay */}
      <UIControls 
        currentShape={shape} 
        setShape={setShape}
        currentColor={color}
        setColor={setColor}
        isAiConnected={isAiConnected}
        onToggleFullscreen={handleToggleFullscreen}
      />
      
      {/* Overlay Gradient for cinematics */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent to-black/60" />
    </div>
  );
};

export default App;
