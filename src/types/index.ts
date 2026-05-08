export interface SequenceStep {
  id: string;
  type: 'visual' | 'voice';
  timestamp: number;
  dataUrl?: string;
  text?: string;
}
