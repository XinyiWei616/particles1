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
      description: 'Updates the particle simulation based on user hand gestures detected in the video.',
      properties: {
        openness: {
          type: Type.NUMBER,
          description: '0.0 for closed fist/contracted hand. 1.0 for fully open palm/spread fingers.',
        },
        x: {
          type: Type.NUMBER,
          description: 'Horizontal position of the hand center. -1.0 is Left, 1.0 is Right.',
        },
        y: {
          type: Type.NUMBER,
          description: 'Vertical position of the hand center. -1.0 is Bottom, 1.0 is Top.',
        }
      },
      required: ['openness', 'x', 'y'],
    },
  };
  const initWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 320 }, 
          height: { ideal: 240 }, 
          frameRate: { ideal: 15 } 
        },
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
            fc.args as any;
                
                onGestureChange({
                  openness: typeof args.openness === 'number' ? args.openness : 0.5,
                  x: typeof args.x === 'number' ? args.x : 0,
                  y: typeof args.y === 'number' ? args.y : 0
                });

                // Acknowledge the tool call to keep the session healthy
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
          You are the Vision Engine for a real-time Interactive Particle System.
          
          TASK:
          Analyze the user's video feed to control 3D particles.
          You MUST call the \`updateHandGesture\` tool for every visual update.

          CONTROL LOGIC:
          1. **Position (X, Y)**: 
             - Detect the center of the user's hand(s).
             - Map horizontal position to X: -1.0 (Screen Left) to 1.0 (Screen Right).
             - Map vertical position to Y: -1.0 (Screen Bottom) to 1.0 (Screen Top).
             - Note: The webcam is mirrored. If the user moves physically left, it appears on the right of the frame. 
               Correct this so that moving the hand LEFT results in X < 0.

          2. **Openness**:
             - **Scattering (Open Hand)**: If the palm is open and fingers are spread, set \`openness\` to 1.0.
             - **Gathering (Closed Hand)**: If the hand is a fist or fingers are pinched together, set \`openness\` to 0.0.
             - Interpolate smoothly between 0.0 and 1.0 for relaxed hands.

           responsiveness:
          - Be extremely fast.
          - If the hand moves, update X/Y immediately.
          - If the hand opens/closes, update openness immediately.
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

    // Send frames at ~3-4 FPS to balance latency and rate limits
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
    }, 300); 
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
       {/* Hidden Canvas for processing */}
       <canvas ref={canvasRef} className="hidden" />
       
       {/* UI for Self-View */}
       <div className="relative rounded-lg overflow-hidden border-2 border-white/20 shadow-lg w-32 h-24 bg-black/80 backdrop-blur">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
             muted 
            className="w-full h-full object-cover transform scale-x-[-1]" 
          />
          <div className="absolute top-1 right-1 flex gap-1">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
          </div>
          <div className="absolute bottom-0 w-full text-[8px] text-center text-white/70 bg-black/50 py-0.5">
            Gesture Input
          </div>
       </div>
    </div>
  );
};

export default GeminiHandler;
