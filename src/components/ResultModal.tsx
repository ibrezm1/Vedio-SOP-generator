import { FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResultModalProps {
  generatedSOP: string | null;
  setGeneratedSOP: (sop: string | null) => void;
  openPreProcessing: () => void;
}

export function ResultModal({ generatedSOP, setGeneratedSOP, openPreProcessing }: ResultModalProps) {
  return (
    <AnimatePresence>
      {generatedSOP && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-8"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                  <FileText className="text-orange-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Analysis Result</h2>
                  <p className="text-xs text-zinc-500">Mock SOP based on visual and audio context</p>
                </div>
              </div>
              <button 
                onClick={() => setGeneratedSOP(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-all"
              >
                Close Document
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-[#08090a]">
              <div className="max-w-2xl mx-auto prose prose-invert prose-orange">
                <div className="whitespace-pre-wrap font-sans leading-relaxed text-zinc-300">
                  {generatedSOP}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex flex-col items-center gap-3">
              <button 
                onClick={openPreProcessing}
                className="flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95"
              >
                <span>Review & Edit Images for Export</span>
              </button>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
                Full JSON payload logged to console for LLM consumption
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
