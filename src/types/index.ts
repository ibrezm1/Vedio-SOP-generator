export interface SequenceStep {
  id: string;
  type: 'visual' | 'voice' | 'text';
  timestamp: number;
  dataUrl?: string;
  text?: string;
}
