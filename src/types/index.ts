export interface SequenceStep {
  id: string;
  type: 'visual' | 'voice' | 'text';
  timestamp: number;
  dataUrl?: string;
  text?: string;
}

export interface CropRegion {
  x: number;      // 0 to 1 relative to video content width
  y: number;      // 0 to 1 relative to video content height
  width: number;  // 0 to 1 relative to video content width
  height: number; // 0 to 1 relative to video content height
}
