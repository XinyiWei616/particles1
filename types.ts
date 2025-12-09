export enum ShapeType {
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  MANDALA = 'Mandala', // Buddha abstract representation
  FIREWORKS = 'Fireworks'
}

export interface AppState {
  shape: ShapeType;
  color: string;
  particleCount: number;
  gestureScale: number; // 0.5 to 2.0 controlled by AI
  isAiConnected: boolean;
}

export interface ParticleProps {
  count: number;
  shape: ShapeType;
  color: string;
  gestureScale: number;
}
