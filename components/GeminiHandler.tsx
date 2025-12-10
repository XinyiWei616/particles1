import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage } from '@google/genai';
import { GestureState } from '../types';

interface GeminiHandlerProps {
  onGestureChange: (gesture: GestureState) => void;
  onConnectionChange: (connected: boolean) => void;
}

const GeminiHandler: React.FC<GeminiHandlerProps> = ({ onGestureChange, onConnectionChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  
  // Gemini Configuration
  const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

  const updateHandGestureTool: FunctionDeclaration = {
    name: 'updateHandGesture',
    parameters: {
      type: Type.OBJECT,
      description: 'Updates the simulation based on user hand gestures.',
      properties: {
        openness: {
          type: Type.NUMBER,
          description: '0.0 represents closed fists/hands together. 1.0 represents open palms/hands spread wide.',
        },
        x: {
          type: Type.NUMBER,
          description: 'Horizontal position of the hands center from -1.0 (left) to 1.0 (right).',
        },
        y: {
          type: Type.NUMBER,
          description: 'Vertical position of the hands center from -1.0 (bottom) to 1.0 (top).',
        }
      },
      required: ['openness', 'x', 'y'],
    },
  };
  const initWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, frameRate: 15 },
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const connectToGemini = async () => {
    if (!process.env.API_KEY) {
      console.error("API_KEY not found in environment");
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const sessionPromise = ai.live.connect({
      model: MODEL_NAME,
      callbacks: {
        onopen: () => {
          console.log("Gemini Live Connected");
          onConnectionChange(true);
          startVideoStreaming(sessionPromise);
        },
        onmessage: (message: LiveServerMessage) => {
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'updateHandGesture') {
                const args = fc.args as any;
                // console.log("Gesture:", args);
                onGestureChange({
                  openness: args.openness ?? 0.5,
                  x: args.x ?? 0,
                  y: args.y ?? 0
                });

                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: "ok" }
                    }
                  });
                });
              }
            }
          }
        },
        onclose: () => {
          console.log("Gemini Live Closed");
          onConnectionChange(false);
          stopVideoStreaming();
        },
        onerror: (err) => {
          console.error("Gemini Live Error:", err);
          onConnectionChange(false);
        }
      },
      config: {
        systemInstruction: `
          You are a 3D Particle System Controller utilizing computer vision.
          Your goal is to control a particle cloud based on the user's hand movements in the video stream.

          1. **Position Tracking (x, y)**:
             - Identify the centroid (center point) of the user's active hand(s).
             - Map this position to a coordinate system:
               - x: -1.0 (Frame Left) to 1.0 (Frame Right).
               - y: -1.0 (Frame Bottom) to 1.0 (Frame Top).
             - If the user waves left, x should decrease. If they wave up, y should increase.
             
          2. **Openness Tracking (openness)**:
             - Detect if the hand is OPEN (fingers splayed, palm visible) or CLOSED (fist, or fingers pinched).
             - Map this to a value:
               - 0.0: Fully Closed / Fist / Compact.
               - 1.0: Fully Open / Spread / Expanded.
               - Use intermediate values (e.g., 0.5) for relaxed states.

          Be extremely responsive. If the hands move, update x/y immediately. If the hand opens/closes, update openness immediately.
        `,
        tools: [{ functionDeclarations: [updateHandGestureTool] }],
      }
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1]; 
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
     };

  const startVideoStreaming = (sessionPromise: Promise<any>) => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    // 3 FPS (330ms) for better responsiveness while maintaining stability
    frameIntervalRef.current = window.setInterval(async () => {
      if (video.readyState === 4 && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const base64Data = await blobToBase64(blob);
            sessionPromise.then(session => {
              session.sendRealtimeInput({
                media: {
                  mimeType: 'image/jpeg',
                  data: base64Data
                }
              });
            }).catch(e => console.error("Session send error", e));
          }
        }, 'image/jpeg', 0.5); 
      }
    }, 330); 
  };
const stopVideoStreaming = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  };

  useEffect(() => {
    initWebcam();
    connectToGemini();
    return () => {
      stopVideoStreaming();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-none opacity-80">
       <canvas ref={canvasRef} className="hidden" />
       
       <div className="relative rounded-lg overflow-hidden border-2 border-white/20 shadow-lg w-32 h-24 bg-black">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]" 
          />
          <div className="absolute top-1 right-1">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          </div>
       </div>
    </div>
  );
  };

export default GeminiHandler
