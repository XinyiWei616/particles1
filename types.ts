export enum ShapeType {
  HEART = 'Heart',
  FLOWER = 'Flower',
  SATURN = 'Saturn',
  MANDALA = 'Mandala', // Buddha abstract representation
  FIREWORKS = 'Fireworks'
}

export interface GestureState {
  openness: number; // 0.0 (closed) to 1.0 (open)
  x: number;        // -1.0 (left) to 1.0 (right)
  y: number;        // -1.0 (bottom) to 1.0 (top)
}

export interface AppState {
  shape: ShapeType;
  color: string;
  gesture: GestureState;
  isAiConnected: boolean;
}

export interface ParticleProps {
  count: number;
  shape: ShapeType;
  color: string;
  gesture: GestureState;
}
