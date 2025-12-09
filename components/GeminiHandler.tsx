import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage } from '@google/genai';

interface GeminiHandlerProps {
  onGestureChange: (scale: number) => void;
  onConnectionChange: (connected: boolean) => void;
}

const GeminiHandler: React.FC<GeminiHandlerProps> = ({ onGestureChange, onConnectionChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  
  // Gemini Configuration
  const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

  const setHandStateTool: FunctionDeclaration = {
    name: 'setHandState',
    parameters: {
      type: Type.OBJECT,
      description: 'Sets the openness of the user\'s hands. 0.5 is closed/small, 2.0 is wide open/large. 1.0 is neutral.',
      properties: {
        scale: {
          type: Type.NUMBER,
          description: 'A multiplier for the particle system size. Range 0.5 to 2.5.',
        },
      },
      required: ['scale'],
    },
  };

  const initWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, frameRate: 15 },
        audio: false // We don't need audio input for this specific visual demo
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
    
    // We utilize the connect method directly as per guidelines
    const sessionPromise = ai.live.connect({
      model: MODEL_NAME,
      callbacks: {
        onopen: () => {
          console.log("Gemini Live Connected");
          onConnectionChange(true);
          startVideoStreaming(sessionPromise);
        },
        onmessage: (message: LiveServerMessage) => {
          // Handle Function Calls
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'setHandState') {
                const args = fc.args as any;
                // console.log("Gesture Detected:", args.scale);
                onGestureChange(args.scale);

                // Send response back
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
          You are a visual gesture controller. 
          Analyze the video stream of the user.
          Determine if their hands or arms are 'OPEN' (spread apart/big) or 'CLOSED' (hands together/small).
          
          If hands are spread wide, call setHandState with scale = 2.0.
          If hands are together or clenched, call setHandState with scale = 0.5.
          If hands are in a neutral position, call setHandState with scale = 1.0.
          
          Be responsive. React immediately to changes.
        `,
        tools: [{ functionDeclarations: [setHandStateTool] }],
      }
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Remove "data:image/jpeg;base64," prefix
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

    // Send a frame every 500ms (2 FPS) to balance latency and token usage/rate limits
    // Real-time interaction needs to be balanced against quota.
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
        }, 'image/jpeg', 0.5); // Low quality JPEG for speed
      }
    }, 500); 
  };

  const stopVideoStreaming = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  };

  useEffect(() => {
    initWebcam();
    connectToGemini(); // Auto connect on mount
    return () => {
      stopVideoStreaming();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-none opacity-80">
       {/* Hidden calculation canvas */}
       <canvas ref={canvasRef} className="hidden" />
       
       {/* Visual feedback of what camera sees */}
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

export default GeminiHandler;
