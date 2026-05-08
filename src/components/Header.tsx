import { Zap, Download, Loader2, Trash2 } from 'lucide-react';
import { ChangeEvent, RefObject } from 'react';
import { SequenceStep } from '../types';

interface HeaderProps {
  steps: SequenceStep[];
  setSteps: (steps: SequenceStep[]) => void;
  useOCR: boolean;
  setUseOCR: (use: boolean) => void;
  isExporting: boolean;
  exportProgress: string;
  isRecording: boolean;
  downloadZIP: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function Header({
  steps,
  setSteps,
  useOCR,
  setUseOCR,
  isExporting,
  exportProgress,
  isRecording,
  downloadZIP,
  fileInputRef,
  handleFileUpload
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center px-6 justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Zap className="text-white w-5 h-5 fill-current" />
        </div>
        <h1 className="font-semibold tracking-tight text-zinc-100">AI SOP Architect <span className="text-zinc-500 font-normal ml-2">v1.0</span></h1>
      </div>
      
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
          <input 
            type="checkbox" 
            checked={useOCR} 
            onChange={(e) => {
              if (e.target.checked) {
                const approved = window.confirm("WARNING: This feature extracts text from images for AI processing only. It will not improve the visual SOP output and may increase export time. Do you want to proceed?");
                if (approved) setUseOCR(true);
              } else {
                setUseOCR(false);
              }
            }} 
            className="w-3 h-3 accent-orange-500 rounded bg-zinc-800 border-zinc-700"
          />
          Extract Metadata (OCR)
        </label>
        <button 
          onClick={downloadZIP}
          disabled={steps.length === 0 || isExporting}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span>{isExporting ? exportProgress || "Exporting..." : "Export ZIP"}</span>
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept="video/mp4" 
          className="hidden" 
        />
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50">
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
          {isRecording ? 'RECORDING VOICE...' : 'IDLE'}
        </div>
        <button 
          onClick={() => setSteps([])}
          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
          title="Clear all"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </header>
  );
}
