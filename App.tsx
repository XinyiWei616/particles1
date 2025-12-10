import React, { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Particles from './components/Particles';
import UIControls from './components/UIControls';
import GeminiHandler from './components/GeminiHandler';
import { ShapeType, GestureState } from './types';

const App: React.FC = () => {
  const [shape, setShape] = useState<ShapeType>(ShapeType.HEART);
  const [color, setColor] = useState<string>('#ff0066');
  const [gesture, setGesture] = useState<GestureState>({ openness: 0.5, x: 0, y: 0 });
  const [isAiConnected, setIsAiConnected] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleGestureChange = useCallback((newGesture: GestureState) => {
    // We update state. The visual smoothing happens inside Particles.tsx via lerping
    setGesture(newGesture);
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
        <Canvas camera={{ position: [0, 0, 25], fov: 60 }}>
          <color attach="background" args={['#050505']} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />

           <Particles 
            count={8000} 
            shape={shape} 
            color={color} 
            gesture={gesture} 
          />
          
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            autoRotate={false} /* Disabled auto rotate to make hand tracking clearer */
            maxDistance={50}
            minDistance={5}
          />
        </Canvas>
      </div>

      {/* AI Vision Handler */}
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
